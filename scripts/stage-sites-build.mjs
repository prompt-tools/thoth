import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const source = ".open-next";
const server = "dist/server";

rmSync("dist", { force: true, recursive: true });
mkdirSync(server, { recursive: true });
cpSync(`${source}/worker.js`, `${server}/index.js`);
cpSync(`${source}/assets`, "dist/client", { recursive: true });

for (const directory of [".build", "cloudflare", "middleware", "server-functions"]) {
  cpSync(`${source}/${directory}`, `${server}/${directory}`, { recursive: true });
}

const wrangler = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
delete wrangler.$schema;
wrangler.main = "index.js";
wrangler.assets = { ...wrangler.assets, directory: "../client", run_worker_first: true };
writeFileSync(`${server}/wrangler.json`, JSON.stringify(wrangler));

const bundleDirectory = mkdtempSync(join(tmpdir(), "thoth-sites-worker-"));
try {
  execFileSync(
    process.execPath,
    ["node_modules/wrangler/bin/wrangler.js", "deploy", "--config", `${server}/wrangler.json`, "--dry-run", "--outdir", bundleDirectory],
    { env: { ...process.env, WRANGLER_LOG_PATH: join(bundleDirectory, "wrangler.log") }, stdio: "inherit" },
  );

  rmSync(server, { force: true, recursive: true });
  mkdirSync(server, { recursive: true });
  cpSync(`${bundleDirectory}/index.js`, `${server}/index.js`);
  wrangler.no_bundle = true;
  writeFileSync(`${server}/wrangler.json`, JSON.stringify(wrangler));
} finally {
  rmSync(bundleDirectory, { force: true, recursive: true });
}

if (!existsSync(`${server}/index.js`) || !existsSync(`${server}/wrangler.json`) || !existsSync("dist/client/BUILD_ID")) {
  throw new Error("Sites build staging failed");
}
