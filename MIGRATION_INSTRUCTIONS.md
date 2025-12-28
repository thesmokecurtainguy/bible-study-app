# Database Migration Instructions

## Issue
The production database doesn't have the new Group fields (`studyId`, `ownerId`, `inviteCode`, etc.) that were added in Phase 4. This is causing runtime errors.

## Solution Options

### Option 1: Use Prisma DB Push (Recommended - Simplest)

This will sync your schema to the database automatically:

```bash
# Make sure you have your production DATABASE_URL set
# Get it from Vercel dashboard -> Settings -> Environment Variables

# Set the production database URL temporarily
export DATABASE_URL="your-production-database-url-from-vercel"

# Push the schema changes
npx prisma db push

# Or if you have it in a .env file:
npx prisma db push
```

### Option 2: Run Migration Manually

If you prefer to use migrations:

```bash
# Set production database URL
export DATABASE_URL="your-production-database-url-from-vercel"

# Deploy migrations
npx prisma migrate deploy
```

### Option 3: Run Migration SQL Directly

If you have direct database access, you can run the migration SQL file directly:

1. Get your production DATABASE_URL from Vercel
2. Connect to your Supabase database
3. Run the SQL from `prisma/migrations/20250101_add_group_fields/migration.sql`

## Important Notes

- **If you have existing groups in production**, you'll need to either:
  - Delete them first (if they're test data)
  - Or populate `studyId` and `ownerId` for them before running the migration

- **To check for existing groups**:
  ```sql
  SELECT COUNT(*) FROM "groups";
  ```

- **To delete existing groups** (if safe to do so):
  ```sql
  DELETE FROM "groups";
  ```

## After Migration

Once the migration is complete, your Vercel deployment should work correctly. The error should disappear once the database schema matches the code.

