-- Store device push tokens for iOS push notifications
CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    device_type VARCHAR(50) NOT NULL, -- 'ios', 'android', 'web'
    device_name VARCHAR(255), -- e.g., "iPhone 14", "iPad Air"
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_device_type ON device_tokens(device_type);
CREATE INDEX idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = true;

-- Add comments
COMMENT ON TABLE device_tokens IS 'Push notification tokens for iOS and web devices';
COMMENT ON COLUMN device_tokens.user_id IS 'User who owns this device';
COMMENT ON COLUMN device_tokens.token IS 'Push notification token from APNs or FCM';
COMMENT ON COLUMN device_tokens.device_type IS 'Type of device: ios, android, or web';
