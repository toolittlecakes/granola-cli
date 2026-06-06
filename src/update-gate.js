import { CliError } from "./errors.js";

export const PACKAGE_NAME = "@toolittlecakes/granola-cli";
export const VERSION = "0.1.0";

function parseVersion(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return match.slice(1).map((part) => Number(part));
}

export function isNewerVersion(latest, current) {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) throw new CliError("VERSION_PARSE_FAILED", `Cannot compare versions ${latest} and ${current}`);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

export async function runUpdateGate({ skipUpdates = false, fetchImpl = fetch } = {}) {
  if (skipUpdates || process.env.GRANOLA_CLI_SKIP_UPDATE_CHECK === "1") return;
  let response;
  try {
    response = await fetchImpl(`https://registry.npmjs.org/${encodeURIComponent(PACKAGE_NAME)}/latest`, {
      headers: { Accept: "application/json" }
    });
  } catch (error) {
    throw new CliError(
      "UPDATE_CHECK_FAILED",
      `Could not check npm for ${PACKAGE_NAME}@latest`,
      `Run with --skip-updates for one command if you accept the risk. Original error: ${error.message}`
    );
  }
  if (!response.ok) {
    throw new CliError(
      "UPDATE_CHECK_FAILED",
      `Could not check npm for ${PACKAGE_NAME}@latest: HTTP ${response.status}`,
      "If this is a local or GitHub pre-release install, run with --skip-updates."
    );
  }
  const body = await response.json();
  const latest = body.version;
  if (isNewerVersion(latest, VERSION)) {
    throw new CliError(
      "STALE_VERSION",
      `${PACKAGE_NAME} is out of date: installed ${VERSION}, latest ${latest}`,
      `Update with: npm install -g ${PACKAGE_NAME}@latest\nBypass once with: granola-cli --skip-updates ...`
    );
  }
}
