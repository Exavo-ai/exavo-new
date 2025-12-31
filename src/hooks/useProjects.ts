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
  service?: {
    name: string;
    image_url: string | null;
  };
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

export interface Delivery {
  id: string;
  project_id: string;
  message: string;
  files: any;
  created_by: string;
  revision_requested: boolean;
  revision_notes: string | null;
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
  created_at: string;
  updated_at: string;
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
      setProjects(data || []);
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
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
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
      setDeliveries(deliveriesRes.data || []);
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

        // Get monthly fee from booking's package or service
        if (projectData.appointment_id) {
          const { data: bookingData } = await supabase
            .from("appointments")
            .select("package_id")
            .eq("id", projectData.appointment_id)
            .maybeSingle();

          if (bookingData?.package_id) {
            const { data: pkgData } = await supabase
              .from("service_packages")
              .select("monthly_fee")
              .eq("id", bookingData.package_id)
              .maybeSingle();
            setMonthlyFee(Number(pkgData?.monthly_fee) || 0);
          }
        }
      } else {
        setSubscription(null);
        setMonthlyFee(0);
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

  const addComment = async (body: string, authorRole: string = "client") => {
    if (!user || !projectId) return false;

    try {
      const { error } = await supabase.from("project_comments").insert({
        project_id: projectId,
        author_id: user.id,
        author_role: authorRole,
        body,
      });

      if (error) throw error;
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
      return false;
    }
  };

  const requestRevision = async (deliveryId: string, notes: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("deliveries")
        .update({ revision_requested: true, revision_notes: notes })
        .eq("id", deliveryId);

      if (error) throw error;
      toast({ title: "Revision requested" });
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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { project_id: projectId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast({ 
        title: "Subscription canceled",
        description: data?.message || "Your subscription will end at the current period." 
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

  return {
    project,
    milestones,
    comments,
    files,
    deliveries,
    invoices,
    subscription,
    monthlyFee,
    tickets,
    loading,
    error,
    cancellingSubscription,
    refetch: loadProject,
    addComment,
    requestRevision,
    deleteFile,
    cancelSubscription,
  };
}
