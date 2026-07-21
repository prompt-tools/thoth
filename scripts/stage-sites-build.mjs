import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

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

if (!existsSync(`${server}/index.js`) || !existsSync(`${server}/wrangler.json`) || !existsSync("dist/client/BUILD_ID")) {
  throw new Error("Sites build staging failed");
}
