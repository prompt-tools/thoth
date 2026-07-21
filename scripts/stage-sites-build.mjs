import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const server = "dist/server";

rmSync("dist", { force: true, recursive: true });
mkdirSync(server, { recursive: true });
cpSync(".open-next/assets", "dist/client", { recursive: true });
cpSync(".next/server/app/index.html", "dist/client/index.html");

const worker = `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Generation is not configured yet" }, { status: 503 });
    }

    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404 || url.pathname.includes(".")) return asset;

    url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  },
};
`;
writeFileSync(`${server}/index.js`, worker);

const wrangler = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
delete wrangler.$schema;
wrangler.main = "index.js";
wrangler.no_bundle = true;
wrangler.assets = { ...wrangler.assets, directory: "../client", run_worker_first: true };
writeFileSync(`${server}/wrangler.json`, JSON.stringify(wrangler));

if (!existsSync(`${server}/index.js`) || !existsSync("dist/client/index.html")) {
  throw new Error("Sites build staging failed");
}
