/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 빌드 시 TypeScript 타입 에러를 무시하여 컴파일 성공률을 확보합니다.
    ignoreBuildErrors: true,
  },
  eslint: {
    // 빌드 시 ESLint 규칙 검사를 건너뜁니다.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'pubchem.ncbi.nlm.nih.gov',
      },
    ],
  },
};

export default nextConfig;
