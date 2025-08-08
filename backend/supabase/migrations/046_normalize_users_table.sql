-- Normalize the users table to achieve 3NF/BCNF
-- This migration addresses the transitive dependency of department and title

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_department_id UUID REFERENCES departments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enterprise_id, name)
);

-- Create job_titles table
CREATE TABLE IF NOT EXISTS job_titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    title VARCHAR(100) NOT NULL,
    department_id UUID REFERENCES departments(id),
    level INTEGER, -- seniority level
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enterprise_id, title, department_id)
);

-- Create user_positions table to handle the many-to-many relationship
-- (users can have multiple positions in different departments)
CREATE TABLE IF NOT EXISTS user_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    job_title_id UUID REFERENCES job_titles(id),
    is_primary BOOLEAN DEFAULT false,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create partial unique index for primary position
CREATE UNIQUE INDEX unique_primary_position 
ON user_positions (user_id, is_primary) 
WHERE is_primary = true AND end_date IS NULL;

-- Migrate existing department and title data
-- First, create departments from unique values
INSERT INTO departments (enterprise_id, name)
SELECT DISTINCT enterprise_id, department
FROM users
WHERE department IS NOT NULL
ON CONFLICT (enterprise_id, name) DO NOTHING;

-- Create job titles from unique values
INSERT INTO job_titles (enterprise_id, title)
SELECT DISTINCT enterprise_id, title
FROM users
WHERE title IS NOT NULL
ON CONFLICT (enterprise_id, title, department_id) DO NOTHING;

-- Create user positions based on current data
INSERT INTO user_positions (user_id, department_id, job_title_id, is_primary)
SELECT 
    u.id,
    d.id,
    jt.id,
    true
FROM users u
LEFT JOIN departments d ON u.enterprise_id = d.enterprise_id AND u.department = d.name
LEFT JOIN job_titles jt ON u.enterprise_id = jt.enterprise_id AND u.title = jt.title
WHERE u.department IS NOT NULL OR u.title IS NOT NULL;

-- Add columns for backward compatibility (will be removed in future migration)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS primary_department_id UUID REFERENCES departments(id),
ADD COLUMN IF NOT EXISTS primary_job_title_id UUID REFERENCES job_titles(id);

-- Update the new columns
UPDATE users u
SET 
    primary_department_id = up.department_id,
    primary_job_title_id = up.job_title_id
FROM user_positions up
WHERE u.id = up.user_id AND up.is_primary = true;

-- Create indexes for performance
CREATE INDEX idx_departments_enterprise ON departments(enterprise_id);
CREATE INDEX idx_departments_parent ON departments(parent_department_id) WHERE parent_department_id IS NOT NULL;
CREATE INDEX idx_job_titles_enterprise ON job_titles(enterprise_id);
CREATE INDEX idx_job_titles_department ON job_titles(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX idx_user_positions_user ON user_positions(user_id);
CREATE INDEX idx_user_positions_active ON user_positions(user_id, is_primary) WHERE end_date IS NULL;

-- Add triggers for updated_at
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_titles_updated_at BEFORE UPDATE ON job_titles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_positions_updated_at BEFORE UPDATE ON user_positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their enterprise's departments" ON departments
    FOR SELECT USING (enterprise_id = auth.user_enterprise_id());

CREATE POLICY "Users can view their enterprise's job titles" ON job_titles
    FOR SELECT USING (enterprise_id = auth.user_enterprise_id());

CREATE POLICY "Users can view their own positions" ON user_positions
    FOR SELECT USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = user_positions.user_id 
        AND enterprise_id = auth.user_enterprise_id()
    ));

-- Note: The old department and title columns in users table are kept for backward compatibility
-- They should be removed in a future migration after updating all application code
COMMENT ON COLUMN users.department IS 'DEPRECATED: Use user_positions table instead. Will be removed in future migration.';
COMMENT ON COLUMN users.title IS 'DEPRECATED: Use user_positions table instead. Will be removed in future migration.';