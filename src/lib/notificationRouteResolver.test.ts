import { describe, it, expect } from "vitest";
import { resolveNotificationRoute } from "./notificationRouteResolver";

describe("notificationRouteResolver", () => {
  describe("resolveNotificationRoute for client users", () => {
    it("should return client dashboard when no link is provided", () => {
      const result = resolveNotificationRoute(
        { link: null },
        "client"
      );
      expect(result).toBe("/client/dashboard");
    });

    it("should allow valid client routes", () => {
      const result = resolveNotificationRoute(
        { link: "/client/projects/123" },
        "client"
      );
      expect(result).toBe("/client/projects/123");
    });

    it("should redirect admin project routes to client project routes", () => {
      const result = resolveNotificationRoute(
        { link: "/admin/projects/550e8400-e29b-41d4-a716-446655440000" },
        "client"
      );
      expect(result).toBe("/client/projects/550e8400-e29b-41d4-a716-446655440000");
    });

    it("should redirect admin ticket routes to client ticket routes", () => {
      const result = resolveNotificationRoute(
        { link: "/admin/tickets/550e8400-e29b-41d4-a716-446655440000" },
        "client"
      );
      expect(result).toBe("/client/tickets/550e8400-e29b-41d4-a716-446655440000");
    });

    it("should redirect admin payments to client billing", () => {
      const result = resolveNotificationRoute(
        { link: "/admin/payments" },
        "client"
      );
      expect(result).toBe("/client/billing");
    });

    it("should redirect admin bookings to client consultations", () => {
      const result = resolveNotificationRoute(
        { link: "/admin/bookings" },
        "client"
      );
      expect(result).toBe("/client/consultations");
    });

    it("should use entity-based fallback when admin route without equivalent", () => {
      const result = resolveNotificationRoute(
        { link: "/admin/users", eventType: "project.created" },
        "client"
      );
      expect(result).toBe("/client/projects");
    });

    it("should fallback to dashboard for unknown admin routes", () => {
      const result = resolveNotificationRoute(
        { link: "/admin/settings" },
        "client"
      );
      expect(result).toBe("/client/dashboard");
    });

    it("should allow public routes", () => {
      const result = resolveNotificationRoute(
        { link: "/services/ai-chatbot" },
        "client"
      );
      expect(result).toBe("/services/ai-chatbot");
    });

    it("should allow case-studies public routes", () => {
      const result = resolveNotificationRoute(
        { link: "/case-studies" },
        "client"
      );
      expect(result).toBe("/case-studies");
    });

    it("should infer fallback from event_type when link is missing", () => {
      const result = resolveNotificationRoute(
        { link: null, eventType: "subscription.canceled" },
        "client"
      );
      expect(result).toBe("/client/billing");
    });

    it("should infer fallback from entity_type", () => {
      const result = resolveNotificationRoute(
        { link: null, entityType: "ticket", entityId: "123" },
        "client"
      );
      expect(result).toBe("/client/tickets");
    });
  });

  describe("resolveNotificationRoute for admin users", () => {
    it("should allow all routes for admin users", () => {
      const result = resolveNotificationRoute(
        { link: "/admin/users/123" },
        "admin"
      );
      expect(result).toBe("/admin/users/123");
    });

    it("should return admin dashboard when no link provided", () => {
      const result = resolveNotificationRoute(
        { link: null },
        "admin"
      );
      expect(result).toBe("/admin/dashboard");
    });

    it("should allow admin to access client routes", () => {
      const result = resolveNotificationRoute(
        { link: "/client/billing" },
        "admin"
      );
      expect(result).toBe("/client/billing");
    });
  });
});
