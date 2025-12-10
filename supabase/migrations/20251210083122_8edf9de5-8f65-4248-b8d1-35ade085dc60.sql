-- 1️⃣ Add Missing RLS Policies

-- activity_logs: Allow users to SELECT their own logs
CREATE POLICY "Users can view their own activity logs"
ON public.activity_logs
FOR SELECT
USING (auth.uid() = user_id);

-- orders: Allow users to DELETE their own orders
CREATE POLICY "Users can delete their own orders"
ON public.orders
FOR DELETE
USING (auth.uid() = user_id);

-- profiles: Allow users to DELETE their own profile
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);

-- chat_messages: Allow users to UPDATE their own messages
CREATE POLICY "Users can update their own messages"
ON public.chat_messages
FOR UPDATE
USING (auth.uid() = user_id);

-- ticket_replies: Allow users to UPDATE their own replies
CREATE POLICY "Users can update their own replies"
ON public.ticket_replies
FOR UPDATE
USING ((auth.uid() = user_id) AND (is_admin = false));

-- tickets: Allow users to DELETE their own tickets
CREATE POLICY "Users can delete their own tickets"
ON public.tickets
FOR DELETE
USING (auth.uid() = user_id);

-- workspaces: Allow owners to DELETE their own workspace
CREATE POLICY "Users can delete their own workspace"
ON public.workspaces
FOR DELETE
USING (auth.uid() = owner_id);

-- 2️⃣ Restrict Sensitive Tables (Replace SELECT true with authenticated-only)

-- categories: Drop the public SELECT policy and replace with authenticated
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Authenticated users can view categories"
ON public.categories
FOR SELECT
TO authenticated
USING (true);

-- site_settings: Drop the public SELECT policy and replace with authenticated
DROP POLICY IF EXISTS "Anyone can view settings" ON public.site_settings;
CREATE POLICY "Authenticated users can view settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (true);