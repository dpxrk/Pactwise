-- Migration: Add vendor subcategories and dynamic category management
-- This migration:
-- 1. Creates vendor_categories table for dynamic category management
-- 2. Creates vendor_subcategories table for subcategory support
-- 3. Migrates existing enum values to the new structure
-- 4. Updates vendors table to use the new category system

-- Create vendor_categories table for dynamic category management
CREATE TABLE vendor_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL, -- Properly capitalized display name
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT true, -- System categories cannot be deleted
    sort_order INTEGER DEFAULT 0,
    enterprise_id UUID REFERENCES enterprises(id), -- NULL for global categories, UUID for enterprise-specific
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, enterprise_id) -- Unique category names per enterprise (or global if NULL)
);

-- Create vendor_subcategories table
CREATE TABLE vendor_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES vendor_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    enterprise_id UUID REFERENCES enterprises(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name, enterprise_id)
);

-- Insert default categories with proper capitalization
INSERT INTO vendor_categories (name, display_name, description, is_system, sort_order) VALUES
    ('technology', 'Technology', 'Technology and IT services', true, 1),
    ('marketing', 'Marketing', 'Marketing and advertising services', true, 2),
    ('legal', 'Legal', 'Legal services and compliance', true, 3),
    ('finance', 'Finance', 'Financial services and accounting', true, 4),
    ('hr', 'HR', 'Human resources and talent management', true, 5),
    ('facilities', 'Facilities', 'Facilities management and maintenance', true, 6),
    ('logistics', 'Logistics', 'Logistics and supply chain management', true, 7),
    ('manufacturing', 'Manufacturing', 'Manufacturing and production', true, 8),
    ('consulting', 'Consulting', 'Business consulting services', true, 9),
    ('other', 'Other', 'Other vendor categories', true, 10);

-- Insert default subcategories for Finance
INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'tax_services',
    'Tax Services',
    'Tax preparation and advisory services',
    1
FROM vendor_categories WHERE name = 'finance';

INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'accounting',
    'Accounting',
    'Bookkeeping and accounting services',
    2
FROM vendor_categories WHERE name = 'finance';

INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'financial_consulting',
    'Financial Consulting',
    'Financial planning and consulting',
    3
FROM vendor_categories WHERE name = 'finance';

INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'auditing',
    'Auditing',
    'Internal and external audit services',
    4
FROM vendor_categories WHERE name = 'finance';

INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'payroll',
    'Payroll',
    'Payroll processing services',
    5
FROM vendor_categories WHERE name = 'finance';

-- Insert default subcategories for Technology
INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'software_development',
    'Software Development',
    'Custom software development',
    1
FROM vendor_categories WHERE name = 'technology';

INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'cloud_services',
    'Cloud Services',
    'Cloud infrastructure and services',
    2
FROM vendor_categories WHERE name = 'technology';

INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'cybersecurity',
    'Cybersecurity',
    'Security services and solutions',
    3
FROM vendor_categories WHERE name = 'technology';

INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'it_support',
    'IT Support',
    'Technical support and maintenance',
    4
FROM vendor_categories WHERE name = 'technology';

INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'data_analytics',
    'Data Analytics',
    'Data analysis and business intelligence',
    5
FROM vendor_categories WHERE name = 'technology';

-- Insert default subcategories for Legal
INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'corporate_law',
    'Corporate Law',
    'Corporate legal services',
    1
FROM vendor_categories WHERE name = 'legal';

INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'intellectual_property',
    'Intellectual Property',
    'IP and patent services',
    2
FROM vendor_categories WHERE name = 'legal';

INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'compliance',
    'Compliance',
    'Regulatory compliance services',
    3
FROM vendor_categories WHERE name = 'legal';

INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'litigation',
    'Litigation',
    'Litigation and dispute resolution',
    4
FROM vendor_categories WHERE name = 'legal';

-- Insert default subcategories for Marketing
INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'digital_marketing',
    'Digital Marketing',
    'Online marketing and SEO',
    1
FROM vendor_categories WHERE name = 'marketing';

INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'content_creation',
    'Content Creation',
    'Content writing and creation',
    2
FROM vendor_categories WHERE name = 'marketing';

INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'branding',
    'Branding',
    'Brand strategy and design',
    3
FROM vendor_categories WHERE name = 'marketing';

INSERT INTO vendor_subcategories (category_id, name, display_name, description, sort_order)
SELECT 
    id,
    'public_relations',
    'Public Relations',
    'PR and media relations',
    4
FROM vendor_categories WHERE name = 'marketing';

-- Add columns to vendors table for new category system
ALTER TABLE vendors 
ADD COLUMN category_id UUID,
ADD COLUMN subcategory_id UUID,
ADD CONSTRAINT fk_vendor_category FOREIGN KEY (category_id) REFERENCES vendor_categories(id),
ADD CONSTRAINT fk_vendor_subcategory FOREIGN KEY (subcategory_id) REFERENCES vendor_subcategories(id);

-- Migrate existing vendor categories to new system
UPDATE vendors v
SET category_id = vc.id
FROM vendor_categories vc
WHERE v.category::text = vc.name;

-- Create function to add custom categories for enterprises
CREATE OR REPLACE FUNCTION add_vendor_category(
    p_enterprise_id UUID,
    p_name VARCHAR(100),
    p_display_name VARCHAR(100),
    p_description TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_category_id UUID;
BEGIN
    -- Check if category already exists for this enterprise
    SELECT id INTO v_category_id
    FROM vendor_categories
    WHERE name = p_name AND enterprise_id = p_enterprise_id;
    
    IF v_category_id IS NOT NULL THEN
        RAISE EXCEPTION 'Category % already exists for this enterprise', p_name;
    END IF;
    
    -- Insert new category
    INSERT INTO vendor_categories (name, display_name, description, is_system, enterprise_id, created_by)
    VALUES (p_name, p_display_name, p_description, false, p_enterprise_id, p_created_by)
    RETURNING id INTO v_category_id;
    
    RETURN v_category_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to add custom subcategories
CREATE OR REPLACE FUNCTION add_vendor_subcategory(
    p_category_id UUID,
    p_enterprise_id UUID,
    p_name VARCHAR(100),
    p_display_name VARCHAR(100),
    p_description TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_subcategory_id UUID;
BEGIN
    -- Check if subcategory already exists for this category and enterprise
    SELECT id INTO v_subcategory_id
    FROM vendor_subcategories
    WHERE category_id = p_category_id 
    AND name = p_name 
    AND (enterprise_id = p_enterprise_id OR (enterprise_id IS NULL AND p_enterprise_id IS NULL));
    
    IF v_subcategory_id IS NOT NULL THEN
        RAISE EXCEPTION 'Subcategory % already exists for this category', p_name;
    END IF;
    
    -- Insert new subcategory
    INSERT INTO vendor_subcategories (category_id, name, display_name, description, enterprise_id, created_by)
    VALUES (p_category_id, p_name, p_display_name, p_description, p_enterprise_id, p_created_by)
    RETURNING id INTO v_subcategory_id;
    
    RETURN v_subcategory_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for easy vendor category/subcategory lookup
CREATE OR REPLACE VIEW vendor_category_hierarchy AS
SELECT 
    vc.id as category_id,
    vc.name as category_name,
    vc.display_name as category_display_name,
    vc.enterprise_id,
    vs.id as subcategory_id,
    vs.name as subcategory_name,
    vs.display_name as subcategory_display_name,
    vc.is_system,
    vc.is_active as category_active,
    vs.is_active as subcategory_active
FROM vendor_categories vc
LEFT JOIN vendor_subcategories vs ON vc.id = vs.category_id
WHERE vc.is_active = true
ORDER BY vc.sort_order, vs.sort_order;

-- Add indexes for performance
CREATE INDEX idx_vendor_categories_enterprise ON vendor_categories(enterprise_id);
CREATE INDEX idx_vendor_subcategories_category ON vendor_subcategories(category_id);
CREATE INDEX idx_vendor_subcategories_enterprise ON vendor_subcategories(enterprise_id);
CREATE INDEX idx_vendors_category_id ON vendors(category_id);
CREATE INDEX idx_vendors_subcategory_id ON vendors(subcategory_id);

-- Add triggers for updated_at
CREATE TRIGGER update_vendor_categories_updated_at BEFORE UPDATE ON vendor_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_subcategories_updated_at BEFORE UPDATE ON vendor_subcategories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for vendor_categories
ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global categories visible to all authenticated users" ON vendor_categories
    FOR SELECT
    USING (auth.uid() IS NOT NULL AND enterprise_id IS NULL);

CREATE POLICY "Enterprise categories visible to enterprise members" ON vendor_categories
    FOR SELECT
    USING (
        enterprise_id IS NULL OR
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Enterprise admins can manage custom categories" ON vendor_categories
    FOR ALL
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    )
    WITH CHECK (
        enterprise_id IN (
            SELECT enterprise_id FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Add RLS policies for vendor_subcategories
ALTER TABLE vendor_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcategories visible based on category access" ON vendor_subcategories
    FOR SELECT
    USING (
        category_id IN (
            SELECT id FROM vendor_categories
            WHERE enterprise_id IS NULL OR
            enterprise_id IN (
                SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
            )
        )
    );

CREATE POLICY "Enterprise admins can manage custom subcategories" ON vendor_subcategories
    FOR ALL
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    )
    WITH CHECK (
        enterprise_id IN (
            SELECT enterprise_id FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Comment on tables and columns
COMMENT ON TABLE vendor_categories IS 'Dynamic vendor categories that can be customized per enterprise';
COMMENT ON TABLE vendor_subcategories IS 'Subcategories for vendor categories, allowing hierarchical organization';
COMMENT ON COLUMN vendor_categories.is_system IS 'System categories cannot be deleted and are available to all enterprises';
COMMENT ON COLUMN vendor_categories.enterprise_id IS 'NULL for global categories, UUID for enterprise-specific categories';

-- Note: The old vendor_category enum type will be dropped in a future migration
-- after ensuring all data has been migrated and applications updated