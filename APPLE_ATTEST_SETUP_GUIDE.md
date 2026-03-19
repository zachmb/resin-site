# Apple App Attest Configuration Guide

## Overview
Set up App Attest credentials in Apple Developer Console, then add to Supabase environment variables.

---

## Part 1: Generate App Attest Key in Apple Developer Console

### Step 1: Navigate to Keys Section
1. Go to [Apple Developer Console](https://developer.apple.com/account)
2. Sign in with your Apple ID
3. Click **Certificates, Identifiers & Profiles**
4. On the left sidebar, click **Keys**

### Step 2: Create New App Attest Key
1. Click the **+** button (top right) to create a new key
2. Give it a name: `App Attest - Resin`
3. Under **Capabilities**, enable:
   - ☑ **App Attest**
4. Click **Continue**
5. Review the configuration
6. Click **Register**

### Step 3: Download the .p8 File
1. You should now see your new key in the list
2. Click on your newly created key
3. Click **Download** to download the `.p8` file
4. Save it to a secure location on your computer
5. **Important:** You can only download this file once. If you lose it, you'll need to create a new key.

---

## Part 2: Extract Values from the .p8 File

### Step 1: Open the .p8 File
1. Locate the `.p8` file you just downloaded
2. Open it with a text editor (TextEdit, VS Code, etc.)
3. You'll see something like:
   ```
   -----BEGIN PRIVATE KEY-----
   MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...
   -----END PRIVATE KEY-----
   ```

### Step 2: Find Your Key ID
1. Go back to Apple Developer Console → Keys
2. Find your `App Attest - Resin` key in the list
3. On the right side, you'll see the **Key ID** (10 characters, like `ABC123DEF4`)
4. **Copy this value** — you'll need it for Supabase

### Step 3: Get Your Team ID
1. In Apple Developer Console, click your profile icon (top right)
2. Click **Membership**
3. Look for **Team ID** (10 characters)
4. **Copy this value** — you'll need it for Supabase

---

## Part 3: Add to Supabase Environment Variables

### Step 1: Open Supabase Dashboard
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your Resin project
3. Click **Settings** (bottom left)
4. Click **Environment Variables**

### Step 2: Add Three Variables
Click **+ New Variable** for each of these:

#### Variable 1: APPLE_TEAM_ID
- **Name:** `APPLE_TEAM_ID`
- **Value:** Your 10-character Team ID (e.g., `ABC123DEF4`)
- Click **Add**

#### Variable 2: APPLE_KEY_ID
- **Name:** `APPLE_KEY_ID`
- **Value:** Your 10-character Key ID (e.g., `XYZ987UVW6`)
- Click **Add**

#### Variable 3: APPLE_PRIVATE_KEY
- **Name:** `APPLE_PRIVATE_KEY`
- **Value:** The **entire contents** of your `.p8` file, including:
  ```
  -----BEGIN PRIVATE KEY-----
  MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...
  ...
  -----END PRIVATE KEY-----
  ```
- Click **Add**

### Step 3: Verify Variables Are Set
1. You should now see three new environment variables listed
2. Status should show as **✓ Set**

---

## Part 4: Deploy the Updated Function

### Step 1: Deploy via Supabase CLI
Run this command in your terminal:

```bash
supabase functions deploy verify-attestation
```

### Step 2: Verify Deployment
1. Go to Supabase Dashboard → Functions
2. You should see `verify-attestation` in the list
3. Status should show as **Deployed**

---

## Part 5: Test the Integration

### Step 1: Request an Attestation Challenge
```bash
curl -X POST https://your-api.com/functions/v1/request-attestation-challenge \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "nonce": "a1b2c3d4e5f6...",
  "expires_in": 300
}
```

### Step 2: Run iOS App and Perform Attestation
1. Open the Resin iOS app
2. Trigger attestation flow (exact flow depends on implementation)
3. Check Supabase logs for: `✅ Signature verified by Apple`

### Step 3: Verify Keys Stored
1. Go to Supabase Dashboard → SQL Editor
2. Run this query:
   ```sql
   SELECT key_id, aaguid, environment, attested_at
   FROM attested_keys
   LIMIT 5;
   ```
3. You should see your verified keys with:
   - `aaguid: 'appattest'` (production) or `'appattestdevelop'` (sandbox)
   - `environment: 'prod'` or `'sandbox'`

---

## Troubleshooting

### Error: "APPLE_TEAM_ID not set"
- Verify the environment variable is set in Supabase Settings → Environment Variables
- Redeploy the function: `supabase functions deploy verify-attestation`

### Error: "Hardware attestation failed signature check"
- Check that the `APPLE_PRIVATE_KEY` value is the **entire .p8 file contents** including the header and footer lines
- Verify the Key ID is correct
- Re-download the .p8 file and try again (old keys may have expired)

### Error: "Nonce not found"
- The nonce expires after 5 minutes
- Request a fresh challenge before verifying

---

## Security Notes

⚠️ **Important:**
- Never commit the `.p8` file to version control
- Never share your `APPLE_PRIVATE_KEY` value
- The `.p8` file can only be downloaded once; store it securely
- If the key is compromised, create a new one in Apple Developer Console

✅ **Supabase handles the sensitive data:**
- Environment variables are encrypted at rest
- Only the server can access them (not visible to clients)
