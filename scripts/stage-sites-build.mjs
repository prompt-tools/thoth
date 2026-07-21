import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

const source = ".open-next";
const server = "dist/server";

rmSync("dist", { force: true, recursive: true });
mkdirSync(server, { recursive: true });
cpSync(`${source}/worker.js`, `${server}/index.js`);
cpSync(`${source}/assets`, "dist/client", { recursive: true });

for (const directory of [".build", "cloudflare", "middleware", "server-functions"]) {
  cpSync(`${source}/${directory}`, `${server}/${directory}`, { recursive: true });
}

if (!existsSync(`${server}/index.js`) || !existsSync("dist/client/BUILD_ID")) {
  throw new Error("Sites build staging failed");
}
