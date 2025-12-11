-- ============================================
-- COMPREHENSIVE RLS SECURITY FIX MIGRATION
-- ============================================

-- 1. ACTIVITY_LOGS - Add authenticated SELECT policy
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can view their own activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. NOTIFICATIONS - Fix DELETE policies
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can delete all notifications" ON public.notifications;

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix SELECT/UPDATE to authenticated
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 3. ORDERS - Ensure all policies use authenticated role
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;

CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders"
ON public.orders
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. PAYMENTS - Add admin DELETE and fix role constraints
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete their own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can delete all payments" ON public.payments;

CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payments"
ON public.payments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all payments"
ON public.payments
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. PROFILES - Add DELETE and fix to authenticated
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. CHAT_MESSAGES - Fix UPDATE and SELECT policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages only" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.chat_messages;

CREATE POLICY "Users can view their own messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages only"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. TICKET_REPLIES - Fix UPDATE policy
DROP POLICY IF EXISTS "Users can update their own replies" ON public.ticket_replies;
DROP POLICY IF EXISTS "Users can view replies for their tickets" ON public.ticket_replies;
DROP POLICY IF EXISTS "Admins can view all replies" ON public.ticket_replies;
DROP POLICY IF EXISTS "Users can insert their own replies" ON public.ticket_replies;
DROP POLICY IF EXISTS "Admins can insert replies" ON public.ticket_replies;

CREATE POLICY "Users can update their own replies"
ON public.ticket_replies
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) AND (is_admin = false));

CREATE POLICY "Users can view replies for their tickets"
ON public.ticket_replies
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM tickets
  WHERE tickets.id = ticket_replies.ticket_id
  AND tickets.user_id = auth.uid()
));

CREATE POLICY "Admins can view all replies"
ON public.ticket_replies
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own replies"
ON public.ticket_replies
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) AND (is_admin = false) AND (EXISTS (
  SELECT 1 FROM tickets
  WHERE tickets.id = ticket_replies.ticket_id
  AND tickets.user_id = auth.uid()
)));

CREATE POLICY "Admins can insert replies"
ON public.ticket_replies
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 8. TICKETS - Ensure DELETE and fix to authenticated
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can delete their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;

CREATE POLICY "Users can view their own tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tickets"
ON public.tickets
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tickets"
ON public.tickets
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. WORKSPACES - Add DELETE policy
DROP POLICY IF EXISTS "Users can view their own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update their own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspace" ON public.workspaces;

CREATE POLICY "Users can view their own workspace"
ON public.workspaces
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own workspace"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own workspace"
ON public.workspaces
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- 10. CATEGORIES - Restrict to authenticated
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Authenticated users can view categories"
ON public.categories
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 11. SERVICE_PACKAGES - Restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view packages for active services" ON public.service_packages;
DROP POLICY IF EXISTS "Admins can manage packages" ON public.service_packages;

CREATE POLICY "Authenticated users can view packages for active services"
ON public.service_packages
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM services
  WHERE services.id = service_packages.service_id
  AND services.active = true
));

CREATE POLICY "Admins can manage packages"
ON public.service_packages
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 12. SERVICES - Restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;

CREATE POLICY "Authenticated users can view active services"
ON public.services
FOR SELECT
TO authenticated
USING (active = true);

CREATE POLICY "Admins can manage services"
ON public.services
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 13. SITE_SETTINGS - Restrict to authenticated
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can modify settings" ON public.site_settings;

CREATE POLICY "Authenticated users can view settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can modify settings"
ON public.site_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 14. Fix remaining tables to use authenticated role consistently

-- USER_ROLES
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- APPOINTMENTS
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can create their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can update all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can delete all appointments" ON public.appointments;

CREATE POLICY "Users can view their own appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- PAYMENT_METHODS
DROP POLICY IF EXISTS "Users can view their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can insert their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update their own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete their own payment methods" ON public.payment_methods;

CREATE POLICY "Users can view their own payment methods"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods"
ON public.payment_methods
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods"
ON public.payment_methods
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods"
ON public.payment_methods
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- TEAM_MEMBERS
DROP POLICY IF EXISTS "Users can view their team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can insert their own team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can update their team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can delete their team members" ON public.team_members;

CREATE POLICY "Users can view their team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (auth.uid() = organization_id);

CREATE POLICY "Users can insert their own team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = organization_id);

CREATE POLICY "Users can update their team members"
ON public.team_members
FOR UPDATE
TO authenticated
USING (auth.uid() = organization_id);

CREATE POLICY "Users can delete their team members"
ON public.team_members
FOR DELETE
TO authenticated
USING (auth.uid() = organization_id);

-- USER_FILES
DROP POLICY IF EXISTS "Users can view their own files" ON public.user_files;
DROP POLICY IF EXISTS "Users can insert their own files" ON public.user_files;
DROP POLICY IF EXISTS "Users can update their own files" ON public.user_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.user_files;

CREATE POLICY "Users can view their own files"
ON public.user_files
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
ON public.user_files
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
ON public.user_files
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
ON public.user_files
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- PROJECTS
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

CREATE POLICY "Users can view their own projects"
ON public.projects
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
ON public.projects
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- WORKSPACE_PERMISSIONS
DROP POLICY IF EXISTS "Workspace owners can view their permissions" ON public.workspace_permissions;
DROP POLICY IF EXISTS "Workspace owners can manage their permissions" ON public.workspace_permissions;

CREATE POLICY "Workspace owners can view their permissions"
ON public.workspace_permissions
FOR SELECT
TO authenticated
USING (auth.uid() = organization_id);

CREATE POLICY "Workspace owners can manage their permissions"
ON public.workspace_permissions
FOR ALL
TO authenticated
USING (auth.uid() = organization_id);