import { execSync } from "child_process";

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_TIME: (() => {
      try {
        return execSync('git log -1 --format="%ci" HEAD', { encoding: 'utf-8' }).trim();
      } catch {
        return new Date().toISOString();
      }
    })(),
  },
};

export default nextConfig;
