// Utility to get the correct base path for API fetches
export function getApiUrl(path: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const relPath = `${basePath}${path}`.replace(/\/\/+/, "/");
  // If running on the server, return absolute URL
  if (typeof window === 'undefined') {
    const site = process.env.NEXT_PUBLIC_SITE_ORIGIN || process.env.VERCEL_URL || `http://localhost:3000`;
    // Remove trailing slash from site if present
    const siteUrl = site.replace(/\/$/, "");
    return `${siteUrl}${relPath}`;
  }
  // On client, return relative path
  return relPath;
}