-- Digital Document Vault - Database Seed Data V2
-- Fictional seed accounts with >= 12 char passwords hashed with BCrypt (strength 12)
-- All timestamps stored in UTC

-- 1. Document Owner: owner@vault.local / OwnerPassword123!
INSERT INTO users (id, username, email, password_hash, full_name, role, status, failed_login_attempts, locked_until, version, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'doc_owner',
    'owner@vault.local',
    '$2a$12$I5ZBnKrP5GfR4HWU2W8smuc50G1ThcVNvvw5Cb96YL32laD0r.jJy',
    'Alice Henderson (Owner)',
    'ROLE_USER',
    'ACTIVE',
    0,
    NULL,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 2. Shared Colleague / Shared User: colleague@vault.local / ColleaguePassword123!
INSERT INTO users (id, username, email, password_hash, full_name, role, status, failed_login_attempts, locked_until, version, created_at, updated_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'shared_colleague',
    'colleague@vault.local',
    '$2a$12$qSmKJSit/.Jbg.PUs5a/p.IuhH2Lk8kNvxBBwsiTcoqmPa3EV1sdu',
    'Bob Miller (Shared User)',
    'ROLE_USER',
    'ACTIVE',
    0,
    NULL,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 3. Vault Administrator: vaultadmin@vault.local / VaultAdminPass123!
INSERT INTO users (id, username, email, password_hash, full_name, role, status, failed_login_attempts, locked_until, version, created_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'vault_admin',
    'vaultadmin@vault.local',
    '$2a$12$kOckm03tiDFa/kG1ayb88OPxwSpqGc8By2grsIxT6hU1qDFTxuQuu',
    'Victoria Chen (Vault Admin)',
    'ROLE_VAULT_ADMIN',
    'ACTIVE',
    0,
    NULL,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 4. System Administrator: sysadmin@vault.local / SysAdminPass123!
INSERT INTO users (id, username, email, password_hash, full_name, role, status, failed_login_attempts, locked_until, version, created_at, updated_at)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'sys_admin',
    'sysadmin@vault.local',
    '$2a$12$a8W1x1vP7kwnspbW2TWvWet.up8vTiWYysArgf1BXFSoJNJga5ILu',
    'Samuel Adams (System Admin)',
    'ROLE_SYSTEM_ADMIN',
    'ACTIVE',
    0,
    NULL,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
