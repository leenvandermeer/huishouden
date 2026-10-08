"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { writeAuditLog } from "@/modules/finance/repository";
import { changeOwnPassword, createManagedUser, disableManagedUser, getTwoFactorStatus, requireOwner, requireUser, setupTwoFactor as setupTwoFactorService, enableTwoFactor as enableTwoFactorService, disableTwoFactor as disableTwoFactorService } from "./service";
import { generateTotpSecret, buildTotpUri, generateBackupCodes } from "./totp";

export async function changePassword(formData: FormData) {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  if (password.length < 12 || password !== passwordConfirm) {
    redirect("/beheer?toegang=wachtwoord-ongeldig");
  }

  const changed = await changeOwnPassword(user.id, currentPassword, password);
  if (!changed) redirect("/beheer?toegang=huidig-wachtwoord-onjuist");

  await writeAuditLog({ actorUserId: user.id, eventType: "user.password_changed", entityType: "user", entityId: user.id });
  revalidatePath("/beheer");
  redirect("/beheer?toegang=wachtwoord-gewijzigd");
}

export async function createUser(formData: FormData) {
  const actor = await requireOwner();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "readonly") as "owner" | "admin" | "readonly";
  if (!name || !email || password.length < 12 || !["owner", "admin", "readonly"].includes(role)) {
    redirect("/beheer?gebruikers=ongeldig");
  }

  const userId = await createManagedUser({ name, email, password, role });
  await writeAuditLog({ actorUserId: actor.id, eventType: "user.saved", entityType: "user", entityId: userId, details: { name, email, role } });
  revalidatePath("/beheer");
  redirect("/beheer?gebruikers=opgeslagen");
}

export async function disableUser(formData: FormData) {
  const actor = await requireOwner();
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === actor.id) redirect("/beheer?gebruikers=niet-toegestaan");

  const disabled = await disableManagedUser(userId, actor.id);
  await writeAuditLog({ actorUserId: actor.id, eventType: "user.disabled", entityType: "user", entityId: userId, details: { disabled } });
  revalidatePath("/beheer");
  redirect("/beheer?gebruikers=uitgeschakeld");
}

export async function setupTwoFactor(userId: string): Promise<{ secret: string; uri: string; qrDataUrl: string; backupCodes: string[] } | null> {
  const user = await requireUser();
  if (user.id !== userId) return null;
  const status = await getTwoFactorStatus(userId);
  if (status.enabled) return null;

  const secret = generateTotpSecret();
  const uri = buildTotpUri(secret, user.email);
  const backupCodes = generateBackupCodes();
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 200, margin: 2, color: { dark: "#17213b", light: "#ffffff" } });

  await setupTwoFactorService(userId, secret, backupCodes);
  await writeAuditLog({ actorUserId: user.id, eventType: "user.2fa_setup", entityType: "user", entityId: user.id });

  return { secret, uri, qrDataUrl, backupCodes };
}

export async function enableTwoFactor(userId: string, token: string): Promise<{ success: boolean } | null> {
  const user = await requireUser();
  if (user.id !== userId) return null;

  const enabled = await enableTwoFactorService(userId, token);
  if (!enabled) return null;

  await writeAuditLog({ actorUserId: user.id, eventType: "user.2fa_enabled", entityType: "user", entityId: user.id });
  revalidatePath("/beheer");
  revalidatePath("/instellingen/2fa");

  return { success: true };
}

export async function disableTwoFactor(userId: string): Promise<void> {
  const user = await requireUser();
  if (user.id !== userId) return;

  await disableTwoFactorService(userId);
  await writeAuditLog({ actorUserId: user.id, eventType: "user.2fa_disabled", entityType: "user", entityId: user.id });
  revalidatePath("/beheer");
  revalidatePath("/instellingen/2fa");
}
