-- Step 1: Add new columns (nullable first)
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "studyId" TEXT;
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "inviteCode" TEXT;
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "inviteEnabled" BOOLEAN DEFAULT true;

-- Step 2: Populate inviteCode for existing groups (if any)
-- Generate unique invite codes for existing groups
DO $$
DECLARE
    group_record RECORD;
    new_code TEXT;
    code_exists BOOLEAN;
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    i INTEGER;
BEGIN
    FOR group_record IN SELECT id FROM "groups" WHERE "inviteCode" IS NULL LOOP
        LOOP
            new_code := '';
            FOR i IN 1..8 LOOP
                new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
            END LOOP;
            
            SELECT EXISTS(SELECT 1 FROM "groups" WHERE "inviteCode" = new_code) INTO code_exists;
            EXIT WHEN NOT code_exists;
        END LOOP;
        
        UPDATE "groups" SET "inviteCode" = new_code WHERE id = group_record.id;
    END LOOP;
END $$;

-- Step 3: Set default values for existing groups
UPDATE "groups" SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE "groups" SET "inviteEnabled" = true WHERE "inviteEnabled" IS NULL;

-- Step 4: Add foreign key constraints
-- Note: If there are existing groups, you may need to delete them first or populate studyId/ownerId
-- Check for existing groups: SELECT COUNT(*) FROM "groups";
-- If count > 0, either delete them or update them with valid studyId/ownerId before running this migration
ALTER TABLE "groups" ADD CONSTRAINT IF NOT EXISTS "groups_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "groups" ADD CONSTRAINT IF NOT EXISTS "groups_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Make inviteCode NOT NULL and UNIQUE
ALTER TABLE "groups" ALTER COLUMN "inviteCode" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "groups_inviteCode_key" ON "groups"("inviteCode");

-- Step 6: Add indexes
CREATE INDEX IF NOT EXISTS "groups_studyId_idx" ON "groups"("studyId");
CREATE INDEX IF NOT EXISTS "groups_ownerId_idx" ON "groups"("ownerId");
CREATE INDEX IF NOT EXISTS "groups_inviteCode_idx" ON "groups"("inviteCode");
CREATE INDEX IF NOT EXISTS "groups_isActive_idx" ON "groups"("isActive");

