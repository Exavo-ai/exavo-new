import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface AdminProject {
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
  service?: {
    name: string;
    image_url: string | null;
  };
  client?: {
    full_name: string | null;
    email: string;
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
  created_at: string;
}

export function useAdminProject(projectId: string | undefined) {
  const [project, setProject] = useState<AdminProject | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const loadProject = useCallback(async () => {
    if (!user || !projectId || userRole !== "admin") return;

    try {
      setError(null);

      // Load project with service info (admin can access any project)
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select(`
          *, 
          service:services(name, image_url)
        `)
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;

      // Fetch client info separately
      let clientInfo = null;
      if (projectData.user_id) {
        const { data: clientData } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", projectData.user_id)
          .single();
        clientInfo = clientData;
      }

      setProject({ ...projectData, client: clientInfo });

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
        created_at: p.created_at,
      });

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
  }, [user, projectId, userRole, toast]);

  useEffect(() => {
    loadProject();

    if (!projectId) return;

    // Real-time subscriptions for project-related tables
    const channel = supabase
      .channel(`admin-project-${projectId}`)
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_files", filter: `project_id=eq.${projectId}` },
        () => loadProject()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProject, projectId]);

  const addComment = async (body: string, authorRole: string = "team") => {
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

  const updateTicketStatus = async (ticketId: string, status: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      if (error) throw error;
      toast({ title: "Ticket status updated" });
      loadProject();
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
      return false;
    }
  };

  const createMilestone = async (data: {
    title: string;
    description: string;
    due_date: string | null;
    status: string;
    order_index: number;
  }) => {
    if (!user || !projectId) return false;

    try {
      const { error } = await supabase.from("milestones").insert({
        project_id: projectId,
        title: data.title,
        description: data.description || null,
        due_date: data.due_date,
        status: data.status,
        order_index: data.order_index,
      });

      if (error) throw error;
      toast({ title: "Milestone created" });
      loadProject();
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to create milestone",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateMilestone = async (
    milestoneId: string,
    data: {
      title: string;
      description: string;
      due_date: string | null;
      status: string;
      order_index: number;
    }
  ) => {
    if (!user) return false;

    try {
      const updateData: any = {
        title: data.title,
        description: data.description || null,
        due_date: data.due_date,
        status: data.status,
        order_index: data.order_index,
        updated_at: new Date().toISOString(),
      };

      // Set completed_at if status changed to completed
      if (data.status === "completed") {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from("milestones")
        .update(updateData)
        .eq("id", milestoneId);

      if (error) throw error;
      toast({ title: "Milestone updated" });
      loadProject();
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to update milestone",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteMilestone = async (milestoneId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("milestones")
        .delete()
        .eq("id", milestoneId);

      if (error) throw error;
      toast({ title: "Milestone deleted" });
      loadProject();
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to delete milestone",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateProject = async (data: { start_date?: string | null; due_date?: string | null }) => {
    if (!user || !projectId) return false;

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      if (error) throw error;
      toast({ title: "Project updated" });
      loadProject();
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    project,
    milestones,
    comments,
    files,
    deliveries,
    invoices,
    tickets,
    loading,
    error,
    refetch: loadProject,
    addComment,
    deleteFile,
    updateTicketStatus,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    updateProject,
  };
}
