/**
 * Configuration schema for Resin ecosystem
 * Defines the structure of resin-config.json
 */

export interface ResinConfig {
  /**
   * Environment name (development, staging, production)
   */
  environment: 'development' | 'staging' | 'production';

  /**
   * API Configuration
   */
  api: {
    /**
     * Base URL for Resin API endpoints
     * e.g., "https://noteresin.com" or "http://localhost:5173"
     */
    baseUrl: string;

    /**
     * API version to use (v1, v2, etc.)
     */
    version: string;

    /**
     * Timeout for API requests (milliseconds)
     */
    requestTimeout: number;

    /**
     * Retry configuration
     */
    retry: {
      maxAttempts: number;
      delayMs: number;
      backoffMultiplier: number;
    };
  };

  /**
   * Supabase Configuration
   */
  supabase: {
    /**
     * Supabase project URL
     */
    url: string;

    /**
     * Supabase anonymous key (safe to expose)
     */
    anonKey: string;

    /**
     * Real-time subscription settings
     */
    realtime: {
      enabled: boolean;
      channels: string[]; // Tables to subscribe to
    };
  };

  /**
   * Feature Flags
   * Control rollout of features across clients
   */
  features: {
    /**
     * Widget system (home screen widget on iOS, etc.)
     */
    widgetEnabled: boolean;
    widgetMinVersion: {
      ios: string;      // e.g., "1.2.0"
      web: string;
    };

    /**
     * Hardened mode (enhanced blocking/security)
     */
    hardenedModeEnabled: boolean;
    hardenedModeMinVersion: {
      ios: string;
      web: string;
    };

    /**
     * New gamification system (Week 2)
     */
    newGamificationEnabled: boolean;
    newGamificationMinVersion: {
      ios: string;
      web: string;
    };

    /**
     * Focus automation (recurring focus sessions)
     */
    focusAutomationEnabled: boolean;
    focusAutomationMinVersion: {
      ios: string;
      web: string;
      extension: string;
    };

    /**
     * Mind map connections
     */
    mindMapConnectionsEnabled: boolean;
    mindMapConnectionsMinVersion: {
      ios: string;
      web: string;
    };

    /**
     * Boards/collaboration feature
     */
    boardsEnabled: boolean;
    boardsMinVersion: {
      ios: string;
      web: string;
    };

    /**
     * Custom user-defined features
     */
    [key: string]: boolean | { [key: string]: string };
  };

  /**
   * Minimum required versions
   * Apps should warn/block users on outdated versions
   */
  minVersions: {
    ios: string;
    web: string;
    extension: string;
  };

  /**
   * Recommended versions (show update prompts)
   */
  recommendedVersions: {
    ios: string;
    web: string;
    extension: string;
  };

  /**
   * Analytics and monitoring
   */
  analytics: {
    enabled: boolean;
    provider: 'posthog' | 'mixpanel' | 'custom';
    sampleRate: number; // 0-1, fraction of requests to track
  };

  /**
   * Notifications (APNs)
   */
  notifications: {
    enabled: boolean;
    provider: 'supabase' | 'custom';
    timeoutMs: number;
  };

  /**
   * Rate limiting
   */
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };

  /**
   * Authentication
   */
  auth: {
    provider: 'supabase' | 'custom';
    sessionTimeout: number; // milliseconds
    refreshTokenExpiryDays: number;
  };

  /**
   * Build metadata
   */
  build: {
    /**
     * UTC timestamp when config was generated
     */
    timestamp: string;

    /**
     * Git commit hash that generated this config
     */
    commit?: string;

    /**
     * Config version for migrations
     */
    configVersion: string;
  };
}

/**
 * Helper to check if a feature is enabled for a specific app version
 */
export function isFeatureEnabled(
  featureName: string,
  config: ResinConfig,
  appVersion: string,
  appType: 'ios' | 'web' | 'extension'
): boolean {
  const feature = config.features[featureName];

  if (typeof feature === 'boolean') {
    return feature;
  }

  if (typeof feature === 'object' && feature !== null) {
    const minVersion = feature[appType];
    if (!minVersion) return false;

    return versionGreaterOrEqual(appVersion, minVersion);
  }

  return false;
}

/**
 * Helper to check version compatibility
 */
export function versionGreaterOrEqual(version: string, minimum: string): boolean {
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
 * Parse JSON config file
 */
export function parseConfig(jsonString: string): ResinConfig {
  try {
    const config = JSON.parse(jsonString) as ResinConfig;
    validateConfig(config);
    return config;
  } catch (error) {
    throw new Error(`Failed to parse config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate config has required fields
 */
export function validateConfig(config: ResinConfig): void {
  if (!config.environment) throw new Error('Missing: environment');
  if (!config.api?.baseUrl) throw new Error('Missing: api.baseUrl');
  if (!config.supabase?.url) throw new Error('Missing: supabase.url');
  if (!config.supabase?.anonKey) throw new Error('Missing: supabase.anonKey');
  if (!config.minVersions) throw new Error('Missing: minVersions');
  if (!config.build?.timestamp) throw new Error('Missing: build.timestamp');
}

export default {
  isFeatureEnabled,
  versionGreaterOrEqual,
  parseConfig,
  validateConfig
};
