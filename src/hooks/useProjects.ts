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
  created_at: string;
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
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

      // Fetch payments for this project - try by appointment_id (booking link)
      let paymentsData: ProjectInvoice[] = [];
      const appointmentId = projectData.appointment_id;
      
      if (appointmentId) {
        const { data: payments } = await supabase
          .from("payments")
          .select("id, amount, currency, status, created_at, stripe_receipt_url")
          .eq("appointment_id", appointmentId)
          .order("created_at", { ascending: false });
        
        if (payments && payments.length > 0) {
          paymentsData = payments.map(p => ({
            id: p.id,
            project_id: projectId,
            amount: Number(p.amount),
            currency: p.currency,
            status: p.status === "paid" ? "paid" : p.status,
            stripe_invoice_id: null,
            pdf_url: p.stripe_receipt_url || null,
            hosted_invoice_url: p.stripe_receipt_url || null,
            created_at: p.created_at,
          }));
        }
      }
      
      // Merge project_invoices with payments (payments as primary source)
      const projectInvoices = projectInvoicesRes.data || [];
      const allInvoices = [...paymentsData, ...projectInvoices];
      
      // Deduplicate by id
      const uniqueInvoices = allInvoices.filter((inv, idx, arr) => 
        arr.findIndex(i => i.id === inv.id) === idx
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
    requestRevision,
    deleteFile,
  };
}
