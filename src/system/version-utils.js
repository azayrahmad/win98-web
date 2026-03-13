/**
 * Fetches the latest version from the server.
 * Uses cache-busting to ensure we always get the freshest version.
 */
export async function getLatestVersion() {
  try {
    const baseUrl = import.meta.env.BASE_URL || "/";
    // Normalize base URL to ensure it ends with / if it's not empty
    const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

    const response = await fetch(`${normalizedBaseUrl}version.json?t=${Date.now()}`, {
      cache: 'no-store'
    });

    if (!response.ok) throw new Error(`Failed to fetch version info: ${response.status}`);

    const data = await response.json();
    return data.version;
  } catch (error) {
    console.error("Failed to check for updates:", error);
    return null;
  }
}
