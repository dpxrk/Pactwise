-- Migration 121: Collaborative Editing System
-- Real-time collaborative document editing using CRDT (Yjs) persistence
-- Provides: Sessions, operations log, cursor positions, change tracking

-- ============================================
-- 1. COLLABORATIVE EDITING SESSIONS
-- ============================================

CREATE TABLE collaborative_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Document Reference
  document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  redline_session_id UUID REFERENCES redline_sessions(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,

  -- Session Identity
  session_name TEXT,
  session_type TEXT NOT NULL DEFAULT 'edit' CHECK (session_type IN (
    'edit',      -- Normal collaborative editing
    'review',    -- Review/comment only
    'redline',   -- Redline/track changes
    'readonly'   -- View only with presence
  )),

  -- Yjs State (CRDT)
  yjs_state BYTEA,  -- Serialized Yjs document state
  yjs_state_vector BYTEA,  -- For incremental sync
  yjs_client_ids BIGINT[] DEFAULT '{}',  -- Track client IDs

  -- Document Content (for initial load)
  initial_content TEXT,
  initial_content_type TEXT DEFAULT 'html' CHECK (initial_content_type IN (
    'html', 'markdown', 'prosemirror', 'plain'
  )),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'pending', 'active', 'paused', 'completed', 'archived'
  )),

  -- Participants
  max_participants INTEGER DEFAULT 20,
  allow_external_participants BOOLEAN DEFAULT false,
  active_user_ids UUID[] DEFAULT '{}',
  external_participant_emails TEXT[] DEFAULT '{}',

  -- Settings
  settings JSONB DEFAULT '{
    "track_changes": true,
    "auto_save_interval_ms": 5000,
    "snapshot_interval_ms": 60000,
    "enable_comments": true,
    "enable_suggestions": true,
    "enable_chat": false
  }',

  -- Version Tracking
  version_number INTEGER DEFAULT 1,
  last_snapshot_at TIMESTAMPTZ,
  operation_count INTEGER DEFAULT 0,

  -- Ownership
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  lock_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

COMMENT ON TABLE collaborative_sessions IS 'Real-time collaborative editing sessions with Yjs CRDT';
COMMENT ON COLUMN collaborative_sessions.yjs_state IS 'Serialized Yjs Y.Doc state';
COMMENT ON COLUMN collaborative_sessions.yjs_state_vector IS 'Yjs state vector for incremental sync';

-- ============================================
-- 2. DOCUMENT OPERATIONS LOG
-- ============================================

CREATE TABLE document_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,

  -- Operation Data (Yjs update)
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'update',      -- Yjs update (insert, delete, format)
    'awareness',   -- Cursor/selection update
    'undo',        -- Undo operation
    'redo',        -- Redo operation
    'snapshot',    -- Full state snapshot
    'merge'        -- Merge from external source
  )),
  operation_data BYTEA NOT NULL,  -- Yjs update binary or JSON
  operation_size INTEGER NOT NULL,

  -- Attribution
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  external_party_email TEXT,
  client_id TEXT NOT NULL,

  -- Vector Clock (for ordering)
  clock INTEGER NOT NULL,
  origin TEXT,  -- Origin identifier for the update

  -- Change Details (for human-readable logging)
  change_summary TEXT,
  affected_range JSONB,  -- {start: number, end: number}

  -- Batching
  batch_id UUID,  -- Group related operations
  batch_sequence INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE document_operations IS 'Immutable log of all document operations for replay and persistence';
COMMENT ON COLUMN document_operations.operation_data IS 'Yjs update binary for replay';
COMMENT ON COLUMN document_operations.clock IS 'Logical clock for operation ordering';

-- ============================================
-- 3. EDITING PRESENCE & CURSORS
-- ============================================

CREATE TABLE editing_cursors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,

  -- User Identity
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  external_party_email TEXT,
  client_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar_url TEXT,

  -- Visual Identity
  color TEXT NOT NULL,  -- Assigned cursor color (hex)
  cursor_style TEXT DEFAULT 'caret' CHECK (cursor_style IN ('caret', 'block', 'underline')),

  -- Cursor Position (ProseMirror format)
  anchor INTEGER,  -- Selection anchor position
  head INTEGER,    -- Selection head position (cursor)
  focus_path TEXT,  -- JSON path to focused element

  -- Selection (if any)
  selection_type TEXT DEFAULT 'cursor' CHECK (selection_type IN (
    'cursor', 'text', 'node', 'all'
  )),
  selected_node_ids TEXT[],

  -- Presence State
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'idle', 'away', 'offline'
  )),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  idle_since TIMESTAMPTZ,

  -- Activity Context
  current_action TEXT,  -- 'typing', 'selecting', 'scrolling', 'commenting'
  viewport_start INTEGER,
  viewport_end INTEGER,

  -- Session Info
  session_start TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT cursor_has_user CHECK (user_id IS NOT NULL OR external_party_email IS NOT NULL),
  UNIQUE(session_id, client_id)
);

COMMENT ON TABLE editing_cursors IS 'Real-time cursor positions and presence for collaborative editing';
COMMENT ON COLUMN editing_cursors.anchor IS 'ProseMirror selection anchor (start of selection)';
COMMENT ON COLUMN editing_cursors.head IS 'ProseMirror selection head (cursor position)';

-- ============================================
-- 4. TRACK CHANGES / SUGGESTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS collaborative_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,

  -- Suggestion Type
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
    'insert', 'delete', 'replace', 'format', 'move'
  )),

  -- Position
  start_position INTEGER NOT NULL,
  end_position INTEGER,
  original_content TEXT,
  suggested_content TEXT,

  -- For formatting changes
  format_changes JSONB,  -- {bold: true, italic: false, ...}

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'rejected', 'modified'
  )),

  -- Attribution
  suggested_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  suggested_by_external TEXT,
  resolved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,

  -- Discussion
  comment_thread_id UUID,
  comment_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE collaborative_suggestions IS 'Track changes and suggestions in collaborative editing';

-- ============================================
-- 5. INLINE COMMENTS
-- ============================================

CREATE TABLE inline_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,

  -- Thread
  thread_id UUID,  -- NULL = new thread
  parent_comment_id UUID REFERENCES inline_comments(id) ON DELETE CASCADE,
  is_resolved BOOLEAN DEFAULT false,

  -- Position (anchored to text)
  anchor_start INTEGER NOT NULL,
  anchor_end INTEGER NOT NULL,
  anchor_text TEXT,  -- Snapshot of anchored text

  -- Content
  comment_text TEXT NOT NULL,
  formatted_text TEXT,  -- HTML or markdown

  -- Attribution
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_external_email TEXT,
  author_name TEXT NOT NULL,

  -- Related Suggestion
  suggestion_id UUID REFERENCES collaborative_suggestions(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'resolved', 'deleted'
  )),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,

  -- Metadata
  mentions TEXT[],  -- @mentioned users
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inline_comments IS 'Inline comments anchored to document positions';

-- ============================================
-- 6. SESSION SNAPSHOTS (Periodic backups)
-- ============================================

CREATE TABLE session_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,

  -- Snapshot Data
  yjs_state BYTEA NOT NULL,
  yjs_state_vector BYTEA NOT NULL,
  document_html TEXT,  -- Rendered HTML for quick preview

  -- Versioning
  version_number INTEGER NOT NULL,
  operation_count INTEGER NOT NULL,  -- Operations since session start
  last_operation_id UUID REFERENCES document_operations(id) ON DELETE SET NULL,

  -- Trigger
  snapshot_type TEXT NOT NULL DEFAULT 'auto' CHECK (snapshot_type IN (
    'auto',      -- Automatic periodic snapshot
    'manual',    -- User requested
    'milestone', -- Named version
    'recovery'   -- After crash/disconnect
  )),
  snapshot_name TEXT,

  -- Statistics
  content_size INTEGER,
  participant_count INTEGER,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE session_snapshots IS 'Periodic snapshots for recovery and version history';

-- ============================================
-- 7. PRESENCE HISTORY (For analytics)
-- ============================================

CREATE TABLE presence_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,

  -- Who
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  external_party_email TEXT,
  client_id TEXT NOT NULL,

  -- Event
  event_type TEXT NOT NULL CHECK (event_type IN (
    'join', 'leave', 'idle', 'active', 'focus', 'blur'
  )),

  -- Session
  duration_ms INTEGER,
  characters_typed INTEGER,
  operations_made INTEGER,

  -- Context
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE presence_history IS 'Historical presence data for analytics';

-- ============================================
-- 8. CURSOR COLOR ASSIGNMENTS
-- ============================================

-- Pre-defined cursor colors for consistency
CREATE TABLE cursor_color_palette (
  id SERIAL PRIMARY KEY,
  color_hex TEXT NOT NULL UNIQUE,
  color_name TEXT NOT NULL,
  text_color_hex TEXT NOT NULL DEFAULT '#FFFFFF',  -- For contrast
  sort_order INTEGER NOT NULL
);

-- Insert default colors
INSERT INTO cursor_color_palette (color_hex, color_name, text_color_hex, sort_order) VALUES
  ('#291528', 'Purple', '#FFFFFF', 1),
  ('#9e829c', 'Pink', '#000000', 2),
  ('#3B82F6', 'Blue', '#FFFFFF', 3),
  ('#10B981', 'Green', '#FFFFFF', 4),
  ('#F59E0B', 'Orange', '#000000', 5),
  ('#EF4444', 'Red', '#FFFFFF', 6),
  ('#8B5CF6', 'Violet', '#FFFFFF', 7),
  ('#06B6D4', 'Cyan', '#000000', 8),
  ('#EC4899', 'Magenta', '#FFFFFF', 9),
  ('#84CC16', 'Lime', '#000000', 10),
  ('#F97316', 'Tangerine', '#000000', 11),
  ('#6366F1', 'Indigo', '#FFFFFF', 12);

-- ============================================
-- 9. INDEXES
-- ============================================

-- collaborative_sessions indexes
CREATE INDEX idx_collab_enterprise ON collaborative_sessions(enterprise_id);
CREATE INDEX idx_collab_document ON collaborative_sessions(document_version_id);
CREATE INDEX idx_collab_redline ON collaborative_sessions(redline_session_id);
CREATE INDEX idx_collab_contract ON collaborative_sessions(contract_id);
CREATE INDEX idx_collab_status ON collaborative_sessions(status);
CREATE INDEX idx_collab_active ON collaborative_sessions(enterprise_id, status) WHERE status = 'active';
CREATE INDEX idx_collab_created_by ON collaborative_sessions(created_by);

-- document_operations indexes
CREATE INDEX idx_docops_session ON document_operations(session_id);
CREATE INDEX idx_docops_user ON document_operations(user_id);
CREATE INDEX idx_docops_type ON document_operations(operation_type);
CREATE INDEX idx_docops_clock ON document_operations(session_id, clock);
CREATE INDEX idx_docops_created ON document_operations(created_at DESC);
CREATE INDEX idx_docops_batch ON document_operations(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_docops_client ON document_operations(session_id, client_id);

-- editing_cursors indexes
CREATE INDEX idx_cursor_session ON editing_cursors(session_id);
CREATE INDEX idx_cursor_user ON editing_cursors(user_id);
CREATE INDEX idx_cursor_client ON editing_cursors(session_id, client_id);
CREATE INDEX idx_cursor_active ON editing_cursors(session_id, status) WHERE status IN ('active', 'idle');
CREATE INDEX idx_cursor_activity ON editing_cursors(last_activity);

-- collaborative_suggestions indexes
CREATE INDEX idx_suggest_session ON collaborative_suggestions(session_id);
CREATE INDEX idx_suggest_status ON collaborative_suggestions(status);
CREATE INDEX idx_suggest_user ON collaborative_suggestions(suggested_by_user_id);
CREATE INDEX idx_suggest_position ON collaborative_suggestions(session_id, start_position);

-- inline_comments indexes
CREATE INDEX idx_comment_session ON inline_comments(session_id);
CREATE INDEX idx_comment_thread ON inline_comments(thread_id);
CREATE INDEX idx_comment_parent ON inline_comments(parent_comment_id);
CREATE INDEX idx_comment_author ON inline_comments(author_user_id);
CREATE INDEX idx_comment_status ON inline_comments(status);
CREATE INDEX idx_comment_position ON inline_comments(session_id, anchor_start);

-- session_snapshots indexes
CREATE INDEX idx_snapshot_session ON session_snapshots(session_id);
CREATE INDEX idx_snapshot_version ON session_snapshots(session_id, version_number);
CREATE INDEX idx_snapshot_created ON session_snapshots(created_at DESC);

-- presence_history indexes
CREATE INDEX idx_presence_session ON presence_history(session_id);
CREATE INDEX idx_presence_user ON presence_history(user_id);
CREATE INDEX idx_presence_created ON presence_history(created_at DESC);

-- ============================================
-- 10. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE collaborative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE editing_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inline_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_history ENABLE ROW LEVEL SECURITY;

-- collaborative_sessions RLS
CREATE POLICY "collab_enterprise_isolation" ON collaborative_sessions
  FOR ALL USING (enterprise_id = public.current_user_enterprise_id());

-- document_operations RLS (via session)
CREATE POLICY "docops_via_session" ON document_operations
  FOR ALL USING (
    session_id IN (
      SELECT id FROM collaborative_sessions
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- editing_cursors RLS (via session)
CREATE POLICY "cursor_via_session" ON editing_cursors
  FOR ALL USING (
    session_id IN (
      SELECT id FROM collaborative_sessions
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- collaborative_suggestions RLS (via session)
CREATE POLICY "suggest_via_session" ON collaborative_suggestions
  FOR ALL USING (
    session_id IN (
      SELECT id FROM collaborative_sessions
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- inline_comments RLS (via session)
CREATE POLICY "comment_via_session" ON inline_comments
  FOR ALL USING (
    session_id IN (
      SELECT id FROM collaborative_sessions
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- session_snapshots RLS (via session)
CREATE POLICY "snapshot_via_session" ON session_snapshots
  FOR ALL USING (
    session_id IN (
      SELECT id FROM collaborative_sessions
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- presence_history RLS (via session)
CREATE POLICY "presence_via_session" ON presence_history
  FOR ALL USING (
    session_id IN (
      SELECT id FROM collaborative_sessions
      WHERE enterprise_id = public.current_user_enterprise_id()
    )
  );

-- ============================================
-- 11. TRIGGERS
-- ============================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_collab_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collab_session_timestamp
  BEFORE UPDATE ON collaborative_sessions
  FOR EACH ROW EXECUTE FUNCTION update_collab_timestamp();

CREATE TRIGGER inline_comment_timestamp
  BEFORE UPDATE ON inline_comments
  FOR EACH ROW EXECUTE FUNCTION update_collab_timestamp();

-- Track operation count
CREATE OR REPLACE FUNCTION increment_operation_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE collaborative_sessions
  SET operation_count = operation_count + 1
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER docops_count_increment
  AFTER INSERT ON document_operations
  FOR EACH ROW EXECUTE FUNCTION increment_operation_count();

-- Update cursor last activity
CREATE OR REPLACE FUNCTION update_cursor_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity := NOW();
  IF NEW.status = 'idle' AND OLD.status = 'active' THEN
    NEW.idle_since := NOW();
  ELSIF NEW.status = 'active' AND OLD.status != 'active' THEN
    NEW.idle_since := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cursor_activity_update
  BEFORE UPDATE ON editing_cursors
  FOR EACH ROW EXECUTE FUNCTION update_cursor_activity();

-- Set comment thread_id
CREATE OR REPLACE FUNCTION set_comment_thread()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT thread_id INTO NEW.thread_id
    FROM inline_comments
    WHERE id = NEW.parent_comment_id;
  END IF;
  IF NEW.thread_id IS NULL THEN
    NEW.thread_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_set_thread
  BEFORE INSERT ON inline_comments
  FOR EACH ROW EXECUTE FUNCTION set_comment_thread();

-- Track active users in session
CREATE OR REPLACE FUNCTION update_session_active_users()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status IN ('active', 'idle')) THEN
    IF NEW.user_id IS NOT NULL THEN
      UPDATE collaborative_sessions
      SET active_user_ids = array_append(
        array_remove(active_user_ids, NEW.user_id),
        NEW.user_id
      )
      WHERE id = NEW.session_id;
    ELSIF NEW.external_party_email IS NOT NULL THEN
      UPDATE collaborative_sessions
      SET external_participant_emails = array_append(
        array_remove(external_participant_emails, NEW.external_party_email),
        NEW.external_party_email
      )
      WHERE id = NEW.session_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IN ('away', 'offline') THEN
    IF NEW.user_id IS NOT NULL THEN
      UPDATE collaborative_sessions
      SET active_user_ids = array_remove(active_user_ids, NEW.user_id)
      WHERE id = NEW.session_id;
    ELSIF NEW.external_party_email IS NOT NULL THEN
      UPDATE collaborative_sessions
      SET external_participant_emails = array_remove(
        external_participant_emails,
        NEW.external_party_email
      )
      WHERE id = NEW.session_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.user_id IS NOT NULL THEN
      UPDATE collaborative_sessions
      SET active_user_ids = array_remove(active_user_ids, OLD.user_id)
      WHERE id = OLD.session_id;
    ELSIF OLD.external_party_email IS NOT NULL THEN
      UPDATE collaborative_sessions
      SET external_participant_emails = array_remove(
        external_participant_emails,
        OLD.external_party_email
      )
      WHERE id = OLD.session_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cursor_track_active_users
  AFTER INSERT OR UPDATE OR DELETE ON editing_cursors
  FOR EACH ROW EXECUTE FUNCTION update_session_active_users();

-- ============================================
-- 12. HELPER FUNCTIONS
-- ============================================

-- Create a collaborative editing session
CREATE OR REPLACE FUNCTION create_collaborative_session(
  p_enterprise_id UUID,
  p_document_version_id UUID,
  p_session_type TEXT DEFAULT 'edit',
  p_session_name TEXT DEFAULT NULL,
  p_initial_content TEXT DEFAULT NULL,
  p_contract_id UUID DEFAULT NULL,
  p_redline_session_id UUID DEFAULT NULL,
  p_allow_external BOOLEAN DEFAULT false,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  INSERT INTO collaborative_sessions (
    enterprise_id,
    document_version_id,
    contract_id,
    redline_session_id,
    session_type,
    session_name,
    initial_content,
    allow_external_participants,
    created_by,
    status
  ) VALUES (
    p_enterprise_id,
    p_document_version_id,
    p_contract_id,
    p_redline_session_id,
    p_session_type,
    p_session_name,
    p_initial_content,
    p_allow_external,
    p_created_by,
    'active'
  ) RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get or assign cursor color
CREATE OR REPLACE FUNCTION get_cursor_color(
  p_session_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_external_email TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_existing_color TEXT;
  v_used_colors TEXT[];
  v_new_color TEXT;
BEGIN
  -- Check if user already has a color in this session
  SELECT color INTO v_existing_color
  FROM editing_cursors
  WHERE session_id = p_session_id
  AND (
    (p_user_id IS NOT NULL AND user_id = p_user_id) OR
    (p_external_email IS NOT NULL AND external_party_email = p_external_email)
  )
  LIMIT 1;

  IF v_existing_color IS NOT NULL THEN
    RETURN v_existing_color;
  END IF;

  -- Get used colors
  SELECT array_agg(DISTINCT color) INTO v_used_colors
  FROM editing_cursors
  WHERE session_id = p_session_id;

  -- Get first available color
  SELECT color_hex INTO v_new_color
  FROM cursor_color_palette
  WHERE NOT (color_hex = ANY(COALESCE(v_used_colors, '{}')))
  ORDER BY sort_order
  LIMIT 1;

  -- Fallback to first color if all used
  IF v_new_color IS NULL THEN
    SELECT color_hex INTO v_new_color
    FROM cursor_color_palette
    ORDER BY sort_order
    LIMIT 1;
  END IF;

  RETURN v_new_color;
END;
$$ LANGUAGE plpgsql STABLE;

-- Join a collaborative session
CREATE OR REPLACE FUNCTION join_collaborative_session(
  p_session_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_external_email TEXT DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_client_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  cursor_id UUID,
  color TEXT,
  yjs_state BYTEA,
  yjs_state_vector BYTEA,
  participant_count INTEGER
) AS $$
DECLARE
  v_cursor_id UUID;
  v_color TEXT;
  v_session RECORD;
  v_name TEXT;
  v_client TEXT;
BEGIN
  -- Get session
  SELECT * INTO v_session
  FROM collaborative_sessions
  WHERE id = p_session_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or inactive';
  END IF;

  -- Determine name and client
  IF p_user_id IS NOT NULL THEN
    SELECT COALESCE(u.raw_user_meta_data->>'full_name', u.email)
    INTO v_name
    FROM auth.users u WHERE u.id = p_user_id;
  ELSE
    v_name := p_user_name;
  END IF;

  v_client := COALESCE(p_client_id, gen_random_uuid()::TEXT);
  v_color := get_cursor_color(p_session_id, p_user_id, p_external_email);

  -- Create or update cursor
  INSERT INTO editing_cursors (
    session_id,
    user_id,
    external_party_email,
    client_id,
    user_name,
    color,
    status
  ) VALUES (
    p_session_id,
    p_user_id,
    p_external_email,
    v_client,
    v_name,
    v_color,
    'active'
  )
  ON CONFLICT (session_id, client_id)
  DO UPDATE SET
    status = 'active',
    last_activity = NOW()
  RETURNING id INTO v_cursor_id;

  -- Log presence
  INSERT INTO presence_history (session_id, user_id, external_party_email, client_id, event_type)
  VALUES (p_session_id, p_user_id, p_external_email, v_client, 'join');

  RETURN QUERY
  SELECT
    v_cursor_id,
    v_color,
    v_session.yjs_state,
    v_session.yjs_state_vector,
    array_length(v_session.active_user_ids, 1) +
    array_length(v_session.external_participant_emails, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update cursor position
CREATE OR REPLACE FUNCTION update_cursor_position(
  p_cursor_id UUID,
  p_anchor INTEGER,
  p_head INTEGER,
  p_selection_type TEXT DEFAULT 'cursor',
  p_current_action TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE editing_cursors
  SET
    anchor = p_anchor,
    head = p_head,
    selection_type = p_selection_type,
    current_action = p_current_action,
    status = 'active',
    last_activity = NOW()
  WHERE id = p_cursor_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Leave a collaborative session
CREATE OR REPLACE FUNCTION leave_collaborative_session(
  p_cursor_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_cursor RECORD;
BEGIN
  SELECT * INTO v_cursor FROM editing_cursors WHERE id = p_cursor_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Log presence
  INSERT INTO presence_history (
    session_id, user_id, external_party_email, client_id, event_type,
    duration_ms
  )
  SELECT
    v_cursor.session_id,
    v_cursor.user_id,
    v_cursor.external_party_email,
    v_cursor.client_id,
    'leave',
    EXTRACT(EPOCH FROM (NOW() - v_cursor.session_start)) * 1000;

  -- Remove cursor
  DELETE FROM editing_cursors WHERE id = p_cursor_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Save Yjs update
CREATE OR REPLACE FUNCTION save_document_operation(
  p_session_id UUID,
  p_operation_type TEXT,
  p_operation_data BYTEA,
  p_user_id UUID DEFAULT NULL,
  p_external_email TEXT DEFAULT NULL,
  p_client_id TEXT DEFAULT NULL,
  p_change_summary TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_op_id UUID;
  v_clock INTEGER;
BEGIN
  -- Get next clock value
  SELECT COALESCE(MAX(clock), 0) + 1 INTO v_clock
  FROM document_operations
  WHERE session_id = p_session_id;

  INSERT INTO document_operations (
    session_id,
    operation_type,
    operation_data,
    operation_size,
    user_id,
    external_party_email,
    client_id,
    clock,
    change_summary
  ) VALUES (
    p_session_id,
    p_operation_type,
    p_operation_data,
    LENGTH(p_operation_data),
    p_user_id,
    p_external_email,
    COALESCE(p_client_id, 'server'),
    v_clock,
    p_change_summary
  ) RETURNING id INTO v_op_id;

  RETURN v_op_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Save session snapshot
CREATE OR REPLACE FUNCTION save_session_snapshot(
  p_session_id UUID,
  p_yjs_state BYTEA,
  p_yjs_state_vector BYTEA,
  p_snapshot_type TEXT DEFAULT 'auto',
  p_snapshot_name TEXT DEFAULT NULL,
  p_document_html TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_version INTEGER;
  v_op_count INTEGER;
  v_last_op UUID;
BEGIN
  -- Get current stats
  SELECT operation_count INTO v_op_count
  FROM collaborative_sessions WHERE id = p_session_id;

  SELECT id INTO v_last_op
  FROM document_operations
  WHERE session_id = p_session_id
  ORDER BY clock DESC LIMIT 1;

  -- Get next version
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version
  FROM session_snapshots WHERE session_id = p_session_id;

  INSERT INTO session_snapshots (
    session_id,
    yjs_state,
    yjs_state_vector,
    document_html,
    version_number,
    operation_count,
    last_operation_id,
    snapshot_type,
    snapshot_name,
    content_size,
    created_by
  ) VALUES (
    p_session_id,
    p_yjs_state,
    p_yjs_state_vector,
    p_document_html,
    v_version,
    v_op_count,
    v_last_op,
    p_snapshot_type,
    p_snapshot_name,
    LENGTH(p_yjs_state),
    p_created_by
  ) RETURNING id INTO v_snapshot_id;

  -- Update session state
  UPDATE collaborative_sessions
  SET
    yjs_state = p_yjs_state,
    yjs_state_vector = p_yjs_state_vector,
    version_number = v_version,
    last_snapshot_at = NOW()
  WHERE id = p_session_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active cursors for session
CREATE OR REPLACE FUNCTION get_session_cursors(p_session_id UUID)
RETURNS TABLE (
  cursor_id UUID,
  user_id UUID,
  external_email TEXT,
  client_id TEXT,
  user_name TEXT,
  color TEXT,
  anchor INTEGER,
  head INTEGER,
  selection_type TEXT,
  status TEXT,
  current_action TEXT,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.id,
    ec.user_id,
    ec.external_party_email,
    ec.client_id,
    ec.user_name,
    ec.color,
    ec.anchor,
    ec.head,
    ec.selection_type,
    ec.status,
    ec.current_action,
    ec.last_activity
  FROM editing_cursors ec
  WHERE ec.session_id = p_session_id
  AND ec.status IN ('active', 'idle')
  ORDER BY ec.session_start;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get operations since clock value (for sync)
CREATE OR REPLACE FUNCTION get_operations_since(
  p_session_id UUID,
  p_since_clock INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 1000
)
RETURNS TABLE (
  operation_id UUID,
  operation_type TEXT,
  operation_data BYTEA,
  user_id UUID,
  client_id TEXT,
  clock INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dop.id,
    dop.operation_type,
    dop.operation_data,
    dop.user_id,
    dop.client_id,
    dop.clock,
    dop.created_at
  FROM document_operations dop
  WHERE dop.session_id = p_session_id
  AND dop.clock > p_since_clock
  ORDER BY dop.clock
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Complete a collaborative session
CREATE OR REPLACE FUNCTION complete_collaborative_session(
  p_session_id UUID,
  p_final_html TEXT DEFAULT NULL,
  p_create_document_version BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
  v_doc_version_id UUID;
  v_session RECORD;
BEGIN
  SELECT * INTO v_session
  FROM collaborative_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Update session status
  UPDATE collaborative_sessions
  SET
    status = 'completed',
    completed_at = NOW()
  WHERE id = p_session_id;

  -- Create final snapshot
  IF v_session.yjs_state IS NOT NULL THEN
    PERFORM save_session_snapshot(
      p_session_id,
      v_session.yjs_state,
      v_session.yjs_state_vector,
      'milestone',
      'Final Version'
    );
  END IF;

  -- Remove all cursors
  DELETE FROM editing_cursors WHERE session_id = p_session_id;

  RETURN v_doc_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_collaborative_session TO authenticated;
GRANT EXECUTE ON FUNCTION get_cursor_color TO authenticated;
GRANT EXECUTE ON FUNCTION join_collaborative_session TO authenticated;
GRANT EXECUTE ON FUNCTION update_cursor_position TO authenticated;
GRANT EXECUTE ON FUNCTION leave_collaborative_session TO authenticated;
GRANT EXECUTE ON FUNCTION save_document_operation TO authenticated;
GRANT EXECUTE ON FUNCTION save_session_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_cursors TO authenticated;
GRANT EXECUTE ON FUNCTION get_operations_since TO authenticated;
GRANT EXECUTE ON FUNCTION complete_collaborative_session TO authenticated;

GRANT SELECT ON cursor_color_palette TO authenticated;
