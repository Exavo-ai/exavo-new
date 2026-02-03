import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types for case study system
export type CaseStudyProjectStatus = 'real_client' | 'demo' | 'internal';
export type CaseStudyModuleType = 'website' | 'automation' | 'ai_agent' | 'ai_content' | 'integration' | 'other';
export type CaseStudyDeliveryType = 'live_ui' | 'background_automation' | 'api' | 'internal_tool';
export type CaseStudyModuleStatus = 'live' | 'testing' | 'disabled';

export interface CaseStudyProject {
  id: string;
  client_name: string;
  industry: string;
  project_status: CaseStudyProjectStatus;
  summary: string;
  overview: string | null;
  visibility: boolean;
  show_on_landing: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  modules?: CaseStudyModule[];
}

export interface CaseStudyModule {
  id: string;
  project_id: string;
  module_type: CaseStudyModuleType;
  title: string;
  description: string | null;
  delivery_type: CaseStudyDeliveryType;
  tech_stack: string[];
  inputs: string | null;
  outputs: string | null;
  status: CaseStudyModuleStatus;
  media: Array<{ type: 'image' | 'video'; url: string; caption?: string }>;
  kpis: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Fetch all projects (admin)
export function useAdminCaseStudyProjects() {
  return useQuery({
    queryKey: ["case-study-projects-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_study_projects")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as CaseStudyProject[];
    },
  });
}

// Fetch visible projects for landing page
export function useLandingCaseStudies() {
  return useQuery({
    queryKey: ["case-study-projects-landing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_study_projects")
        .select(`
          *,
          modules:case_study_modules(*)
        `)
        .eq("visibility", true)
        .eq("show_on_landing", true)
        .order("display_order", { ascending: true })
        .limit(6);

      if (error) throw error;
      return data as (CaseStudyProject & { modules: CaseStudyModule[] })[];
    },
  });
}

// Fetch single project with modules
export function useCaseStudyProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["case-study-project", projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from("case_study_projects")
        .select(`
          *,
          modules:case_study_modules(*)
        `)
        .eq("id", projectId)
        .single();

      if (error) throw error;
      
      // Sort modules by display_order
      if (data.modules) {
        data.modules.sort((a: CaseStudyModule, b: CaseStudyModule) => a.display_order - b.display_order);
      }
      
      return data as CaseStudyProject & { modules: CaseStudyModule[] };
    },
    enabled: !!projectId,
  });
}

// Fetch modules for a project
export function useCaseStudyModules(projectId: string | undefined) {
  return useQuery({
    queryKey: ["case-study-modules", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("case_study_modules")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as CaseStudyModule[];
    },
    enabled: !!projectId,
  });
}

// Create project mutation
export function useCreateCaseStudyProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: Omit<CaseStudyProject, 'id' | 'created_at' | 'updated_at' | 'modules'>) => {
      const { data, error } = await supabase
        .from("case_study_projects")
        .insert(project)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-study-projects-admin"] });
      queryClient.invalidateQueries({ queryKey: ["case-study-projects-landing"] });
    },
  });
}

// Update project mutation
export function useUpdateCaseStudyProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CaseStudyProject> & { id: string }) => {
      const { data, error } = await supabase
        .from("case_study_projects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["case-study-projects-admin"] });
      queryClient.invalidateQueries({ queryKey: ["case-study-projects-landing"] });
      queryClient.invalidateQueries({ queryKey: ["case-study-project", variables.id] });
    },
  });
}

// Delete project mutation
export function useDeleteCaseStudyProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("case_study_projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-study-projects-admin"] });
      queryClient.invalidateQueries({ queryKey: ["case-study-projects-landing"] });
    },
  });
}

// Create module mutation
export function useCreateCaseStudyModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (module: Omit<CaseStudyModule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("case_study_modules")
        .insert(module)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["case-study-modules", variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ["case-study-project", variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ["case-study-projects-landing"] });
    },
  });
}

// Update module mutation
export function useUpdateCaseStudyModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, project_id, ...updates }: Partial<CaseStudyModule> & { id: string; project_id: string }) => {
      const { data, error } = await supabase
        .from("case_study_modules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, project_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["case-study-modules", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["case-study-project", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["case-study-projects-landing"] });
    },
  });
}

// Delete module mutation
export function useDeleteCaseStudyModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moduleId, projectId }: { moduleId: string; projectId: string }) => {
      const { error } = await supabase
        .from("case_study_modules")
        .delete()
        .eq("id", moduleId);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["case-study-modules", data.projectId] });
      queryClient.invalidateQueries({ queryKey: ["case-study-project", data.projectId] });
      queryClient.invalidateQueries({ queryKey: ["case-study-projects-landing"] });
    },
  });
}

// Reorder projects mutation
export function useReorderCaseStudyProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        display_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("case_study_projects")
          .update({ display_order: update.display_order })
          .eq("id", update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-study-projects-admin"] });
      queryClient.invalidateQueries({ queryKey: ["case-study-projects-landing"] });
    },
  });
}

// Fetch section visibility setting
export function useCaseStudiesSectionVisibility() {
  return useQuery({
    queryKey: ["case-studies-section-visibility"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "show_case_studies_section")
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.value === 'true';
    },
  });
}

// Toggle section visibility
export function useToggleCaseStudiesSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visible: boolean) => {
      const { error } = await supabase
        .from("site_settings")
        .update({ value: visible ? 'true' : 'false' })
        .eq("key", "show_case_studies_section");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-studies-section-visibility"] });
    },
  });
}
