# Exavo AI Demo Accounts

## Admin Account
- **Email:** admin@exavo.ai
- **Password:** Admin2025
- **Access:** Full admin dashboard with user management, bookings, services, and analytics

## Client Account
- **Email:** demo@exavo.ai  
- **Password:** Demo2025
- **Access:** Client portal with services, tickets, dashboard, and profile management

## Setup Instructions

### Creating Demo Accounts

Run these SQL commands in your Supabase SQL Editor or through the backend:

```sql
-- Create admin user (if using Supabase auth, create via signup first, then update role)
INSERT INTO public.user_roles (user_id, role)
VALUES ('admin-user-uuid-here', 'admin');

-- Create client user (if using Supabase auth, create via signup first)
INSERT INTO public.user_roles (user_id, role)
VALUES ('client-user-uuid-here', 'client');
```

## Features to Demo

### Admin Dashboard
- User management (view, edit, delete users)
- Service management (add, edit, delete services)
- Bookings overview and management
- Payment tracking
- Activity logs
- Analytics and reporting

### Client Portal
- Browse and book services
- View service history
- Submit support tickets
- Track orders and payments
- Manage profile settings
- View invoices and proposals

## Notes
- Email verification is enabled - make sure to configure your email provider
- Both accounts have 2FA disabled for easy demo access
- Change passwords after demo if accounts are used in production
- These are test credentials - do not use in production without changing
