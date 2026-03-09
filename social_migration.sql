-- Resin Social Collaboration Features
-- Adds: Friendships, Shared Notes, Joint Amber Plans

-- ===== FRIENDSHIPS TABLE =====
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

-- RLS for friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
CREATE POLICY "Users can view their friendships" ON friendships
FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can send friend requests" ON friendships;
CREATE POLICY "Users can send friend requests" ON friendships
FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Addressee can accept/decline requests" ON friendships;
CREATE POLICY "Addressee can accept/decline requests" ON friendships
FOR UPDATE USING (auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;
CREATE POLICY "Users can delete their friendships" ON friendships
FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ===== SHARED NOTES TABLE =====
CREATE TABLE IF NOT EXISTS shared_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES amber_sessions(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_with_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(note_id, shared_with_id)
);

-- RLS for shared_notes
ALTER TABLE shared_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shared notes" ON shared_notes;
CREATE POLICY "Users can view shared notes" ON shared_notes
FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

DROP POLICY IF EXISTS "Note owner can share their notes" ON shared_notes;
CREATE POLICY "Note owner can share their notes" ON shared_notes
FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Note owner can unshare their notes" ON shared_notes;
CREATE POLICY "Note owner can unshare their notes" ON shared_notes
FOR DELETE USING (auth.uid() = owner_id);

-- ===== JOINT AMBER PLANS TABLE =====
CREATE TABLE IF NOT EXISTS joint_amber_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  initiator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  collaborator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  raw_text TEXT NOT NULL,
  display_title TEXT,
  status TEXT CHECK (status IN ('pending','accepted','declined','processing','scheduled','completed','canceled','failed')) DEFAULT 'pending',
  initiator_session_id UUID REFERENCES amber_sessions(id) ON DELETE SET NULL,
  collaborator_session_id UUID REFERENCES amber_sessions(id) ON DELETE SET NULL,
  intensity INT DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for joint_amber_plans
ALTER TABLE joint_amber_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their joint plans" ON joint_amber_plans;
CREATE POLICY "Users can view their joint plans" ON joint_amber_plans
FOR SELECT USING (auth.uid() = initiator_id OR auth.uid() = collaborator_id);

DROP POLICY IF EXISTS "Initiator can create joint plans" ON joint_amber_plans;
CREATE POLICY "Initiator can create joint plans" ON joint_amber_plans
FOR INSERT WITH CHECK (auth.uid() = initiator_id);

DROP POLICY IF EXISTS "Both users can update joint plans" ON joint_amber_plans;
CREATE POLICY "Both users can update joint plans" ON joint_amber_plans
FOR UPDATE USING (auth.uid() = initiator_id OR auth.uid() = collaborator_id);

DROP POLICY IF EXISTS "Both users can delete joint plans" ON joint_amber_plans;
CREATE POLICY "Both users can delete joint plans" ON joint_amber_plans
FOR DELETE USING (auth.uid() = initiator_id OR auth.uid() = collaborator_id);

-- ===== UPDATE AMBER_SESSIONS RLS FOR SHARED NOTES =====
-- Allow users to update notes that are shared with them
DROP POLICY IF EXISTS "Users can update own sessions" ON amber_sessions;
CREATE POLICY "Users can update own or shared sessions" ON amber_sessions
FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM shared_notes WHERE note_id = id AND shared_with_id = auth.uid())
);

-- Also allow delete for shared notes
DROP POLICY IF EXISTS "Users can delete own sessions" ON amber_sessions;
CREATE POLICY "Users can delete own or shared sessions" ON amber_sessions
FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM shared_notes WHERE note_id = id AND shared_with_id = auth.uid())
);

-- ===== UPDATE PROFILES RLS FOR USER SEARCH =====
-- Allow authenticated users to search other users
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
CREATE POLICY "Users can read all profiles" ON profiles
FOR SELECT USING (auth.role() = 'authenticated');

-- ===== CREATE INDEXES FOR PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

CREATE INDEX IF NOT EXISTS idx_shared_notes_note_id ON shared_notes(note_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_owner_id ON shared_notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_shared_with_id ON shared_notes(shared_with_id);

CREATE INDEX IF NOT EXISTS idx_joint_plans_initiator ON joint_amber_plans(initiator_id);
CREATE INDEX IF NOT EXISTS idx_joint_plans_collaborator ON joint_amber_plans(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_joint_plans_status ON joint_amber_plans(status);
