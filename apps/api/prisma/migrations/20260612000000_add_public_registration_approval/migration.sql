-- Migration: add_public_registration_approval
-- Adds: UserStatus values (PENDING_APPROVAL, APPROVED, REJECTED, SUSPENDED)
--       MembershipRole value (CONTRACTOR)
--       VisibilityScope enum
--       RegistrationRequestStatus enum
--       visibilityScope column on TenantMembership
--       MembershipPermission table
--       RegistrationRequest table
-- Safe: all changes are additive; existing rows are unaffected

-- 1. Extend UserStatus enum
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

-- 2. Extend MembershipRole enum
ALTER TYPE "MembershipRole" ADD VALUE IF NOT EXISTS 'CONTRACTOR';

-- 3. Create VisibilityScope enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VisibilityScope') THEN
    CREATE TYPE "VisibilityScope" AS ENUM (
      'TENANT_WIDE',
      'WORKSPACE_LEVEL',
      'PROJECT_LEVEL',
      'CLIENT_LEVEL',
      'ASSIGNED_ITEMS_ONLY'
    );
  END IF;
END
$$;

-- 4. Create RegistrationRequestStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RegistrationRequestStatus') THEN
    CREATE TYPE "RegistrationRequestStatus" AS ENUM (
      'PENDING',
      'APPROVED',
      'REJECTED'
    );
  END IF;
END
$$;

-- 5. Add visibilityScope column to TenantMembership
ALTER TABLE "TenantMembership"
  ADD COLUMN IF NOT EXISTS "visibilityScope" "VisibilityScope" NOT NULL DEFAULT 'TENANT_WIDE';

-- 6. Create MembershipPermission table
CREATE TABLE IF NOT EXISTS "MembershipPermission" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "membershipId" TEXT NOT NULL,
  "action"       TEXT NOT NULL,
  "resource"     TEXT NOT NULL,
  "granted"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MembershipPermission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MembershipPermission_membershipId_action_resource_key"
    UNIQUE ("membershipId", "action", "resource"),
  CONSTRAINT "MembershipPermission_membershipId_fkey"
    FOREIGN KEY ("membershipId")
    REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MembershipPermission_membershipId_idx"
  ON "MembershipPermission"("membershipId");

-- 7. Create RegistrationRequest table
CREATE TABLE IF NOT EXISTS "RegistrationRequest" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"           TEXT NOT NULL,
  "tenantId"         TEXT NOT NULL,
  "fullName"         TEXT NOT NULL,
  "phone"            TEXT,
  "companyName"      TEXT,
  "requestedRole"    TEXT NOT NULL,
  "status"           "RegistrationRequestStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote"        TEXT,
  "rejectionReason"  TEXT,
  "reviewedByUserId" TEXT,
  "reviewedAt"       TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrationRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RegistrationRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RegistrationRequest_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RegistrationRequest_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "RegistrationRequest_tenantId_status_idx"
  ON "RegistrationRequest"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "RegistrationRequest_userId_idx"
  ON "RegistrationRequest"("userId");
CREATE INDEX IF NOT EXISTS "RegistrationRequest_createdAt_idx"
  ON "RegistrationRequest"("createdAt");
