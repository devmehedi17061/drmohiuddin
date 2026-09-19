import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/AdminShell";
import { ProfileForm } from "@/components/admin/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader
        title="My Profile"
        description="Change your own login details here. To change someone else's password, go to User Management."
      />
      <ProfileForm name={user.name} email={user.email} />
    </>
  );
}
