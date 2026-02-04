/**
 * Notification Route Resolver
 * 
 * Provides safe routing for notification clicks by validating routes
 * and redirecting to appropriate fallbacks based on user role.
 */

// Define known client routes for validation
const CLIENT_ROUTES = [
  '/client/dashboard',
  '/client/projects',
  '/client/billing',
  '/client/tickets',
  '/client/services',
  '/client/consultations',
  '/client/team',
  '/client/settings',
  '/client/files',
  '/client/orders',
  '/client/workspace',
];

// Admin routes that clients cannot access
const ADMIN_ONLY_ROUTES = [
  '/admin',
  '/admin/dashboard',
  '/admin/users',
  '/admin/bookings',
  '/admin/services',
  '/admin/projects',
  '/admin/tickets',
  '/admin/payments',
  '/admin/leads',
  '/admin/reviews',
  '/admin/blog',
  '/admin/case-studies',
  '/admin/settings',
  '/admin/approvals',
  '/admin/work',
];

// Route patterns for entity types
const ENTITY_ROUTE_PATTERNS = {
  project: {
    client: '/client/projects',
    admin: '/admin/projects',
  },
  delivery: {
    client: '/client/projects',
    admin: '/admin/projects',
  },
  subscription: {
    client: '/client/billing',
    admin: '/admin/payments',
  },
  payment: {
    client: '/client/billing',
    admin: '/admin/payments',
  },
  ticket: {
    client: '/client/tickets',
    admin: '/admin/tickets',
  },
  booking: {
    client: '/client/consultations',
    admin: '/admin/bookings',
  },
  lead: {
    client: '/client/dashboard',
    admin: '/admin/leads',
  },
  user: {
    client: '/client/dashboard',
    admin: '/admin/users',
  },
  review: {
    client: '/client/dashboard',
    admin: '/admin/reviews',
  },
};

// Default fallbacks
const CLIENT_FALLBACK = '/client/dashboard';
const ADMIN_FALLBACK = '/admin/dashboard';

export type UserRole = 'client' | 'admin';

interface NotificationContext {
  link: string | null | undefined;
  eventType?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Extracts entity information from notification data
 */
function extractEntityInfo(notification: NotificationContext): {
  entityType: string | null;
  entityId: string | null;
} {
  // Try to get from explicit fields
  if (notification.entityType) {
    return {
      entityType: notification.entityType,
      entityId: notification.entityId || null,
    };
  }

  // Try to infer from event_type
  if (notification.eventType) {
    const eventType = notification.eventType.toLowerCase();
    
    if (eventType.includes('project')) return { entityType: 'project', entityId: null };
    if (eventType.includes('delivery')) return { entityType: 'delivery', entityId: null };
    if (eventType.includes('subscription')) return { entityType: 'subscription', entityId: null };
    if (eventType.includes('payment')) return { entityType: 'payment', entityId: null };
    if (eventType.includes('ticket')) return { entityType: 'ticket', entityId: null };
    if (eventType.includes('booking')) return { entityType: 'booking', entityId: null };
    if (eventType.includes('lead')) return { entityType: 'lead', entityId: null };
    if (eventType.includes('review')) return { entityType: 'review', entityId: null };
  }

  // Try to infer from link path
  if (notification.link) {
    const link = notification.link.toLowerCase();
    
    if (link.includes('/project')) return { entityType: 'project', entityId: extractIdFromPath(notification.link) };
    if (link.includes('/ticket')) return { entityType: 'ticket', entityId: extractIdFromPath(notification.link) };
    if (link.includes('/billing') || link.includes('/payment')) return { entityType: 'payment', entityId: null };
    if (link.includes('/booking') || link.includes('/consultation')) return { entityType: 'booking', entityId: null };
    if (link.includes('/deliver')) return { entityType: 'delivery', entityId: null };
  }

  return { entityType: null, entityId: null };
}

/**
 * Extracts UUID from a path string
 */
function extractIdFromPath(path: string): string | null {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = path.match(uuidRegex);
  return match ? match[0] : null;
}

/**
 * Checks if a route is accessible to a client user
 */
function isClientAccessible(path: string): boolean {
  // Normalize path
  const normalizedPath = path.toLowerCase().split('?')[0];
  
  // Check if it's an admin-only route
  if (ADMIN_ONLY_ROUTES.some(route => normalizedPath.startsWith(route.toLowerCase()))) {
    return false;
  }
  
  // Check if it's a known client route
  if (CLIENT_ROUTES.some(route => normalizedPath.startsWith(route.toLowerCase()))) {
    return true;
  }
  
  // Check for dynamic client routes (e.g., /client/projects/uuid)
  if (normalizedPath.startsWith('/client/')) {
    return true;
  }
  
  // Public routes are accessible
  if (normalizedPath === '/' || 
      normalizedPath.startsWith('/services') ||
      normalizedPath.startsWith('/about') ||
      normalizedPath.startsWith('/blog') ||
      normalizedPath.startsWith('/contact') ||
      normalizedPath.startsWith('/case-studies') ||
      normalizedPath.startsWith('/case-study/')) {
    return true;
  }
  
  return false;
}

/**
 * Gets the safe fallback route based on entity type and role
 */
function getSafeFallback(entityType: string | null, role: UserRole, entityId?: string | null): string {
  const fallbackMap = role === 'admin' ? 'admin' : 'client';
  
  if (entityType && entityType in ENTITY_ROUTE_PATTERNS) {
    const pattern = ENTITY_ROUTE_PATTERNS[entityType as keyof typeof ENTITY_ROUTE_PATTERNS];
    const basePath = pattern[fallbackMap];
    
    // For project/delivery entities, append the project ID if available
    if ((entityType === 'project' || entityType === 'delivery') && entityId) {
      return `${basePath}/${entityId}`;
    }
    
    return basePath;
  }
  
  return role === 'admin' ? ADMIN_FALLBACK : CLIENT_FALLBACK;
}

/**
 * Resolves the safe route for a notification click
 * 
 * @param notification - The notification context containing link and metadata
 * @param userRole - The current user's role (client or admin)
 * @returns The safe route to navigate to
 */
export function resolveNotificationRoute(
  notification: NotificationContext,
  userRole: UserRole
): string {
  const { link } = notification;
  
  // No link provided - use fallback
  if (!link) {
    const { entityType, entityId } = extractEntityInfo(notification);
    return getSafeFallback(entityType, userRole, entityId);
  }
  
  // Admin users get full access
  if (userRole === 'admin') {
    return link;
  }
  
  // For client users, validate the route
  if (isClientAccessible(link)) {
    return link;
  }
  
  // Route is not accessible - find safe fallback
  const { entityType, entityId } = extractEntityInfo(notification);
  
  // If the link points to an admin route, try to map to equivalent client route
  if (link.startsWith('/admin/projects/') || link.includes('/admin/project')) {
    const projectId = extractIdFromPath(link);
    if (projectId) {
      return `/client/projects/${projectId}`;
    }
    return '/client/projects';
  }
  
  if (link.startsWith('/admin/tickets/') || link.includes('/admin/ticket')) {
    const ticketId = extractIdFromPath(link);
    if (ticketId) {
      return `/client/tickets/${ticketId}`;
    }
    return '/client/tickets';
  }
  
  if (link.includes('/admin/payments') || link.includes('/admin/billing')) {
    return '/client/billing';
  }
  
  if (link.includes('/admin/bookings') || link.includes('/admin/consultation')) {
    return '/client/consultations';
  }
  
  // Use entity-based fallback
  return getSafeFallback(entityType, userRole, entityId);
}

/**
 * Creates a notification click handler with safe routing
 */
export function createSafeNotificationHandler(
  navigate: (path: string) => void,
  userRole: UserRole
) {
  return (notification: NotificationContext) => {
    const safeRoute = resolveNotificationRoute(notification, userRole);
    navigate(safeRoute);
  };
}
