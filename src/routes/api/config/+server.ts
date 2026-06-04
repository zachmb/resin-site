/**
 * GET /api/config
 *
 * Serves the Resin configuration file to all clients (Web, iOS, Extension)
 *
 * Clients can cache this response with standard HTTP caching headers.
 * The config includes:
 * - API endpoints and versions
 * - Feature flags for gradual rollout
 * - Minimum required versions (blocks old app versions)
 * - Recommended versions (shows update prompts)
 * - Analytics and notification settings
 */

import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import type { ResinConfig } from '$lib/contracts';

// Cache config in memory to avoid reading file on every request
let cachedConfig: ResinConfig | null = null;

const DEFAULT_APP_URL = 'https://noteresin.com';
const DEFAULT_SUPABASE_URL = 'https://vqzaadhoccgtywewtkrm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_P_-T0hzfXzuzOsx9Ff8gMw_3SwUpdgm';

function createDefaultConfig(): ResinConfig {
  const baseUrl = process.env.PUBLIC_RESIN_APP_URL ?? process.env.RESIN_APP_URL ?? DEFAULT_APP_URL;
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY ?? DEFAULT_SUPABASE_ANON_KEY;
  const environment = (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production')
    ? 'production'
    : 'development';

  return {
    environment,
    api: {
      baseUrl,
      version: 'v1',
      requestTimeout: 30000,
      retry: { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 }
    },
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      realtime: {
        enabled: true,
        channels: ['blocking_sessions', 'profiles', 'user_custom_blocks', 'active_blocks']
      }
    },
    features: {
      widgetEnabled: true,
      widgetMinVersion: { ios: '1.2.0', web: '1.0.0' },
      hardenedModeEnabled: true,
      hardenedModeMinVersion: { ios: '1.1.0', web: '1.0.0' },
      newGamificationEnabled: true,
      newGamificationMinVersion: { ios: '2.0.0', web: '1.5.0' },
      focusAutomationEnabled: true,
      focusAutomationMinVersion: { ios: '1.5.0', web: '1.3.0', extension: '1.0.0' },
      mindMapConnectionsEnabled: true,
      mindMapConnectionsMinVersion: { ios: '1.6.0', web: '1.4.0' },
      boardsEnabled: false,
      boardsMinVersion: { ios: '2.1.0', web: '1.6.0' }
    },
    minVersions: { ios: '1.0.0', web: '1.0.0', extension: '1.0.0' },
    recommendedVersions: { ios: '2.0.0', web: '1.5.0', extension: '1.0.0' },
    analytics: { enabled: true, provider: 'custom', sampleRate: 1.0 },
    notifications: { enabled: true, provider: 'supabase', timeoutMs: 5000 },
    rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
    auth: { provider: 'supabase', sessionTimeout: 3600000, refreshTokenExpiryDays: 7 },
    build: {
      timestamp: process.env.VERCEL_GIT_COMMIT_SHA ? new Date().toISOString() : '2026-06-03T00:00:00.000Z',
      commit: process.env.VERCEL_GIT_COMMIT_SHA,
      configVersion: '1.0.0'
    }
  };
}

function mergeConfig(overrides: Partial<ResinConfig>): ResinConfig {
  const defaults = createDefaultConfig();

  return {
    ...defaults,
    ...overrides,
    api: { ...defaults.api, ...overrides.api },
    supabase: {
      ...defaults.supabase,
      ...overrides.supabase,
      realtime: { ...defaults.supabase.realtime, ...overrides.supabase?.realtime }
    },
    features: { ...defaults.features, ...overrides.features },
    minVersions: { ...defaults.minVersions, ...overrides.minVersions },
    recommendedVersions: { ...defaults.recommendedVersions, ...overrides.recommendedVersions },
    analytics: { ...defaults.analytics, ...overrides.analytics },
    notifications: { ...defaults.notifications, ...overrides.notifications },
    rateLimit: { ...defaults.rateLimit, ...overrides.rateLimit },
    auth: { ...defaults.auth, ...overrides.auth },
    build: { ...defaults.build, ...overrides.build }
  };
}

function loadConfig(): ResinConfig {
  if (cachedConfig) return cachedConfig;

  try {
    // Read from repo root resin-config.json (this project’s root)
    const configPath = path.resolve(process.cwd(), 'resin-config.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    cachedConfig = mergeConfig(JSON.parse(configData));
    return cachedConfig;
  } catch (error) {
    console.error('[/api/config] Failed to load resin-config.json:', error);
    cachedConfig = createDefaultConfig();
    return cachedConfig;
  }
}

export const GET = async (event: RequestEvent) => {
  try {
    const config = loadConfig();

    // Cache for 1 hour on the client side
    // Revalidate on the server every 5 minutes
    return json(config, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300'
      }
    });
  } catch (error) {
    console.error('[/api/config] Error:', error);
    return json(
      { error: 'Failed to load config' },
      { status: 500 }
    );
  }
};
