-- Add DELETE policy for admins on payments table
CREATE POLICY "Admins can delete all payments"
ON public.payments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for users on their own payments
CREATE POLICY "Users can delete their own payments"
ON public.payments
FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policy for users on their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policy for admins on notifications table
CREATE POLICY "Admins can delete all notifications"
ON public.notifications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));