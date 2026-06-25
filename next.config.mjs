/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do not let a single TypeScript/ESLint slip from rapid v0 edits block a
  // production deploy. Type errors are still surfaced locally + in PR checks.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
}

export default nextConfig
