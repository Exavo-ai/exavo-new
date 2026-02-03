import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateCaseStudyProject,
  useUpdateCaseStudyProject,
  type CaseStudyProject,
  type CaseStudyProjectStatus,
} from "@/hooks/useCaseStudies";

const projectSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  industry: z.string().min(1, "Industry is required"),
  project_status: z.enum(["real_client", "demo", "internal"]),
  summary: z.string().min(10, "Summary must be at least 10 characters"),
  overview: z.string().optional(),
  visibility: z.boolean(),
  show_on_landing: z.boolean(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface CaseStudyProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: CaseStudyProject | null;
}

const industries = [
  "E-commerce",
  "Healthcare",
  "Finance",
  "Education",
  "Real Estate",
  "Technology",
  "Marketing",
  "Retail",
  "Manufacturing",
  "Hospitality",
  "Professional Services",
  "Other",
];

export function CaseStudyProjectDialog({
  open,
  onOpenChange,
  project,
}: CaseStudyProjectDialogProps) {
  const createProject = useCreateCaseStudyProject();
  const updateProject = useUpdateCaseStudyProject();
  const isEditing = !!project;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      client_name: "",
      industry: "",
      project_status: "demo",
      summary: "",
      overview: "",
      visibility: false,
      show_on_landing: false,
    },
  });

  useEffect(() => {
    if (project) {
      form.reset({
        client_name: project.client_name,
        industry: project.industry,
        project_status: project.project_status,
        summary: project.summary,
        overview: project.overview || "",
        visibility: project.visibility,
        show_on_landing: project.show_on_landing,
      });
    } else {
      form.reset({
        client_name: "",
        industry: "",
        project_status: "demo",
        summary: "",
        overview: "",
        visibility: false,
        show_on_landing: false,
      });
    }
  }, [project, form, open]);

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      if (isEditing) {
        await updateProject.mutateAsync({
          id: project.id,
          ...values,
        });
        toast.success("Project updated successfully");
      } else {
        await createProject.mutateAsync({
          client_name: values.client_name,
          industry: values.industry,
          project_status: values.project_status,
          summary: values.summary,
          overview: values.overview || null,
          visibility: values.visibility,
          show_on_landing: values.show_on_landing,
          display_order: 0,
        });
        toast.success("Project created successfully");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? "Failed to update project" : "Failed to create project");
    }
  };

  const isLoading = createProject.isPending || updateProject.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Project" : "Create New Project"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="client_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="project_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="real_client">Real Client</SelectItem>
                      <SelectItem value="demo">Demo / Concept</SelectItem>
                      <SelectItem value="internal">Internal Project</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description shown on cards..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="overview"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overview (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed project overview for the case study page..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-8">
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Visible to public</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="show_on_landing"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!form.watch("visibility")}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Show on landing page</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Update" : "Create"} Project
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
