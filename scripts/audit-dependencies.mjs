import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const toolingAdvisory = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
const blockingSeverities = new Set(["high", "critical"]);

function causes(name, vulnerabilities, visited = new Set()) {
  if (visited.has(name)) return [];
  const vulnerability = vulnerabilities[name];
  if (!vulnerability)
    throw new Error(`Missing advisory information for ${name}`);
  const next = new Set(visited).add(name);
  return vulnerability.via.flatMap((entry) =>
    typeof entry === "string" ? causes(entry, vulnerabilities, next) : [entry],
  );
}

export function analyzeAudit(report, lock) {
  if (report.error || !report.vulnerabilities || !lock.packages) {
    throw new Error("Incomplete dependency audit; refusing to pass");
  }
  const blocked = [];
  const exceptions = [];
  for (const [name, vulnerability] of Object.entries(report.vulnerabilities)) {
    if (!Array.isArray(vulnerability.via) || !Array.isArray(vulnerability.nodes) ||
        !["info", "low", "moderate", "high", "critical"].includes(vulnerability.severity)) {
      throw new Error(`Incomplete advisory information for ${name}`);
    }
    if (!blockingSeverities.has(vulnerability.severity)) continue;
    const advisories = causes(name, report.vulnerabilities);
    const devOnly =
      vulnerability.nodes?.length > 0 &&
      vulnerability.nodes.every((node) => lock.packages[node]?.dev === true);
    // The sole exception is unfixed braces recursion in local-source lint/build tools.
    const toolingOnly =
      vulnerability.severity === "high" && devOnly &&
      advisories.some((entry) => entry.url === toolingAdvisory) &&
      advisories.every(
        (entry) =>
          !blockingSeverities.has(entry.severity) ||
          (entry.url === toolingAdvisory && entry.severity === "high"),
      );
    (toolingOnly ? exceptions : blocked).push(name);
  }
  return { blocked, exceptions };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const result = spawnSync("npm", ["audit", "--json"], { encoding: "utf8" });
    if (result.error || ![0, 1].includes(result.status)) {
      throw new Error("npm audit failed; refusing to pass");
    }
    const report = JSON.parse(result.stdout);
    const lock = JSON.parse(
      readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
    );
    const { blocked, exceptions } = analyzeAudit(report, lock);
    if (exceptions.length) {
      console.log(
        `Documented dev-only exception ${toolingAdvisory}: ${exceptions.join(", ")}`,
      );
    }
    if (blocked.length) {
      console.error(
        `Unapproved high/critical vulnerabilities: ${blocked.join(", ")}`,
      );
      process.exitCode = 1;
    } else {
      console.log(
        "Dependency audit passed; no unapproved high/critical vulnerabilities.",
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
