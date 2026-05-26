import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const secretFiles = ["secrets/deepseek.env", "secrets/admin.env", "../../secrets/deepseek.env", "../../secrets/admin.env"];

function parseSecretFile(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }

  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .reduce<Record<string, string>>((values, line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        return values;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      values[key] = rawValue.replace(/^["']|["']$/g, "");
      return values;
    }, {});
}

export function getSecret(name: string): string | undefined {
  if (process.env[name] !== undefined) {
    return process.env[name];
  }

  for (const file of secretFiles) {
    const value = parseSecretFile(resolve(process.cwd(), file))[name];
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}
