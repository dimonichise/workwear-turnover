import assert from "node:assert/strict";
import test from "node:test";
import { analyzeAudit } from "./audit-dependencies.mjs";

function fixture({
  dev = true,
  url = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
  severity = "high",
} = {}) {
  return [
    {
      vulnerabilities: {
        braces: {
          severity,
          nodes: ["node_modules/braces"],
          via: [{ url, severity }],
        },
        lint: { severity, nodes: ["node_modules/lint"], via: ["braces"] },
      },
    },
    {
      packages: {
        "node_modules/braces": { dev },
        "node_modules/lint": { dev },
      },
    },
  ];
}

test("allows only the documented dev-only advisory and its dependants", () => {
  assert.deepEqual(analyzeAudit(...fixture()), {
    blocked: [],
    exceptions: ["braces", "lint"],
  });
});
test("blocks the same advisory when shipped to production", () => {
  assert.deepEqual(analyzeAudit(...fixture({ dev: false })).blocked, [
    "braces",
    "lint",
  ]);
});
test("blocks new advisories and critical issues even in development tools", () => {
  assert.equal(
    analyzeAudit(...fixture({ url: "https://github.com/advisories/NEW" }))
      .blocked.length,
    2,
  );
  assert.equal(
    analyzeAudit(...fixture({ severity: "critical" })).blocked.length,
    2,
  );
});
test("does not allow missing lockfile metadata or an additional advisory", () => {
  const [report] = fixture();
  assert.equal(analyzeAudit(report, { packages: {} }).blocked.length, 2);
  report.vulnerabilities.braces.via.push({
    url: "https://github.com/advisories/NEW",
    severity: "high",
  });
  assert.equal(analyzeAudit(report, fixture()[1]).blocked.length, 2);
});
test("fails closed on incomplete or failed audits", () => {
  assert.throws(() => analyzeAudit({ error: {} }, { packages: {} }));
  assert.throws(() => analyzeAudit({ vulnerabilities: {} }, {}));
  assert.throws(() => analyzeAudit({ vulnerabilities: { invalid: {} } }, { packages: {} }));
  const [report, lock] = fixture();
  report.vulnerabilities.lint.severity = "critical";
  assert.deepEqual(analyzeAudit(report, lock).blocked, ["lint"]);
});
