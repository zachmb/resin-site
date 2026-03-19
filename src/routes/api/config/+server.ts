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

// Cache config in memory to avoid reading file on every request
let cachedConfig: any = null;

function loadConfig() {
  if (cachedConfig) return cachedConfig;

  try {
    // Read from repo root resin-config.json
    const configPath = path.resolve(process.cwd(), '../../resin-config.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(configData);
    return cachedConfig;
  } catch (error) {
    console.error('[/api/config] Failed to load resin-config.json:', error);
    // Fallback config if file not found (for development)
    return {
      environment: 'development',
      api: {
        baseUrl: 'http://localhost:5173',
        version: 'v1',
        requestTimeout: 30000,
        retry: { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 }
      },
      supabase: {
        url: 'https://yourproject.supabase.co',
        anonKey: 'your-anon-key-here',
        realtime: { enabled: true, channels: [] }
      },
      features: {
        widgetEnabled: true,
        widgetMinVersion: { ios: '1.0.0', web: '1.0.0' },
        hardenedModeEnabled: true,
        hardenedModeMinVersion: { ios: '1.0.0', web: '1.0.0' },
        newGamificationEnabled: true,
        newGamificationMinVersion: { ios: '1.0.0', web: '1.0.0' },
        focusAutomationEnabled: true,
        focusAutomationMinVersion: { ios: '1.0.0', web: '1.0.0', extension: '1.0.0' },
        mindMapConnectionsEnabled: true,
        mindMapConnectionsMinVersion: { ios: '1.0.0', web: '1.0.0' },
        boardsEnabled: false,
        boardsMinVersion: { ios: '1.0.0', web: '1.0.0' }
      },
      minVersions: { ios: '1.0.0', web: '1.0.0', extension: '1.0.0' },
      recommendedVersions: { ios: '2.0.0', web: '1.5.0', extension: '1.0.0' },
      analytics: { enabled: true, provider: 'posthog', sampleRate: 1.0 },
      notifications: { enabled: true, provider: 'supabase', timeoutMs: 5000 },
      rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
      auth: { provider: 'supabase', sessionTimeout: 3600000, refreshTokenExpiryDays: 7 },
      build: { timestamp: new Date().toISOString(), configVersion: '1.0.0' }
    };
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
