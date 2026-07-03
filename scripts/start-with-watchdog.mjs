import http from "node:http";
import { spawn } from "node:child_process";

const port = Number(process.env.PORT || 3000);
const intervalMs = Number(process.env.WATCHDOG_INTERVAL_MS || 15000);
const timeoutMs = Number(process.env.WATCHDOG_TIMEOUT_MS || 5000);
const startupGraceMs = Number(process.env.WATCHDOG_STARTUP_GRACE_MS || 30000);
const maxFailures = Number(process.env.WATCHDOG_MAX_FAILURES || 3);

let stopping = false;
let failures = 0;

const child = spawn("npm", ["run", "start:next"], {
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code, signal) => {
  if (stopping) process.exit(code ?? 0);
  process.exit(code ?? (signal ? 1 : 0));
});

function stopChildAndExit() {
  if (stopping) return;
  stopping = true;
  child.kill("SIGTERM");
  setTimeout(() => {
    child.kill("SIGKILL");
    process.exit(1);
  }, 5000).unref();
}

function checkHealth() {
  const req = http.request(
    {
      host: "127.0.0.1",
      port,
      path: "/api/health",
      method: "GET",
      timeout: timeoutMs
    },
    (res) => {
      res.resume();
      if (res.statusCode === 200) {
        failures = 0;
        return;
      }
      failures += 1;
      console.error(`Health check failed with status ${res.statusCode}. Failure ${failures}/${maxFailures}`);
      if (failures >= maxFailures) stopChildAndExit();
    }
  );

  req.on("timeout", () => {
    req.destroy(new Error("Health check timed out"));
  });
  req.on("error", (error) => {
    failures += 1;
    console.error(`Health check error: ${error.message}. Failure ${failures}/${maxFailures}`);
    if (failures >= maxFailures) stopChildAndExit();
  });
  req.end();
}

setTimeout(() => {
  checkHealth();
  setInterval(checkHealth, intervalMs).unref();
}, startupGraceMs).unref();

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    stopping = true;
    child.kill(signal);
  });
}
