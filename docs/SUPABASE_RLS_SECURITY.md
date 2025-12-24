# Supabase Row Level Security (RLS) Plan

## Issue Summary

Supabase's database linter detected that Row Level Security (RLS) is disabled on all 19 tables in the `public` schema. This is a security concern because without RLS, tables are accessible via Supabase's PostgREST API.

## Affected Tables

| Table | Category | Risk Level |
|-------|----------|------------|
| `users` | Auth | HIGH |
| `accounts` | Auth | HIGH |
| `sessions` | Auth | HIGH |
| `verification_tokens` | Auth | HIGH |
| `profiles` | User Data | HIGH |
| `studies` | Content | MEDIUM |
| `weeks` | Content | MEDIUM |
| `days` | Content | MEDIUM |
| `questions` | Content | MEDIUM |
| `answers` | User Data | HIGH |
| `prayer_requests` | User Data | HIGH |
| `purchases` | Financial | HIGH |
| `groups` | Community | MEDIUM |
| `group_memberships` | Community | MEDIUM |
| `group_moderators` | Community | MEDIUM |
| `discussion_posts` | Community | MEDIUM |
| `discussion_replies` | Community | MEDIUM |
| `audit_logs` | System | HIGH |
| `_prisma_migrations` | System | LOW |

## Solution Overview

### How Our App Works

This application uses **Prisma** with a **direct PostgreSQL connection** (using the connection string from `DATABASE_URL`). This connection uses a service role or superuser that **bypasses RLS by default**.

This means:
- ✅ The app will continue to work normally after enabling RLS
- ✅ All CRUD operations through Prisma are unaffected
- ✅ RLS only affects direct PostgREST API access (which we don't use)

### What We're Doing

1. **Enable RLS on all tables** - This blocks unauthorized access via PostgREST
2. **Create appropriate policies** - These allow Supabase authenticated users limited access if they were to use the Supabase client directly

## Policy Strategy

### Tables with No PostgREST Access (Fully Restricted)

These tables have RLS enabled with no policies, meaning only the service role can access them:

- `_prisma_migrations` - Internal Prisma table
- `verification_tokens` - Auth tokens (managed by NextAuth)
- `audit_logs` - System audit trail

### User-Owned Data Tables

Users can only access their own records:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `users` | Own only | ❌ | Own only | ❌ |
| `accounts` | Own only | ❌ | ❌ | ❌ |
| `sessions` | Own only | ❌ | ❌ | ❌ |
| `profiles` | Own only | ❌ | Own only | ❌ |
| `answers` | Own only | Own only | Own only | ❌ |
| `prayer_requests` | Own + Public | Own only | Own only | ❌ |
| `purchases` | Own only | ❌ | ❌ | ❌ |

### Content Tables (Studies)

Published content is readable by anyone:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `studies` | Published only | ❌ | ❌ | ❌ |
| `weeks` | Published studies | ❌ | ❌ | ❌ |
| `days` | Published studies | ❌ | ❌ | ❌ |
| `questions` | Published studies | ❌ | ❌ | ❌ |

### Community Tables (Groups)

Group members can access their group's content:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `groups` | Public only | ❌ | ❌ | ❌ |
| `group_memberships` | Own + Group members | ❌ | ❌ | ❌ |
| `group_moderators` | Group members | ❌ | ❌ | ❌ |
| `discussion_posts` | Group members | Group members | Own only | ❌ |
| `discussion_replies` | Group members | Group members | Own only | ❌ |

## How to Apply the Migration

### Option 1: Run via Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `prisma/migrations/20251224_enable_rls/migration.sql`
4. Paste and run the SQL

### Option 2: Run via Prisma Migration

```bash
npx prisma migrate deploy
```

Note: This requires the migration to be properly tracked by Prisma.

### Option 3: Run via psql

```bash
psql $DATABASE_URL -f prisma/migrations/20251224_enable_rls/migration.sql
```

## Verification

After applying the migration, verify RLS is enabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should show `rowsecurity = true`.

## Rollback (If Needed)

To disable RLS on a table (not recommended):

```sql
ALTER TABLE public.table_name DISABLE ROW LEVEL SECURITY;
```

To drop all policies on a table:

```sql
DROP POLICY IF EXISTS policy_name ON public.table_name;
```

## Important Notes

1. **Service Role Bypass**: Prisma connections use the service role which bypasses RLS. This is intentional and allows the application to function normally.

2. **Supabase Client**: If you ever add Supabase client-side SDK usage, these policies will control what data users can access.

3. **Admin Operations**: All admin operations (creating studies, etc.) go through the API routes which use Prisma, so they're unaffected by RLS.

4. **Testing**: After enabling RLS, test all major flows to ensure the application works correctly.

