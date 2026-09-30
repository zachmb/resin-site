/**
 * Apple Push Notification Service (APNs) helper.
 * Uses the token-based authentication (ES256 JWT) via HTTP/2.
 *
 * Required env vars:
 *   APNS_KEY_ID       — 10-char Key ID from Apple Developer → Certificates, IDs & Profiles → Keys
 *   APNS_TEAM_ID      — 10-char Team ID from your Apple Developer account
 *   APNS_PRIVATE_KEY  — Full contents of the .p8 file (including -----BEGIN/END PRIVATE KEY-----)
 *   APNS_BUNDLE_ID    — App bundle ID, e.g. com.resin.app
 */

import { APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY, APNS_BUNDLE_ID } from '$env/static/private'

const APNS_HOST = 'https://api.push.apple.com'
const APNS_PUSH_TIMEOUT_MS = 8000
const APNS_MAX_ERROR_RESPONSE_BYTES = 2_000
const APNS_MAX_PAYLOAD_BYTES = 4_096
const APNS_DEVICE_TOKEN_RE = /^[a-f0-9]{64}$/i
const APNS_KNOWN_REASONS = new Set([
    'BadCollapseId',
    'BadDeviceToken',
    'BadExpirationDate',
    'BadMessageId',
    'BadPriority',
    'BadTopic',
    'DeviceTokenNotForTopic',
    'DuplicateHeaders',
    'IdleTimeout',
    'MissingDeviceToken',
    'MissingTopic',
    'PayloadEmpty',
    'TopicDisallowed',
    'BadCertificate',
    'BadCertificateEnvironment',
    'ExpiredProviderToken',
    'Forbidden',
    'InvalidProviderToken',
    'MissingProviderToken',
    'BadPath',
    'MethodNotAllowed',
    'Unregistered',
    'PayloadTooLarge',
    'TooManyProviderTokenUpdates',
    'TooManyRequests',
    'InternalServerError',
    'ServiceUnavailable',
    'Shutdown'
])

// ── JWT helpers ────────────────────────────────────────────────────────────────

/** Base64url encode (no padding). */
function b64url(buf: ArrayBuffer | Uint8Array): string {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
    let b64 = btoa(String.fromCharCode(...bytes))
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Create the APNs provider JWT. Valid for 60 minutes; we regenerate each call. */
async function makeJWT(): Promise<string> {
    const header = { alg: 'ES256', kid: APNS_KEY_ID }
    const payload = { iss: APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }

    const enc = new TextEncoder()
    const headerB64 = b64url(enc.encode(JSON.stringify(header)))
    const payloadB64 = b64url(enc.encode(JSON.stringify(payload)))
    const signingInput = `${headerB64}.${payloadB64}`

    // Import the PKCS8 private key
    const pemBody = APNS_PRIVATE_KEY
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\s+/g, '')
    const keyDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        keyDer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    )

    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        cryptoKey,
        enc.encode(signingInput)
    )

    return `${signingInput}.${b64url(signature)}`
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface APNsPayload {
    title: string
    body: string
    /** Custom data attached to the notification (accessible in the app). */
    data?: Record<string, unknown>
    /** 'alert' (default) or 'background' for silent pushes. */
    pushType?: 'alert' | 'background'
}

export interface APNsPushResult {
    success: boolean
    status: number
    reason?: string
}

const PERMANENT_TOKEN_FAILURES = new Set([
    'BadDeviceToken',
    'DeviceTokenNotForTopic',
    'Unregistered'
])

function parseAPNsReason(body: string): string {
    try {
        const parsed = JSON.parse(body) as { reason?: unknown }
        if (typeof parsed.reason === 'string' && APNS_KNOWN_REASONS.has(parsed.reason)) {
            return parsed.reason
        }
    } catch {
        // APNs should return JSON, but keep a safe fallback for proxies/dev.
    }
    return 'Unknown'
}

async function readBoundedTextResponse(response: Response, maxLength: number): Promise<string> {
    const contentLength = Number(response.headers.get('content-length') ?? 0)
    if (Number.isFinite(contentLength) && contentLength > maxLength) {
        return ''
    }

    const body = await response.text()
    return body.length <= maxLength ? body : ''
}

export function isPermanentAPNsTokenFailure(result: APNsPushResult): boolean {
    return !result.success && PERMANENT_TOKEN_FAILURES.has(result.reason || '')
}

/**
 * Send a push notification to a single APNs device token.
 * Returns true on success, false on failure.
 */
export async function sendPush(deviceToken: string, payload: APNsPayload): Promise<boolean> {
    const result = await sendPushWithResult(deviceToken, payload)
    return result.success
}

/**
 * Send a push notification and retain APNs status/reason for token cleanup.
 */
export async function sendPushWithResult(deviceToken: string, payload: APNsPayload): Promise<APNsPushResult> {
    const { title, body, data = {}, pushType = 'alert' } = payload

    if (!APNS_DEVICE_TOKEN_RE.test(deviceToken)) {
        console.warn('[APNs] Push skipped: invalid device token')
        return { success: false, status: 400, reason: 'BadDeviceToken' }
    }

    const apnsPayload = {
        aps: {
            alert: pushType === 'alert' ? { title, body } : undefined,
            sound: pushType === 'alert' ? 'default' : undefined,
            'content-available': pushType === 'background' ? 1 : undefined,
        },
        ...data,
    }
    const bodyJson = JSON.stringify(apnsPayload)
    if (new TextEncoder().encode(bodyJson).byteLength > APNS_MAX_PAYLOAD_BYTES) {
        console.warn('[APNs] Push skipped: payload too large')
        return { success: false, status: 400, reason: 'PayloadTooLarge' }
    }

    const jwt = await makeJWT()

    const url = `${APNS_HOST}/3/device/${deviceToken}`
    let response: Response
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                authorization: `bearer ${jwt}`,
                'apns-topic': APNS_BUNDLE_ID,
                'apns-push-type': pushType,
                'apns-priority': pushType === 'alert' ? '10' : '5',
                'content-type': 'application/json',
            },
            body: bodyJson,
            signal: AbortSignal.timeout(APNS_PUSH_TIMEOUT_MS),
        })
    } catch {
        console.error('[APNs] Push request failed')
        return { success: false, status: 0, reason: 'ServiceUnavailable' }
    }

    if (!response.ok) {
        const reason = parseAPNsReason(await readBoundedTextResponse(response, APNS_MAX_ERROR_RESPONSE_BYTES))
        console.error('[APNs] Push failed')
        return { success: false, status: response.status, reason }
    }

    console.log('[APNs] Push sent')
    return { success: true, status: response.status }
}
