import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Project {
  id: string;
  user_id: string;
  workspace_id: string | null;
  client_id: string | null;
  service_id: string | null;
  appointment_id: string | null;
  name: string;
  title: string | null;
  description: string | null;
  status: string;
  progress: number;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  client_notes: string | null;
  client_notes_updated_at: string | null;
  payment_model?: string | null;
  service?: {
    name: string;
    image_url: string | null;
  };
  subscription?: {
    status: string;
    cancel_at_period_end: boolean;
    next_renewal_date: string | null;
  } | null;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  order_index: number;
  completed_at: string | null;
  created_at: string;
}

export interface ProjectComment {
  id: string;
  project_id: string;
  author_id: string;
  author_role: string;
  body: string;
  created_at: string;
  author?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export interface ProjectFile {
  id: string;
  project_id: string;
  uploader_id: string;
  uploader_role: string;
  filename: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  uploader?: {
    full_name: string | null;
    email: string;
  };
}

export type DeliveryStatus = 'pending' | 'approved' | 'changes_requested';

export interface Delivery {
  id: string;
  project_id: string;
  message: string;
  files: any;
  created_by: string;
  revision_requested: boolean;
  revision_notes: string | null;
  status: DeliveryStatus;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectInvoice {
  id: string;
  project_id: string;
  amount: number;
  currency: string;
  status: string;
  stripe_invoice_id: string | null;
  pdf_url: string | null;
  hosted_invoice_url: string | null;
  stripe_receipt_url?: string | null;
  description?: string | null;
  created_at: string;
}

export interface ProjectSubscription {
  id: string;
  project_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: string;
  next_renewal_date: string | null;
  paused_at: string | null;
  resume_at: string | null;
  pause_behavior: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServicePackageInfo {
  id: string;
  package_name: string;
  monthly_fee: number;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadProjects = useCallback(async () => {
    if (!user) return;
    
    try {
      setError(null);
      // Fetch projects where user is linked via user_id, client_id, or workspace_id
      const { data, error: fetchError } = await supabase
        .from("projects")
        .select(`
          *,
          service:services(name, image_url)
        `)
        .or(`user_id.eq.${user.id},client_id.eq.${user.id},workspace_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch subscription status for subscription projects
      const projectIds = (data || [])
        .filter(p => p.payment_model === "subscription")
        .map(p => p.id);

      let subscriptionMap: Record<string, { status: string; cancel_at_period_end: boolean; next_renewal_date: string | null }> = {};
      
      if (projectIds.length > 0) {
        const { data: subData } = await supabase
          .from("project_subscriptions")
          .select("project_id, status, cancel_at_period_end, next_renewal_date")
          .in("project_id", projectIds);

        if (subData) {
          subscriptionMap = subData.reduce((acc, sub) => {
            acc[sub.project_id] = {
              status: sub.status,
              cancel_at_period_end: sub.cancel_at_period_end,
              next_renewal_date: sub.next_renewal_date,
            };
            return acc;
          }, {} as Record<string, { status: string; cancel_at_period_end: boolean; next_renewal_date: string | null }>);
        }
      }

      // Merge subscription data into projects
      const projectsWithSubs = (data || []).map(project => ({
        ...project,
        subscription: project.payment_model === "subscription" 
          ? subscriptionMap[project.id] || null 
          : null,
      }));

      setProjects(projectsWithSubs);
    } catch (err: any) {
      console.error("Error loading projects:", err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadProjects();

    // Real-time subscription
    const channel = supabase
      .channel("projects-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => loadProjects()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProjects]);

  return { projects, loading, error, refetch: loadProjects };
}

export function useProject(projectId: string | undefined) {
  const [project, setProject] = useState<(Project & { payment_model?: string })| null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([]);
  const [subscription, setSubscription] = useState<ProjectSubscription | null>(null);
  const [monthlyFee, setMonthlyFee] = useState<number>(0);
  const [currentPackage, setCurrentPackage] = useState<ServicePackageInfo | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [pausingSubscription, setPausingSubscription] = useState(false);
  const [resumingSubscription, setResumingSubscription] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadProject = useCallback(async () => {
    if (!user || !projectId) return;

    try {
      setError(null);
      
      // Load project with service info
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select(`*, service:services(name, image_url)`)
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Load related data in parallel
      const [
        milestonesRes,
        commentsRes,
        filesRes,
        deliveriesRes,
        projectInvoicesRes,
        ticketsRes,
      ] = await Promise.all([
        supabase
          .from("milestones")
          .select("*")
          .eq("project_id", projectId)
          .order("order_index"),
        supabase
          .from("project_comments")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("project_files")
          .select("*, uploader:profiles(full_name, email)")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("deliveries")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        supabase
          .from("project_invoices")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        supabase
          .from("tickets")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
      ]);

      setMilestones(milestonesRes.data || []);
      setComments(commentsRes.data || []);
      setFiles((filesRes.data as ProjectFile[]) || []);
      setDeliveries((deliveriesRes.data || []) as Delivery[]);
      setTickets(ticketsRes.data || []);

      // Fetch payments for this project (same source as main Billing: payments table)
      // Note: some payment records don't have appointment_id set, so we use safe fallbacks.
      const paymentsSelect =
        "id, amount, currency, status, created_at, stripe_receipt_url, stripe_session_id";

      const toInvoice = (p: any): ProjectInvoice => ({
        id: p.id,
        project_id: projectId,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        stripe_invoice_id: null,
        pdf_url: p.stripe_receipt_url || null,
        hosted_invoice_url: p.stripe_receipt_url || null,
        stripe_receipt_url: p.stripe_receipt_url || null,
        description: p.description || null,
        created_at: p.created_at,
      });

      // Fetch subscription if this is a subscription project
      if (projectData.payment_model === "subscription") {
        const { data: subData } = await supabase
          .from("project_subscriptions")
          .select("*")
          .eq("project_id", projectId)
          .maybeSingle();
        setSubscription(subData || null);

        // Get monthly fee and package info from booking's package
        if (projectData.appointment_id) {
          const { data: bookingData } = await supabase
            .from("appointments")
            .select("package_id")
            .eq("id", projectData.appointment_id)
            .maybeSingle();

          if (bookingData?.package_id) {
            const { data: pkgData } = await supabase
              .from("service_packages")
              .select("id, package_name, monthly_fee")
              .eq("id", bookingData.package_id)
              .maybeSingle();
            setMonthlyFee(Number(pkgData?.monthly_fee) || 0);
            setCurrentPackage(pkgData ? {
              id: pkgData.id,
              package_name: pkgData.package_name,
              monthly_fee: Number(pkgData.monthly_fee) || 0,
            } : null);
          } else {
            setCurrentPackage(null);
          }
        } else {
          setCurrentPackage(null);
        }
      } else {
        setSubscription(null);
        setMonthlyFee(0);
        setCurrentPackage(null);
      }

      const appointmentId = projectData.appointment_id;
      let booking: { notes: string | null; created_at: string } | null = null;

      // 1) Primary: by booking/appointment_id
      let payments: any[] = [];
      if (appointmentId) {
        const res = await supabase
          .from("payments")
          .select(paymentsSelect)
          .eq("appointment_id", appointmentId)
          .order("created_at", { ascending: false });
        payments = res.data || [];
      }

      // 2) Fallback: extract stripe_session_id from booking notes then match payments
      if (payments.length === 0 && appointmentId) {
        const { data: bookingData } = await supabase
          .from("appointments")
          .select("notes, created_at")
          .eq("id", appointmentId)
          .maybeSingle();

        booking = bookingData || null;

        const sessionId = booking?.notes?.match(/stripe_session:([^\n]+)/)?.[1]?.trim();
        if (sessionId) {
          const res = await supabase
            .from("payments")
            .select(paymentsSelect)
            .eq("stripe_session_id", sessionId)
            .order("created_at", { ascending: false });
          payments = res.data || [];
        }
      }

      // 3) Fallback: match by user + service within ±2 days of project/booking creation
      if (payments.length === 0) {
        const base = booking?.created_at || projectData.created_at;
        const from = new Date(base);
        from.setDate(from.getDate() - 2);
        const to = new Date(base);
        to.setDate(to.getDate() + 2);

        let q = supabase
          .from("payments")
          .select(paymentsSelect)
          .eq("user_id", projectData.user_id)
          .gte("created_at", from.toISOString())
          .lte("created_at", to.toISOString())
          .order("created_at", { ascending: false });

        if (projectData.service_id) {
          q = q.eq("service_id", projectData.service_id);
        }

        const res = await q;
        payments = res.data || [];
      }

      const paymentsInvoices: ProjectInvoice[] = payments.map(toInvoice);

      // Merge project_invoices with payments (payments as primary source)
      const projectInvoices = projectInvoicesRes.data || [];
      const allInvoices = [...paymentsInvoices, ...projectInvoices];

      // Deduplicate by id
      const uniqueInvoices = allInvoices.filter(
        (inv, idx, arr) => arr.findIndex((i) => i.id === inv.id) === idx,
      );

      setInvoices(uniqueInvoices);
    } catch (err: any) {
      console.error("Error loading project:", err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load project details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, projectId, toast]);

  useEffect(() => {
    loadProject();

    if (!projectId) return;

    // Real-time subscriptions for project-related tables
    const channel = supabase
      .channel(`project-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects", filter: `id=eq.${projectId}` },
        () => loadProject()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "milestones", filter: `project_id=eq.${projectId}` },
        () => loadProject()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_comments", filter: `project_id=eq.${projectId}` },
        () => loadProject()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries", filter: `project_id=eq.${projectId}` },
        () => loadProject()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProject, projectId]);

  const addComment = async (body: string, authorRole: string = "client"): Promise<ProjectComment | null> => {
    if (!user || !projectId) return null;

    try {
      const { data, error } = await supabase.from("project_comments").insert({
        project_id: projectId,
        author_id: user.id,
        author_role: authorRole,
        body,
      }).select().single();

      if (error) throw error;
      return data as ProjectComment;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
      return null;
    }
  };

  const requestRevision = async (deliveryId: string, notes: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("deliveries")
        .update({ 
          revision_requested: true, 
          revision_notes: notes,
          status: 'changes_requested' as const
        })
        .eq("id", deliveryId);

      if (error) throw error;
      toast({ title: "Revision requested" });
      loadProject();
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to request revision",
        variant: "destructive",
      });
      return false;
    }
  };

  const approveDelivery = async (deliveryId: string): Promise<boolean> => {
    if (!user || !projectId) return false;

    try {
      // 1. Approve the delivery
      const { error } = await supabase
        .from("deliveries")
        .update({ 
          status: 'approved' as const,
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq("id", deliveryId);

      if (error) throw error;

      // 2. Check if ALL deliveries for this project are now approved
      const { data: allDeliveries, error: fetchError } = await supabase
        .from("deliveries")
        .select("id, status")
        .eq("project_id", projectId);

      if (fetchError) throw fetchError;

      // 3. If all deliveries are approved, update project status to completed
      const allApproved = allDeliveries && allDeliveries.length > 0 && 
        allDeliveries.every(d => d.status === 'approved');

      if (allApproved) {
        const { error: projectError } = await supabase
          .from("projects")
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq("id", projectId);

        if (projectError) {
          console.error("Failed to update project status:", projectError);
        } else {
          toast({ 
            title: "Project Completed", 
            description: "All deliveries approved. Project is now marked as completed." 
          });
        }
      } else {
        toast({ title: "Delivery approved", description: "The delivery has been marked as approved." });
      }

      loadProject();
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to approve delivery",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteFile = async (fileId: string, filePath: string): Promise<boolean> => {
    if (!user) return false;
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("user-files")
        .remove([filePath]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("project_files")
        .delete()
        .eq("id", fileId);

      if (dbError) throw dbError;

      toast({ title: "File deleted" });
      loadProject();
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
      return false;
    }
  };

  const cancelSubscription = async (): Promise<boolean> => {
    if (!user || !projectId) return false;
    setCancellingSubscription(true);

    const extractMessage = (err: any): string | null => {
      const body = err?.context?.body;
      if (!body) return null;
      if (typeof body === "string") {
        try {
          const parsed = JSON.parse(body);
          return parsed?.message || parsed?.error || null;
        } catch {
          return body;
        }
      }
      if (typeof body === "object") {
        return body?.message || body?.error || null;
      }
      return null;
    };

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke("cancel-subscription", {
        body: {
          project_id: projectId,
          cancel_at_period_end: true,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      // Non-2xx errors come back in response.error; try to parse JSON message from context
      if (response.error) {
        const msg = extractMessage(response.error) || response.error.message || "Failed to cancel subscription";
        throw new Error(msg);
      }

      if (!response.data) {
        throw new Error("No response from server");
      }

      if (response.data.ok === false) {
        throw new Error(response.data.message || "Failed to cancel subscription");
      }

      const accessUntil = response.data?.access_until
        ? new Date(response.data.access_until).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : null;

      toast({
        title: "Subscription canceled",
        description: accessUntil
          ? `Your subscription has been canceled. You will have access until ${accessUntil}.`
          : "Your subscription has been canceled.",
      });

      loadProject();
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to cancel subscription",
        variant: "destructive",
      });
      return false;
    } finally {
      setCancellingSubscription(false);
    }
  };

  const openBillingPortal = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("create-billing-portal", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
        return true;
      }
      throw new Error("No portal URL returned");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to open billing portal",
        variant: "destructive",
      });
      return false;
    }
  };

  const resubscribe = async (): Promise<boolean> => {
    if (!user || !project) return false;
    try {
      // Get package_id from the appointment
      let packageId: string | null = null;
      if (project.appointment_id) {
        const { data: booking } = await supabase
          .from("appointments")
          .select("package_id")
          .eq("id", project.appointment_id)
          .maybeSingle();
        packageId = booking?.package_id || null;
      }

      if (!packageId) {
        toast({
          title: "Error",
          description: "Cannot find the original package to resubscribe",
          variant: "destructive",
        });
        return false;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
        body: { 
          packageId,
          successUrl: `${window.location.origin}/portal/projects/${projectId}?tab=billing`,
          cancelUrl: `${window.location.origin}/portal/projects/${projectId}?tab=billing`,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
        return true;
      }
      throw new Error("No checkout URL returned");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to start resubscription",
        variant: "destructive",
      });
      return false;
    }
  };

  const pauseSubscription = async (): Promise<boolean> => {
    if (!user || !projectId) return false;
    setPausingSubscription(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("pause-subscription", {
        body: { project_id: projectId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to pause subscription");
      }

      if (response.data?.ok === false) {
        throw new Error(response.data.message || "Failed to pause subscription");
      }

      toast({
        title: "Subscription paused",
        description: "Your subscription has been paused. You can resume it anytime.",
      });

      loadProject();
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to pause subscription",
        variant: "destructive",
      });
      return false;
    } finally {
      setPausingSubscription(false);
    }
  };

  const resumeSubscription = async (): Promise<boolean> => {
    if (!user || !projectId) return false;
    setResumingSubscription(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("resume-subscription", {
        body: { project_id: projectId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to resume subscription");
      }

      if (response.data?.ok === false) {
        throw new Error(response.data.message || "Failed to resume subscription");
      }

      const nextRenewal = response.data?.next_renewal_date
        ? new Date(response.data.next_renewal_date).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : null;

      toast({
        title: "Subscription resumed",
        description: nextRenewal
          ? `Your subscription is now active. Next billing date: ${nextRenewal}.`
          : "Your subscription is now active.",
      });

      loadProject();
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to resume subscription",
        variant: "destructive",
      });
      return false;
    } finally {
      setResumingSubscription(false);
    }
  };

  return {
    project,
    milestones,
    comments,
    setComments,
    files,
    deliveries,
    invoices,
    subscription,
    monthlyFee,
    currentPackage,
    tickets,
    loading,
    error,
    cancellingSubscription,
    pausingSubscription,
    resumingSubscription,
    refetch: loadProject,
    addComment,
    requestRevision,
    approveDelivery,
    deleteFile,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    openBillingPortal,
    resubscribe,
  };
}
