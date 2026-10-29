import { redirect } from "next/navigation";
import { getTwoFactorStatus, requireUser } from "@/modules/auth/service";
import { PageHeader } from "@/components/ui";
import { TwoFactorSetup } from "@/components/auth/two-factor-setup";

export default async function TwoFactorPage() {
  const user = await requireUser();
  const status = await getTwoFactorStatus(user.id);

  return (
    <>
      <PageHeader
        eyebrow="Beveiliging"
        title="Extra beveiliging"
        description={status.enabled ? "Je inlogcode is actief. Je kunt hem opnieuw instellen of uitschakelen." : "Gebruik naast je wachtwoord ook een code uit een authenticator-app."}
      />

      <TwoFactorSetup userId={user.id} email={user.email} enabled={status.enabled} />
    </>
  );
}
