import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 디렉토리의 lockfile을 workspace root로 오인하지 않도록 이 프로젝트를 root로 명시
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
