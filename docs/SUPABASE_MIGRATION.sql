-- Resin Supabase schema alignment (web + iOS + Chrome extension)
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- 1) blocking_sessions
CREATE TABLE IF NOT EXISTS public.blocking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  device_scheduled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.blocking_sessions ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.blocking_sessions ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.blocking_sessions ADD COLUMN IF NOT EXISTS device_scheduled boolean DEFAULT false;
ALTER TABLE public.blocking_sessions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_blocking_sessions_user_id ON public.blocking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_blocking_sessions_active ON public.blocking_sessions(is_active, user_id);

ALTER TABLE public.blocking_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own blocking sessions" ON public.blocking_sessions;
CREATE POLICY "Users can view their own blocking sessions"
  ON public.blocking_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create blocking sessions" ON public.blocking_sessions;
CREATE POLICY "Users can create blocking sessions"
  ON public.blocking_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own blocking sessions" ON public.blocking_sessions;
CREATE POLICY "Users can update their own blocking sessions"
  ON public.blocking_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) profiles toggles used by web + extension
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS extension_enabled boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocking_enabled boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_domains text[] DEFAULT '{}'::text[];

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update their own profile extension status" ON public.profiles;
CREATE POLICY "Users can update their own profile extension status"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3) amber_sessions
CREATE TABLE IF NOT EXISTS public.amber_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  raw_text text,
  display_title text,
  description text,
  status text DEFAULT 'draft' CHECK (status IN ('draft','processing','scheduled','active','completed','canceled','failed')),
  intensity numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.amber_sessions ADD COLUMN IF NOT EXISTS raw_text text;
ALTER TABLE public.amber_sessions ADD COLUMN IF NOT EXISTS display_title text;
ALTER TABLE public.amber_sessions ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.amber_sessions ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE public.amber_sessions ADD COLUMN IF NOT EXISTS intensity numeric;
ALTER TABLE public.amber_sessions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_amber_sessions_user_id ON public.amber_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_amber_sessions_status ON public.amber_sessions(status);

ALTER TABLE public.amber_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own amber sessions" ON public.amber_sessions;
CREATE POLICY "Users can view their own amber sessions"
  ON public.amber_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create amber sessions" ON public.amber_sessions;
CREATE POLICY "Users can create amber sessions"
  ON public.amber_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own amber sessions" ON public.amber_sessions;
CREATE POLICY "Users can update their own amber sessions"
  ON public.amber_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4) amber_tasks
CREATE TABLE IF NOT EXISTS public.amber_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.amber_sessions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  estimated_minutes integer,
  sequence_order integer DEFAULT 1,
  start_time timestamptz,
  end_time timestamptz,
  calendar_event_id text,
  requires_focus boolean DEFAULT false,
  requires_camera_verification boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amber_tasks_session_id ON public.amber_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_amber_tasks_start_time ON public.amber_tasks(start_time);

ALTER TABLE public.amber_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tasks for their sessions" ON public.amber_tasks;
CREATE POLICY "Users can view tasks for their sessions"
  ON public.amber_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.amber_sessions s
      WHERE s.id = public.amber_tasks.session_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert tasks for their sessions" ON public.amber_tasks;
CREATE POLICY "Users can insert tasks for their sessions"
  ON public.amber_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.amber_sessions s
      WHERE s.id = public.amber_tasks.session_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update tasks for their sessions" ON public.amber_tasks;
CREATE POLICY "Users can update tasks for their sessions"
  ON public.amber_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.amber_sessions s
      WHERE s.id = public.amber_tasks.session_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.amber_sessions s
      WHERE s.id = public.amber_tasks.session_id
        AND s.user_id = auth.uid()
    )
  );

-- 5) updated_at function + triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_blocking_sessions_updated_at ON public.blocking_sessions;
CREATE TRIGGER update_blocking_sessions_updated_at
  BEFORE UPDATE ON public.blocking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_amber_sessions_updated_at ON public.amber_sessions;
CREATE TRIGGER update_amber_sessions_updated_at
  BEFORE UPDATE ON public.amber_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_amber_tasks_updated_at ON public.amber_tasks;
CREATE TRIGGER update_amber_tasks_updated_at
  BEFORE UPDATE ON public.amber_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6) grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocking_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amber_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amber_tasks TO authenticated;

