/** Form state for the public appointment form (kept out of the "use server" module). */
export interface AppointmentState {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}
