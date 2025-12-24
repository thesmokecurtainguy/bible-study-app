-- Enable Row Level Security (RLS) on all tables
-- This protects tables from direct access via Supabase's PostgREST API
-- The application uses Prisma with a direct connection (service role) which bypasses RLS

-- ============================================
-- STEP 1: Enable RLS on all tables
-- ============================================

-- Core auth tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Study content tables
ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Community tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;

-- Other tables
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Prisma internal table (restrict completely from PostgREST)
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Create policies for service role access
-- The service role (used by Prisma) bypasses RLS by default
-- These policies allow authenticated Supabase users appropriate access
-- ============================================

-- === USERS TABLE ===
-- Users can read their own data
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT USING (auth.uid()::text = id);

-- Users can update their own data
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (auth.uid()::text = id);

-- === ACCOUNTS TABLE ===
-- Users can read their own accounts
CREATE POLICY "accounts_select_own" ON public.accounts
    FOR SELECT USING (auth.uid()::text = "userId");

-- === SESSIONS TABLE ===
-- Users can read their own sessions
CREATE POLICY "sessions_select_own" ON public.sessions
    FOR SELECT USING (auth.uid()::text = "userId");

-- === PROFILES TABLE ===
-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid()::text = "userId");

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid()::text = "userId");

-- === STUDIES TABLE ===
-- Anyone can read published studies
CREATE POLICY "studies_select_published" ON public.studies
    FOR SELECT USING ("isPublished" = true);

-- === WEEKS TABLE ===
-- Anyone can read weeks of published studies
CREATE POLICY "weeks_select_published" ON public.weeks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.studies 
            WHERE studies.id = weeks."studyId" 
            AND studies."isPublished" = true
        )
    );

-- === DAYS TABLE ===
-- Anyone can read days of published studies
CREATE POLICY "days_select_published" ON public.days
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.weeks
            JOIN public.studies ON studies.id = weeks."studyId"
            WHERE weeks.id = days."weekId"
            AND studies."isPublished" = true
        )
    );

-- === QUESTIONS TABLE ===
-- Anyone can read questions of published studies
CREATE POLICY "questions_select_published" ON public.questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.days
            JOIN public.weeks ON weeks.id = days."weekId"
            JOIN public.studies ON studies.id = weeks."studyId"
            WHERE days.id = questions."dayId"
            AND studies."isPublished" = true
        )
    );

-- === ANSWERS TABLE ===
-- Users can read their own answers
CREATE POLICY "answers_select_own" ON public.answers
    FOR SELECT USING (auth.uid()::text = "userId");

-- Users can insert their own answers
CREATE POLICY "answers_insert_own" ON public.answers
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- Users can update their own answers
CREATE POLICY "answers_update_own" ON public.answers
    FOR UPDATE USING (auth.uid()::text = "userId");

-- === PRAYER REQUESTS TABLE ===
-- Users can read their own prayer requests
CREATE POLICY "prayer_requests_select_own" ON public.prayer_requests
    FOR SELECT USING (auth.uid()::text = "userId");

-- Users can read public prayer requests
CREATE POLICY "prayer_requests_select_public" ON public.prayer_requests
    FOR SELECT USING ("isPublic" = true);

-- Users can insert their own prayer requests
CREATE POLICY "prayer_requests_insert_own" ON public.prayer_requests
    FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- Users can update their own prayer requests
CREATE POLICY "prayer_requests_update_own" ON public.prayer_requests
    FOR UPDATE USING (auth.uid()::text = "userId");

-- === PURCHASES TABLE ===
-- Users can read their own purchases
CREATE POLICY "purchases_select_own" ON public.purchases
    FOR SELECT USING (auth.uid()::text = "userId");

-- === GROUPS TABLE ===
-- Anyone can read public groups
CREATE POLICY "groups_select_public" ON public.groups
    FOR SELECT USING ("isPublic" = true);

-- === GROUP MEMBERSHIPS TABLE ===
-- Users can read their own memberships
CREATE POLICY "group_memberships_select_own" ON public.group_memberships
    FOR SELECT USING (auth.uid()::text = "userId");

-- Members can see other members of their groups
CREATE POLICY "group_memberships_select_group_members" ON public.group_memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships gm
            WHERE gm."groupId" = group_memberships."groupId"
            AND gm."userId" = auth.uid()::text
        )
    );

-- === GROUP MODERATORS TABLE ===
-- Users can see moderators of groups they belong to
CREATE POLICY "group_moderators_select_members" ON public.group_moderators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships gm
            WHERE gm."groupId" = group_moderators."groupId"
            AND gm."userId" = auth.uid()::text
        )
    );

-- === DISCUSSION POSTS TABLE ===
-- Users can read posts in groups they belong to
CREATE POLICY "discussion_posts_select_group_members" ON public.discussion_posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships gm
            WHERE gm."groupId" = discussion_posts."groupId"
            AND gm."userId" = auth.uid()::text
        )
    );

-- Users can insert posts in groups they belong to
CREATE POLICY "discussion_posts_insert_group_members" ON public.discussion_posts
    FOR INSERT WITH CHECK (
        auth.uid()::text = "userId" AND
        EXISTS (
            SELECT 1 FROM public.group_memberships gm
            WHERE gm."groupId" = discussion_posts."groupId"
            AND gm."userId" = auth.uid()::text
        )
    );

-- Users can update their own posts
CREATE POLICY "discussion_posts_update_own" ON public.discussion_posts
    FOR UPDATE USING (auth.uid()::text = "userId");

-- === DISCUSSION REPLIES TABLE ===
-- Users can read replies in groups they belong to
CREATE POLICY "discussion_replies_select_group_members" ON public.discussion_replies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.discussion_posts dp
            JOIN public.group_memberships gm ON gm."groupId" = dp."groupId"
            WHERE dp.id = discussion_replies."postId"
            AND gm."userId" = auth.uid()::text
        )
    );

-- Users can insert replies to posts in their groups
CREATE POLICY "discussion_replies_insert_group_members" ON public.discussion_replies
    FOR INSERT WITH CHECK (
        auth.uid()::text = "userId" AND
        EXISTS (
            SELECT 1 FROM public.discussion_posts dp
            JOIN public.group_memberships gm ON gm."groupId" = dp."groupId"
            WHERE dp.id = discussion_replies."postId"
            AND gm."userId" = auth.uid()::text
        )
    );

-- Users can update their own replies
CREATE POLICY "discussion_replies_update_own" ON public.discussion_replies
    FOR UPDATE USING (auth.uid()::text = "userId");

-- === AUDIT LOGS TABLE ===
-- No direct access via PostgREST - only service role
-- (No policies needed - RLS enabled means no access by default)

-- === VERIFICATION TOKENS TABLE ===
-- No direct access via PostgREST - only service role
-- (No policies needed - RLS enabled means no access by default)

-- === PRISMA MIGRATIONS TABLE ===
-- No direct access via PostgREST - only service role
-- (No policies needed - RLS enabled means no access by default)

