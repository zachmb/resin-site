-- Friends Feature Migration
-- Run this in your Supabase SQL Editor to set up the friends system

-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique friendships (prevents duplicates)
  CONSTRAINT unique_friend_pair UNIQUE(LEAST(user_id_1, user_id_2), GREATEST(user_id_1, user_id_2))
);

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique requests (can't have duplicate pending requests)
  CONSTRAINT unique_request UNIQUE(from_user_id, to_user_id),

  -- Can't send friend request to yourself
  CONSTRAINT no_self_request CHECK(from_user_id != to_user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user ON friend_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from_user ON friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friends_user_id_1 ON friends(user_id_1);
CREATE INDEX IF NOT EXISTS idx_friends_user_id_2 ON friends(user_id_2);

-- Enable Row Level Security (RLS) on friends table
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see friendships they're part of
CREATE POLICY "Users can see their own friendships"
  ON friends
  FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- RLS Policy: Users can delete friendships they're part of
CREATE POLICY "Users can delete their own friendships"
  ON friends
  FOR DELETE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- RLS Policy: Anyone can create friendships (will be done via insert from backend)
CREATE POLICY "Anyone can create friendships"
  ON friends
  FOR INSERT
  WITH CHECK (true);

-- Enable RLS on friend_requests table
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their incoming requests
CREATE POLICY "Users can see incoming friend requests"
  ON friend_requests
  FOR SELECT
  USING (auth.uid() = to_user_id);

-- RLS Policy: Users can see their outgoing requests
CREATE POLICY "Users can see outgoing friend requests"
  ON friend_requests
  FOR SELECT
  USING (auth.uid() = from_user_id);

-- RLS Policy: Users can delete their own requests
CREATE POLICY "Users can delete their own requests"
  ON friend_requests
  FOR DELETE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- RLS Policy: Anyone can create requests (will be done via backend)
CREATE POLICY "Anyone can create friend requests"
  ON friend_requests
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, DELETE ON friends TO authenticated;
GRANT SELECT, DELETE, INSERT ON friend_requests TO authenticated;
