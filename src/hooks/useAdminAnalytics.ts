import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfYear, subDays, format, parseISO } from "date-fns";

export type DateRangePreset = "7d" | "30d" | "90d" | "ytd" | "custom";

interface DateRange {
  from: Date;
  to: Date;
}

interface DailyMetric {
  date: string;
  revenue: number;
  bookings: number;
  new_users: number;
  active_users: number;
}

interface ServiceMetric {
  service_name: string;
  bookings_count: number;
  revenue: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface Stats {
  totalUsers: number;
  totalServices: number;
  totalBookings: number;
  totalRevenue: number;
  monthlyGrowth: number;
  activeUsers: number;
}

interface AnalyticsData {
  stats: Stats;
  revenueData: MonthlyRevenue[];
  serviceData: ServiceMetric[];
  loading: boolean;
  error: string | null;
}

export function useAdminAnalytics(preset: DateRangePreset, customRange?: DateRange) {
  const [data, setData] = useState<AnalyticsData>({
    stats: {
      totalUsers: 0,
      totalServices: 0,
      totalBookings: 0,
      totalRevenue: 0,
      monthlyGrowth: 0,
      activeUsers: 0,
    },
    revenueData: [],
    serviceData: [],
    loading: true,
    error: null,
  });

  const getDateRange = useCallback((): DateRange => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    switch (preset) {
      case "7d":
        return { from: subDays(today, 7), to: today };
      case "30d":
        return { from: subDays(today, 30), to: today };
      case "90d":
        return { from: subDays(today, 90), to: today };
      case "ytd":
        return { from: startOfYear(today), to: today };
      case "custom":
        return customRange || { from: subDays(today, 30), to: today };
      default:
        return { from: subDays(today, 30), to: today };
    }
  }, [preset, customRange]);

  const getPreviousPeriodRange = useCallback((current: DateRange): DateRange => {
    const duration = current.to.getTime() - current.from.getTime();
    return {
      from: new Date(current.from.getTime() - duration),
      to: new Date(current.from.getTime() - 1),
    };
  }, []);

  const loadAnalytics = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const range = getDateRange();
      const prevRange = getPreviousPeriodRange(range);
      
      const fromDate = format(range.from, "yyyy-MM-dd");
      const toDate = format(range.to, "yyyy-MM-dd");
      const prevFromDate = format(prevRange.from, "yyyy-MM-dd");
      const prevToDate = format(prevRange.to, "yyyy-MM-dd");

      // Fetch all data in parallel
      const [
        dailyMetricsResult,
        prevDailyMetricsResult,
        serviceMetricsResult,
        usersCountResult,
        servicesCountResult,
      ] = await Promise.all([
        // Current period daily metrics
        supabase
          .from("daily_metrics")
          .select("*")
          .gte("date", fromDate)
          .lte("date", toDate)
          .order("date", { ascending: true }),
        
        // Previous period for growth calculation
        supabase
          .from("daily_metrics")
          .select("revenue, bookings")
          .gte("date", prevFromDate)
          .lte("date", prevToDate),
        
        // Service metrics aggregated
        supabase
          .from("service_metrics")
          .select("service_name, bookings_count, revenue")
          .gte("date", fromDate)
          .lte("date", toDate),
        
        // Total users count
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true }),
        
        // Total services count
        supabase
          .from("services")
          .select("*", { count: "exact", head: true }),
      ]);

      if (dailyMetricsResult.error) throw dailyMetricsResult.error;
      if (serviceMetricsResult.error) throw serviceMetricsResult.error;

      const dailyMetrics: DailyMetric[] = dailyMetricsResult.data || [];
      const prevMetrics = prevDailyMetricsResult.data || [];
      const serviceMetrics = serviceMetricsResult.data || [];

      // Calculate stats from daily metrics
      const totalRevenue = dailyMetrics.reduce((sum, m) => sum + Number(m.revenue), 0);
      const totalBookings = dailyMetrics.reduce((sum, m) => sum + m.bookings, 0);
      const avgActiveUsers = dailyMetrics.length > 0
        ? Math.round(dailyMetrics.reduce((sum, m) => sum + m.active_users, 0) / dailyMetrics.length)
        : 0;

      // Calculate previous period revenue for growth
      const prevRevenue = prevMetrics.reduce((sum, m) => sum + Number(m.revenue), 0);
      const monthlyGrowth = prevRevenue > 0
        ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100 * 10) / 10
        : 0;

      // Aggregate revenue by month for chart
      const monthlyRevenueMap = new Map<string, number>();
      dailyMetrics.forEach(metric => {
        const monthKey = format(parseISO(metric.date), "MMM yyyy");
        const current = monthlyRevenueMap.get(monthKey) || 0;
        monthlyRevenueMap.set(monthKey, current + Number(metric.revenue));
      });

      const revenueData: MonthlyRevenue[] = Array.from(monthlyRevenueMap.entries())
        .map(([month, revenue]) => ({ month, revenue: Math.round(revenue) }))
        .sort((a, b) => {
          const dateA = new Date(a.month);
          const dateB = new Date(b.month);
          return dateA.getTime() - dateB.getTime();
        });

      // Aggregate service metrics
      const serviceAggMap = new Map<string, { bookings: number; revenue: number }>();
      serviceMetrics.forEach(metric => {
        const current = serviceAggMap.get(metric.service_name) || { bookings: 0, revenue: 0 };
        serviceAggMap.set(metric.service_name, {
          bookings: current.bookings + metric.bookings_count,
          revenue: current.revenue + Number(metric.revenue),
        });
      });

      const serviceData: ServiceMetric[] = Array.from(serviceAggMap.entries())
        .map(([service_name, data]) => ({
          service_name: service_name.length > 18 ? service_name.substring(0, 18) + "..." : service_name,
          bookings_count: data.bookings,
          revenue: Math.round(data.revenue),
        }))
        .sort((a, b) => b.bookings_count - a.bookings_count)
        .slice(0, 6);

      setData({
        stats: {
          totalUsers: usersCountResult.count || 0,
          totalServices: servicesCountResult.count || 0,
          totalBookings,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          monthlyGrowth,
          activeUsers: avgActiveUsers,
        },
        revenueData,
        serviceData,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load analytics",
      }));
    }
  }, [getDateRange, getPreviousPeriodRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return { ...data, refetch: loadAnalytics };
}
