-- Script to identify and remove duplicate user accounts in Pactwise database
-- Run this script with caution and always backup your database first

-- 1. IDENTIFY DUPLICATES
-- This query finds all duplicate user accounts based on email
WITH duplicate_users AS (
    SELECT 
        u.email,
        u.id as user_id,
        u.auth_id,
        u.enterprise_id,
        u.created_at,
        u.first_name,
        u.last_name,
        e.name as enterprise_name,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(u.email), u.enterprise_id 
            ORDER BY u.created_at DESC, u.last_login_at DESC NULLS LAST
        ) as rn,
        COUNT(*) OVER (PARTITION BY LOWER(u.email), u.enterprise_id) as duplicate_count
    FROM users u
    JOIN enterprises e ON u.enterprise_id = e.id
    WHERE u.deleted_at IS NULL
)
SELECT 
    email,
    user_id,
    auth_id,
    enterprise_name,
    created_at,
    CASE 
        WHEN rn = 1 THEN 'KEEP (newest/most recent login)'
        ELSE 'DUPLICATE - TO BE REMOVED'
    END as action,
    duplicate_count
FROM duplicate_users
WHERE duplicate_count > 1
ORDER BY email, enterprise_name, rn;

-- 2. SOFT DELETE DUPLICATES (Recommended - Reversible)
-- This marks duplicates as deleted without removing them from the database
BEGIN;

-- First, show what will be deleted
WITH duplicates_to_remove AS (
    SELECT 
        u.id,
        u.email,
        u.enterprise_id,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(u.email), u.enterprise_id 
            ORDER BY u.created_at DESC, u.last_login_at DESC NULLS LAST
        ) as rn
    FROM users u
    WHERE u.deleted_at IS NULL
)
SELECT 
    'Will soft-delete user:' as action,
    id,
    email
FROM duplicates_to_remove
WHERE rn > 1;

-- Perform soft delete
UPDATE users
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY LOWER(email), enterprise_id 
                ORDER BY created_at DESC, last_login_at DESC NULLS LAST
            ) as rn
        FROM users
        WHERE deleted_at IS NULL
    ) ranked_users
    WHERE rn > 1
);

-- Verify the changes
SELECT 'Soft-deleted ' || COUNT(*) || ' duplicate users' as result
FROM users
WHERE deleted_at = NOW()::date;

-- IMPORTANT: Review the changes and then either:
-- COMMIT;  -- to save changes
-- ROLLBACK; -- to undo changes

-- 3. HARD DELETE DUPLICATES (Use with extreme caution - Not reversible)
-- Only use this if you're absolutely sure and have backups
/*
BEGIN;

-- First check what will be deleted
WITH duplicates_to_delete AS (
    SELECT 
        u.id,
        u.email,
        u.auth_id,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(u.email), u.enterprise_id 
            ORDER BY u.created_at DESC, u.last_login_at DESC NULLS LAST
        ) as rn
    FROM users u
    WHERE u.deleted_at IS NULL
)
DELETE FROM users
WHERE id IN (
    SELECT id FROM duplicates_to_delete WHERE rn > 1
)
RETURNING email, id;

-- Also delete from auth.users if needed (Supabase Auth)
-- WARNING: This will permanently delete the auth account
DELETE FROM auth.users
WHERE id IN (
    SELECT auth_id
    FROM (
        SELECT 
            auth_id,
            ROW_NUMBER() OVER (
                PARTITION BY LOWER(email), enterprise_id 
                ORDER BY created_at DESC, last_login_at DESC NULLS LAST
            ) as rn
        FROM users
        WHERE deleted_at IS NULL
    ) ranked_users
    WHERE rn > 1
);

-- COMMIT or ROLLBACK based on verification
*/

-- 4. PREVENT FUTURE DUPLICATES
-- Add a unique constraint if not already present
-- ALTER TABLE users ADD CONSTRAINT unique_email_enterprise 
-- UNIQUE (LOWER(email), enterprise_id) 
-- WHERE deleted_at IS NULL;

-- 5. UTILITY QUERIES

-- Find users with same email across different enterprises (might be legitimate)
SELECT 
    email,
    COUNT(DISTINCT enterprise_id) as enterprise_count,
    STRING_AGG(DISTINCT e.name, ', ') as enterprises
FROM users u
JOIN enterprises e ON u.enterprise_id = e.id
WHERE u.deleted_at IS NULL
GROUP BY email
HAVING COUNT(DISTINCT enterprise_id) > 1
ORDER BY enterprise_count DESC;

-- Find orphaned auth.users (exist in auth but not in users table)
SELECT 
    au.id as auth_id,
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN users u ON u.auth_id = au.id
WHERE u.id IS NULL;

-- Find users without corresponding auth.users entry
SELECT 
    u.id as user_id,
    u.email,
    u.auth_id,
    u.created_at
FROM users u
LEFT JOIN auth.users au ON au.id = u.auth_id
WHERE au.id IS NULL
    AND u.deleted_at IS NULL;