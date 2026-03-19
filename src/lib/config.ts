/**
 * Configuration service for Resin Web
 *
 * Loads and caches the resin-config.json from /api/config
 * Provides typed access to configuration values
 */

import type { ResinConfig } from '@resin/contracts';

let cachedConfig: ResinConfig | null = null;
let configPromise: Promise<ResinConfig> | null = null;

export async function getConfig(): Promise<ResinConfig> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // Avoid multiple simultaneous requests
  if (configPromise) {
    return configPromise;
  }

  configPromise = (async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);
      }

      const config = (await response.json()) as ResinConfig;
      cachedConfig = config;
      return config;
    } catch (error) {
      console.error('[getConfig] Error loading configuration:', error);
      throw error;
    }
  })();

  return configPromise;
}

/**
 * Get the API base URL from config
 */
export async function getApiBaseUrl(): Promise<string> {
  const config = await getConfig();
  return config.api.baseUrl;
}

/**
 * Check if a feature is enabled for this client
 */
export async function isFeatureEnabled(
  featureName: string,
  appVersion: string,
  appType: 'ios' | 'web' | 'extension' = 'web'
): Promise<boolean> {
  const config = await getConfig();
  const feature = config.features[featureName as keyof typeof config.features];

  if (typeof feature === 'boolean') {
    return feature;
  }

  if (typeof feature === 'object' && feature !== null) {
    const minVersion = (feature as Record<string, string>)[appType];
    if (!minVersion) return false;
    return versionGreaterOrEqual(appVersion, minVersion);
  }

  return false;
}

/**
 * Check if app version is at least the minimum required
 */
export async function isVersionSupported(
  appVersion: string,
  appType: 'ios' | 'web' | 'extension' = 'web'
): Promise<boolean> {
  const config = await getConfig();
  const minVersion = config.minVersions[appType];
  return versionGreaterOrEqual(appVersion, minVersion);
}

/**
 * Check if app should show an update prompt
 */
export async function shouldShowUpdatePrompt(
  appVersion: string,
  appType: 'ios' | 'web' | 'extension' = 'web'
): Promise<boolean> {
  const config = await getConfig();
  const recommendedVersion = config.recommendedVersions[appType];
  return !versionGreaterOrEqual(appVersion, recommendedVersion);
}

/**
 * Semantic version comparison: v1 >= v2?
 */
function versionGreaterOrEqual(version: string, minimum: string): boolean {
  const parts = version.split('.').map(Number);
  const minParts = minimum.split('.').map(Number);

  for (let i = 0; i < Math.max(parts.length, minParts.length); i++) {
    const part = parts[i] || 0;
    const minPart = minParts[i] || 0;
    if (part > minPart) return true;
    if (part < minPart) return false;
  }
  return true;
}

/**
 * Clear cached config (useful for testing or manual refresh)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
  configPromise = null;
}
