/**
 * YouTube URL parsing + embed helpers.
 *
 * Everything here works without an API key: titles and thumbnails come from
 * YouTube's public oEmbed endpoint, and playlists are shown with the native
 * playlist player rather than being expanded into individual rows.
 */

export type VideoKind = "video" | "playlist";

export interface ParsedYouTube {
  kind: VideoKind;
  key: string;
  /** Normalised canonical URL for the parsed id. */
  url: string;
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID = /^[A-Za-z0-9_-]{12,64}$/;

/**
 * Accepts any of: watch?v=, youtu.be/, /embed/, /shorts/, /live/, /playlist?list=,
 * or a bare id. `prefer` decides the winner when a URL carries both `v` and `list`.
 */
export function parseYouTube(input: string, prefer: VideoKind | "auto" = "auto"): ParsedYouTube | null {
  const raw = input.trim();
  if (!raw) return null;

  // Bare ids, pasted without a URL.
  if (VIDEO_ID.test(raw) && prefer !== "playlist") return asVideo(raw);
  if (/^(PL|UU|OL|RD|LL|FL)[A-Za-z0-9_-]+$/.test(raw) && prefer !== "video") return asPlaylist(raw);

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\./, "").toLowerCase();
  if (host !== "youtube.com" && host !== "youtu.be" && host !== "youtube-nocookie.com") return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const listParam = url.searchParams.get("list");
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = segments[0] ?? null;
  } else if (segments[0] === "watch") {
    videoId = url.searchParams.get("v");
  } else if (segments[0] === "embed" || segments[0] === "shorts" || segments[0] === "live" || segments[0] === "v") {
    videoId = segments[1] ?? null;
    // /embed/videoseries?list=PL... is a playlist embed, not a video.
    if (videoId === "videoseries") videoId = null;
  }

  const wantsPlaylist =
    prefer === "playlist" ||
    (prefer === "auto" && !!listParam && (segments[0] === "playlist" || !videoId));

  if (wantsPlaylist && listParam && PLAYLIST_ID.test(listParam)) return asPlaylist(listParam);
  if (prefer !== "playlist" && videoId && VIDEO_ID.test(videoId)) return asVideo(videoId);
  if (listParam && PLAYLIST_ID.test(listParam)) return asPlaylist(listParam);

  return null;
}

function asVideo(key: string): ParsedYouTube {
  return { kind: "video", key, url: `https://www.youtube.com/watch?v=${key}` };
}

function asPlaylist(key: string): ParsedYouTube {
  return { kind: "playlist", key, url: `https://www.youtube.com/playlist?list=${key}` };
}

/** Privacy-enhanced embed src for the player iframe. */
export function embedUrl(kind: VideoKind, key: string, autoplay = false): string {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });
  if (autoplay) params.set("autoplay", "1");
  if (kind === "playlist") {
    params.set("list", key);
    return `https://www.youtube-nocookie.com/embed/videoseries?${params}`;
  }
  return `https://www.youtube-nocookie.com/embed/${key}?${params}`;
}

export function watchUrl(kind: VideoKind, key: string): string {
  return kind === "playlist"
    ? `https://www.youtube.com/playlist?list=${key}`
    : `https://www.youtube.com/watch?v=${key}`;
}

/** Static thumbnail for a video id. Playlists have none, so they fall back to oEmbed. */
export function thumbnailUrl(key: string, quality: "hq" | "maxres" = "hq"): string {
  return `https://i.ytimg.com/vi/${key}/${quality === "maxres" ? "maxresdefault" : "hqdefault"}.jpg`;
}

export interface OEmbedInfo {
  title: string | null;
  thumbnail: string | null;
}

/**
 * Fetches the title (and thumbnail for playlists) from YouTube's oEmbed endpoint.
 * Never throws - the caller falls back to the id when metadata is unavailable.
 */
export async function fetchOEmbed(kind: VideoKind, key: string): Promise<OEmbedInfo> {
  const target = watchUrl(kind, key);
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`,
      { signal: AbortSignal.timeout(6000), cache: "no-store" },
    );
    if (!res.ok) return { title: null, thumbnail: null };
    const data = (await res.json()) as { title?: string; thumbnail_url?: string };
    return {
      title: data.title?.slice(0, 255) ?? null,
      thumbnail: data.thumbnail_url?.slice(0, 500) ?? null,
    };
  } catch {
    return { title: null, thumbnail: null };
  }
}
