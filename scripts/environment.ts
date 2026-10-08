import { existsSync } from "node:fs";

// CLI commands use the same private local configuration as the app.
if (process.env.NODE_ENV !== "production" && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`Stel ${name} in via je omgevingsconfiguratie.`);
  return value;
}
