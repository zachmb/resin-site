-- Add free tier support to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'free'; -- free or premium
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_until TIMESTAMP WITH TIME ZONE;

-- Create referral history table
CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reward_applied BOOLEAN DEFAULT false,
    reward_type VARCHAR(50), -- free_month, week_trial, etc
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(referrer_id, referred_user_id)
);

-- Create indexes
CREATE INDEX idx_profiles_account_type ON profiles(account_type);
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX idx_referral_rewards_referred_user ON referral_rewards(referred_user_id);

-- Add comments
COMMENT ON COLUMN profiles.account_type IS 'free or premium';
COMMENT ON COLUMN profiles.referral_code IS 'Unique code for sharing (e.g., RESIN_ABC123)';
COMMENT ON COLUMN profiles.referred_by IS 'Who referred this user';
COMMENT ON COLUMN profiles.referral_count IS 'Number of successful referrals';
COMMENT ON COLUMN profiles.premium_until IS 'When premium access expires';
