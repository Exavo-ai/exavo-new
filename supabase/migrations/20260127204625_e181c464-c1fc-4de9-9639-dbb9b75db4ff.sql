-- Extend notifications table with event-driven columns
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'client',
ADD COLUMN IF NOT EXISTS event_type text,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
ADD COLUMN IF NOT EXISTS read_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS actor_id uuid,
ADD COLUMN IF NOT EXISTS entity_type text,
ADD COLUMN IF NOT EXISTS entity_id uuid,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_event_type ON public.notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Create a function to emit notifications (callable from triggers and edge functions)
CREATE OR REPLACE FUNCTION public.emit_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_event_type text DEFAULT NULL,
  p_priority text DEFAULT 'normal',
  p_link text DEFAULT NULL,
  p_role text DEFAULT 'client',
  p_actor_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  -- Prevent self-notifications (user triggered their own action)
  IF p_actor_id IS NOT NULL AND p_actor_id = p_user_id THEN
    RETURN NULL;
  END IF;

  -- Check for duplicate within last 5 minutes (deduplication)
  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = p_user_id
      AND event_type = p_event_type
      AND entity_type = p_entity_type
      AND entity_id = p_entity_id
      AND created_at > now() - interval '5 minutes'
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO notifications (
    user_id, title, message, event_type, priority, link, role,
    actor_id, entity_type, entity_id, metadata, read
  ) VALUES (
    p_user_id, p_title, p_message, p_event_type, p_priority, p_link, p_role,
    p_actor_id, p_entity_type, p_entity_id, p_metadata, false
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Function to notify all admins
CREATE OR REPLACE FUNCTION public.notify_all_admins(
  p_title text,
  p_message text,
  p_event_type text,
  p_priority text DEFAULT 'normal',
  p_link text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  FOR v_admin_id IN 
    SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    PERFORM emit_notification(
      v_admin_id, p_title, p_message, p_event_type, p_priority, p_link, 'admin',
      p_actor_id, p_entity_type, p_entity_id, p_metadata
    );
  END LOOP;
END;
$$;

-- Trigger function for project status changes
CREATE OR REPLACE FUNCTION public.trigger_project_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_client_id uuid;
BEGIN
  v_actor_id := auth.uid();
  v_client_id := COALESCE(NEW.client_id, NEW.user_id);

  -- Project created
  IF TG_OP = 'INSERT' THEN
    -- Notify admins
    PERFORM notify_all_admins(
      'New Project Created',
      format('Project "%s" has been created', NEW.name),
      'PROJECT_CREATED', 'normal',
      format('/admin/projects/%s', NEW.id),
      v_actor_id, 'project', NEW.id,
      jsonb_build_object('project_name', NEW.name)
    );
    
    -- Notify client
    PERFORM emit_notification(
      v_client_id,
      'Project Started',
      format('Your project "%s" is now active', NEW.name),
      'PROJECT_CREATED', 'normal',
      format('/portal/projects/%s', NEW.id),
      'client', v_actor_id, 'project', NEW.id,
      jsonb_build_object('project_name', NEW.name)
    );
  END IF;

  -- Project status changed
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify client of status change
    PERFORM emit_notification(
      v_client_id,
      'Project Status Updated',
      format('Your project "%s" is now %s', NEW.name, NEW.status),
      'PROJECT_STATUS_CHANGED', 'normal',
      format('/portal/projects/%s', NEW.id),
      'client', v_actor_id, 'project', NEW.id,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );

    -- If completed, high priority notification
    IF NEW.status = 'completed' THEN
      PERFORM emit_notification(
        v_client_id,
        'Project Completed!',
        format('Your project "%s" has been completed', NEW.name),
        'PROJECT_COMPLETED', 'high',
        format('/portal/projects/%s', NEW.id),
        'client', v_actor_id, 'project', NEW.id,
        jsonb_build_object('project_name', NEW.name)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function for deliveries
CREATE OR REPLACE FUNCTION public.trigger_delivery_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project record;
  v_client_id uuid;
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  
  SELECT * INTO v_project FROM projects WHERE id = NEW.project_id;
  v_client_id := COALESCE(v_project.client_id, v_project.user_id);

  -- New delivery
  IF TG_OP = 'INSERT' THEN
    PERFORM emit_notification(
      v_client_id,
      'New Delivery Available',
      format('A new delivery is ready for project "%s"', v_project.name),
      'DELIVERY_CREATED', 'high',
      format('/portal/projects/%s', v_project.id),
      'client', v_actor_id, 'delivery', NEW.id,
      jsonb_build_object('project_name', v_project.name)
    );
  END IF;

  -- Delivery status changed
  IF TG_OP = 'UPDATE' THEN
    -- Approved
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN
      PERFORM notify_all_admins(
        'Delivery Approved',
        format('Client approved delivery for project "%s"', v_project.name),
        'DELIVERY_APPROVED', 'normal',
        format('/admin/projects/%s', v_project.id),
        v_actor_id, 'delivery', NEW.id,
        jsonb_build_object('project_name', v_project.name)
      );
    END IF;

    -- Revision requested
    IF NEW.revision_requested = true AND OLD.revision_requested = false THEN
      PERFORM notify_all_admins(
        'Revision Requested',
        format('Client requested revision for project "%s": %s', v_project.name, COALESCE(NEW.revision_notes, 'No notes')),
        'REVISION_REQUESTED', 'high',
        format('/admin/projects/%s', v_project.id),
        v_actor_id, 'delivery', NEW.id,
        jsonb_build_object('project_name', v_project.name, 'notes', NEW.revision_notes)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function for tickets
CREATE OR REPLACE FUNCTION public.trigger_ticket_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();

  -- New ticket
  IF TG_OP = 'INSERT' THEN
    PERFORM notify_all_admins(
      'New Support Ticket',
      format('New ticket: %s', NEW.subject),
      'TICKET_CREATED',
      CASE WHEN NEW.priority = 'high' THEN 'high' ELSE 'normal' END,
      format('/admin/tickets?id=%s', NEW.id),
      v_actor_id, 'ticket', NEW.id,
      jsonb_build_object('subject', NEW.subject, 'priority', NEW.priority)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function for ticket replies
CREATE OR REPLACE FUNCTION public.trigger_ticket_reply_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket record;
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  
  SELECT * INTO v_ticket FROM tickets WHERE id = NEW.ticket_id;

  -- Admin replied, notify client
  IF NEW.is_admin = true THEN
    PERFORM emit_notification(
      v_ticket.user_id,
      'New Reply on Your Ticket',
      format('Admin replied to: %s', v_ticket.subject),
      'TICKET_REPLIED', 'normal',
      format('/portal/tickets/%s', v_ticket.id),
      'client', v_actor_id, 'ticket', v_ticket.id,
      jsonb_build_object('subject', v_ticket.subject)
    );
  ELSE
    -- Client replied, notify admins
    PERFORM notify_all_admins(
      'Client Replied to Ticket',
      format('New reply on ticket: %s', v_ticket.subject),
      'TICKET_REPLIED', 'normal',
      format('/admin/tickets?id=%s', v_ticket.id),
      v_actor_id, 'ticket', v_ticket.id,
      jsonb_build_object('subject', v_ticket.subject)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function for project comments
CREATE OR REPLACE FUNCTION public.trigger_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project record;
  v_client_id uuid;
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  
  SELECT * INTO v_project FROM projects WHERE id = NEW.project_id;
  v_client_id := COALESCE(v_project.client_id, v_project.user_id);

  -- Admin commented, notify client
  IF NEW.author_role = 'admin' THEN
    PERFORM emit_notification(
      v_client_id,
      'New Comment on Project',
      format('Admin commented on "%s"', v_project.name),
      'COMMENT_ADDED', 'normal',
      format('/portal/projects/%s', v_project.id),
      'client', v_actor_id, 'project_comment', NEW.id,
      jsonb_build_object('project_name', v_project.name)
    );
  ELSE
    -- Client commented, notify admins
    PERFORM notify_all_admins(
      'Client Commented',
      format('New comment on project "%s"', v_project.name),
      'COMMENT_ADDED', 'normal',
      format('/admin/projects/%s', v_project.id),
      v_actor_id, 'project_comment', NEW.id,
      jsonb_build_object('project_name', v_project.name)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function for subscription changes
CREATE OR REPLACE FUNCTION public.trigger_subscription_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project record;
  v_client_id uuid;
  v_event_type text;
  v_title text;
  v_message text;
  v_priority text := 'normal';
BEGIN
  SELECT * INTO v_project FROM projects WHERE id = NEW.project_id;
  v_client_id := COALESCE(v_project.client_id, v_project.user_id);

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'active' THEN
        IF OLD.status = 'paused' THEN
          v_event_type := 'SUBSCRIPTION_RESUMED';
          v_title := 'Subscription Resumed';
          v_message := format('Subscription for "%s" has been resumed', v_project.name);
        ELSE
          v_event_type := 'SUBSCRIPTION_ACTIVATED';
          v_title := 'Subscription Activated';
          v_message := format('Subscription for "%s" is now active', v_project.name);
        END IF;
      WHEN 'paused' THEN
        v_event_type := 'SUBSCRIPTION_PAUSED';
        v_title := 'Subscription Paused';
        v_message := format('Subscription for "%s" has been paused', v_project.name);
      WHEN 'canceled' THEN
        v_event_type := 'SUBSCRIPTION_CANCELED';
        v_title := 'Subscription Canceled';
        v_message := format('Subscription for "%s" has been canceled', v_project.name);
        v_priority := 'high';
      WHEN 'past_due' THEN
        v_event_type := 'PAYMENT_FAILED';
        v_title := 'Payment Failed';
        v_message := format('Payment failed for project "%s". Please update your payment method.', v_project.name);
        v_priority := 'high';
      ELSE
        RETURN NEW;
    END CASE;

    -- Notify client
    PERFORM emit_notification(
      v_client_id, v_title, v_message, v_event_type, v_priority,
      format('/portal/projects/%s', v_project.id),
      'client', NULL, 'subscription', NEW.id,
      jsonb_build_object('project_name', v_project.name, 'status', NEW.status)
    );

    -- Notify admins for important events
    IF v_priority = 'high' THEN
      PERFORM notify_all_admins(
        v_title, v_message, v_event_type, v_priority,
        format('/admin/projects/%s', v_project.id),
        NULL, 'subscription', NEW.id,
        jsonb_build_object('project_name', v_project.name, 'client_id', v_client_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the triggers
DROP TRIGGER IF EXISTS trg_project_notification ON projects;
CREATE TRIGGER trg_project_notification
  AFTER INSERT OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION trigger_project_notification();

DROP TRIGGER IF EXISTS trg_delivery_notification ON deliveries;
CREATE TRIGGER trg_delivery_notification
  AFTER INSERT OR UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION trigger_delivery_notification();

DROP TRIGGER IF EXISTS trg_ticket_notification ON tickets;
CREATE TRIGGER trg_ticket_notification
  AFTER INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION trigger_ticket_notification();

DROP TRIGGER IF EXISTS trg_ticket_reply_notification ON ticket_replies;
CREATE TRIGGER trg_ticket_reply_notification
  AFTER INSERT ON ticket_replies
  FOR EACH ROW EXECUTE FUNCTION trigger_ticket_reply_notification();

DROP TRIGGER IF EXISTS trg_comment_notification ON project_comments;
CREATE TRIGGER trg_comment_notification
  AFTER INSERT ON project_comments
  FOR EACH ROW EXECUTE FUNCTION trigger_comment_notification();

DROP TRIGGER IF EXISTS trg_subscription_notification ON project_subscriptions;
CREATE TRIGGER trg_subscription_notification
  AFTER UPDATE ON project_subscriptions
  FOR EACH ROW EXECUTE FUNCTION trigger_subscription_notification();

-- Update RLS policy to allow admins to view all notifications for their role
CREATE POLICY "Admins can view all admin notifications" 
ON public.notifications 
FOR SELECT 
USING (has_role(auth.uid(), 'admin') AND role = 'admin');

-- Allow service role to insert for system alerts
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.emit_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.emit_notification TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_all_admins TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_all_admins TO service_role;