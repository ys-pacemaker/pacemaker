// /** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/pacemaker', // Github 저장소 이름이 pacemaker일 경우 주석을 해제하세요
  env: {
    NEXT_PUBLIC_BASE_PATH: '/pacemaker',
  },
};

export default nextConfig;
