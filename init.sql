-- ================================================================
-- CASFETA CUD Chapter — Initial Database Setup
-- Run this entire script in the Neon Console → SQL Editor
--
-- After running, log in with:
--   Username : password
--   Password : password
--
-- IMPORTANT: Change the password immediately after first login.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Clean slate (safe to run multiple times)
-- ----------------------------------------------------------------
TRUNCATE TABLE
  "AuditLog",
  "Notification",
  "Comment",
  "Announcement",
  "EventRegistration",
  "Event",
  "AttendanceRecord",
  "AttendanceSession",
  "Document",
  "MinistryMember",
  "Ministry",
  "MemberSkill",
  "Skill",
  "User",
  "Member",
  "SystemSetting"
RESTART IDENTITY CASCADE;

-- ----------------------------------------------------------------
-- 2. Skills catalogue
-- ----------------------------------------------------------------
INSERT INTO "Skill" (id, name, category, "createdAt") VALUES
  (gen_random_uuid(), 'Worship Singing',      'Music',       NOW()),
  (gen_random_uuid(), 'Keyboard / Piano',     'Music',       NOW()),
  (gen_random_uuid(), 'Acoustic Guitar',      'Music',       NOW()),
  (gen_random_uuid(), 'Bass Guitar',          'Music',       NOW()),
  (gen_random_uuid(), 'Drums',                'Music',       NOW()),
  (gen_random_uuid(), 'Sound Engineering',    'Technical',   NOW()),
  (gen_random_uuid(), 'Video Editing',        'Technical',   NOW()),
  (gen_random_uuid(), 'Photography',          'Technical',   NOW()),
  (gen_random_uuid(), 'Graphic Design',       'Technical',   NOW()),
  (gen_random_uuid(), 'Public Speaking',      'Leadership',  NOW()),
  (gen_random_uuid(), 'Event Planning',       'Leadership',  NOW()),
  (gen_random_uuid(), 'Prayer Intercession',  'Spiritual',   NOW()),
  (gen_random_uuid(), 'Bible Teaching',       'Spiritual',   NOW()),
  (gen_random_uuid(), 'Evangelism',           'Spiritual',   NOW()),
  (gen_random_uuid(), 'Counselling',          'Spiritual',   NOW()),
  (gen_random_uuid(), 'First Aid',            'Service',     NOW()),
  (gen_random_uuid(), 'Cooking',              'Service',     NOW()),
  (gen_random_uuid(), 'Ushering',             'Service',     NOW()),
  (gen_random_uuid(), 'Drama / Acting',       'Creative',    NOW()),
  (gen_random_uuid(), 'Spoken Word',          'Creative',    NOW());

-- ----------------------------------------------------------------
-- 3. Ministries
-- ----------------------------------------------------------------
INSERT INTO "Ministry" (id, name, description, color, "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Praise & Worship',     'Leads congregational worship during services.',        '#0f766e', NOW(), NOW()),
  (gen_random_uuid(), 'Prayer Ministry',      'Coordinates prayer meetings and intercession.',        '#7c3aed', NOW(), NOW()),
  (gen_random_uuid(), 'Evangelism Ministry',  'Outreach and soul-winning.',                           '#dc2626', NOW(), NOW()),
  (gen_random_uuid(), 'Media & Tech',         'Sound, projection, and livestream.',                   '#2563eb', NOW(), NOW()),
  (gen_random_uuid(), 'Drama Ministry',       'Christian drama and skits.',                           '#ea580c', NOW(), NOW()),
  (gen_random_uuid(), 'Ushering & Protocol',  'Welcoming members and maintaining order in services.', '#16a34a', NOW(), NOW()),
  (gen_random_uuid(), 'Bible Study',          'Facilitates weekly Bible study sessions.',             '#9333ea', NOW(), NOW());

-- ----------------------------------------------------------------
-- 4. SUPER_ADMIN member profile + user account
--    Username = password
--    Email    = jamessebronmwalubandu@gmail.com
--    Password = password (hash = bcrypt("password", cost=10))
-- ----------------------------------------------------------------
DO $$
DECLARE
  v_member_id TEXT := gen_random_uuid()::TEXT;
BEGIN
  INSERT INTO "Member" (
    id, "fullName", "regNumber", "phoneNumber", email,
    gender, faculty, department, course, "yearOfStudy",
    status, "joinedAt", "createdAt", "updatedAt"
  ) VALUES (
    v_member_id,
    'System Administrator',
    'CUD/ADMIN/001',
    '',
    'jamessebronmwalubandu@gmail.com',
    'MALE',
    'Administration',
    'System',
    'Administrator',
    'YEAR_1',
    'ACTIVE',
    NOW(), NOW(), NOW()
  );

  INSERT INTO "User" (
    id, email, username, "passwordHash",
    role, "memberId", "isActive", "createdAt", "updatedAt"
  ) VALUES (
    gen_random_uuid()::TEXT,
    'jamessebronmwalubandu@gmail.com',
    'password',
    '$2b$10$uP1YI4sFf6Miz0j9NoRgkusaZUthtVE6iFHTL6.Yak/JJtiIgd4MC',
    'SUPER_ADMIN',
    v_member_id,
    true,
    NOW(), NOW()
  );
END $$;

-- ----------------------------------------------------------------
-- 5. System settings
-- ----------------------------------------------------------------
INSERT INTO "SystemSetting" (id, key, value, description, "updatedAt") VALUES
  (gen_random_uuid(), 'org_name',                   'CASFETA CUD Chapter', 'Organisation display name',                 NOW()),
  (gen_random_uuid(), 'org_email',                  'info@casfeta.ac.tz',  'Primary contact email',                     NOW()),
  (gen_random_uuid(), 'org_phone',                  '',                    'Primary contact phone number',              NOW()),
  (gen_random_uuid(), 'academic_year',              '2024/2025',           'Current academic year',                     NOW()),
  (gen_random_uuid(), 'sms_enabled',                'false',               'Whether SMS sending is active',             NOW()),
  (gen_random_uuid(), 'allow_member_self_register', 'false',               'Allow members to self-register via portal', NOW());

-- ================================================================
-- Done! Login: username=password | password=password
-- ================================================================
