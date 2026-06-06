import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const repoName = "controllable-image-prompt-guide";
const isGithubPages = process.env.GITHUB_PAGES === "1";

const githubPagesConfig: NextConfig = {
  output: "export",
  basePath: `/${repoName}`,
  assetPrefix: `/${repoName}`,
  images: { unoptimized: true }
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Avoid picking ~/package-lock.json as monorepo root (breaks chunk paths in dev).
  outputFileTracingRoot: projectRoot,
  ...(isGithubPages ? githubPagesConfig : {})
};

export default nextConfig;
