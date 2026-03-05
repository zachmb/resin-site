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

/**
 * Send a push notification to a single APNs device token.
 * Returns true on success, false on failure.
 */
export async function sendPush(deviceToken: string, payload: APNsPayload): Promise<boolean> {
    const { title, body, data = {}, pushType = 'alert' } = payload

    const apnsPayload = {
        aps: {
            alert: pushType === 'alert' ? { title, body } : undefined,
            sound: pushType === 'alert' ? 'default' : undefined,
            'content-available': pushType === 'background' ? 1 : undefined,
        },
        ...data,
    }

    const jwt = await makeJWT()

    const url = `${APNS_HOST}/3/device/${deviceToken}`
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            authorization: `bearer ${jwt}`,
            'apns-topic': APNS_BUNDLE_ID,
            'apns-push-type': pushType,
            'apns-priority': pushType === 'alert' ? '10' : '5',
            'content-type': 'application/json',
        },
        body: JSON.stringify(apnsPayload),
    })

    if (!response.ok) {
        const reason = await response.text()
        console.error(`[APNs] Push failed (${response.status}):`, reason)
        return false
    }

    console.log(`[APNs] Push sent to ...${deviceToken.slice(-8)}`)
    return true
}
