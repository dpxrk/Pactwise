-- Real-time Collaboration Tables

-- User Presence
CREATE TABLE user_presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'online', -- online, away, busy, offline
    activity_type VARCHAR(50), -- viewing, editing, analyzing, reviewing, idle
    activity_details JSONB DEFAULT '{}',
    current_path VARCHAR(255),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Real-time Events
CREATE TABLE realtime_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    user_id UUID REFERENCES users(id),
    target_users UUID[] DEFAULT '{}',
    is_broadcast BOOLEAN DEFAULT false,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours'
);

-- Typing Indicators
CREATE TABLE typing_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    resource_type VARCHAR(50) NOT NULL, -- contract, vendor, document
    resource_id UUID NOT NULL,
    field_name VARCHAR(100),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 seconds',
    UNIQUE(user_id, resource_type, resource_id, field_name)
);

-- Collaborative Documents
CREATE TABLE collaborative_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_type VARCHAR(50) NOT NULL,
    document_id UUID NOT NULL,
    title VARCHAR(255),
    content TEXT,
    content_type VARCHAR(50) DEFAULT 'text',
    version INTEGER DEFAULT 1,
    is_locked BOOLEAN DEFAULT false,
    locked_by UUID REFERENCES users(id),
    locked_at TIMESTAMP WITH TIME ZONE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Comments
CREATE TABLE document_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES collaborative_documents(id),
    parent_comment_id UUID REFERENCES document_comments(id),
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    selection_start INTEGER,
    selection_end INTEGER,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Document Suggestions
CREATE TABLE document_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES collaborative_documents(id),
    user_id UUID NOT NULL REFERENCES users(id),
    suggestion_type VARCHAR(50) NOT NULL, -- addition, deletion, modification
    original_text TEXT,
    suggested_text TEXT,
    selection_start INTEGER NOT NULL,
    selection_end INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Versions/Snapshots
CREATE TABLE document_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES collaborative_documents(id),
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_hash VARCHAR(64),
    created_by UUID NOT NULL REFERENCES users(id),
    change_summary TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, version)
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    severity VARCHAR(20) DEFAULT 'info', -- critical, high, medium, low, info
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    action_label VARCHAR(100),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Notification Templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Notification Preferences
CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    notification_type VARCHAR(100) NOT NULL,
    email_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT false,
    frequency VARCHAR(20) DEFAULT 'immediate', -- immediate, hourly, daily, weekly
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- Create indexes for collaboration tables
CREATE INDEX idx_user_presence_enterprise ON user_presence(enterprise_id);
CREATE INDEX idx_user_presence_last_seen ON user_presence(last_seen_at DESC);

CREATE INDEX idx_realtime_events_enterprise ON realtime_events(enterprise_id, created_at DESC);
CREATE INDEX idx_realtime_events_resource ON realtime_events(resource_type, resource_id);
CREATE INDEX idx_realtime_events_expires ON realtime_events(expires_at);

CREATE INDEX idx_typing_indicators_resource ON typing_indicators(resource_type, resource_id);
CREATE INDEX idx_typing_indicators_expires ON typing_indicators(expires_at);

CREATE INDEX idx_collaborative_documents_document ON collaborative_documents(document_type, document_id);
CREATE INDEX idx_collaborative_documents_locked ON collaborative_documents(is_locked) WHERE is_locked = true;

CREATE INDEX idx_document_comments_document ON document_comments(document_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_document_comments_unresolved ON document_comments(document_id) WHERE is_resolved = false AND deleted_at IS NULL;

CREATE INDEX idx_document_suggestions_document ON document_suggestions(document_id);
CREATE INDEX idx_document_suggestions_pending ON document_suggestions(document_id) WHERE status = 'pending';

CREATE INDEX idx_document_snapshots_document ON document_snapshots(document_id, version DESC);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false AND is_archived = false;

-- Add triggers
CREATE TRIGGER update_collaborative_documents_updated_at BEFORE UPDATE ON collaborative_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_comments_updated_at BEFORE UPDATE ON document_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Clean up expired events
    DELETE FROM realtime_events WHERE expires_at < NOW();
    
    -- Clean up expired typing indicators
    DELETE FROM typing_indicators WHERE expires_at < NOW();
    
    -- Clean up expired short-term memory
    DELETE FROM short_term_memory WHERE expires_at < NOW();
    
    -- Clean up old presence data
    UPDATE user_presence 
    SET status = 'offline' 
    WHERE last_seen_at < NOW() - INTERVAL '5 minutes' 
    AND status != 'offline';
END;
$$ LANGUAGE plpgsql;