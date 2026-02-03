import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateCaseStudyModule,
  useUpdateCaseStudyModule,
  type CaseStudyModule,
  type CaseStudyModuleType,
  type CaseStudyDeliveryType,
  type CaseStudyModuleStatus,
} from "@/hooks/useCaseStudies";

const moduleSchema = z.object({
  module_type: z.enum(["website", "automation", "ai_agent", "ai_content", "integration", "other"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  delivery_type: z.enum(["live_ui", "background_automation", "api", "internal_tool"]),
  tech_stack: z.array(z.string()),
  inputs: z.string().optional(),
  outputs: z.string().optional(),
  status: z.enum(["live", "testing", "disabled"]),
  kpis: z.string().optional(),
});

type ModuleFormValues = z.infer<typeof moduleSchema>;

interface CaseStudyModuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  module: CaseStudyModule | null;
}

const techStackOptions = [
  "Lovable",
  "React",
  "TypeScript",
  "Supabase",
  "PostgreSQL",
  "Shopify",
  "WooCommerce",
  "Stripe",
  "n8n",
  "Make",
  "Zapier",
  "OpenAI",
  "Claude AI",
  "Gemini",
  "Langchain",
  "Python",
  "Node.js",
  "REST API",
  "GraphQL",
  "Tailwind CSS",
  "Figma",
  "Webflow",
  "WordPress",
  "HubSpot",
  "Salesforce",
  "Notion",
  "Airtable",
  "Slack",
  "Discord",
  "WhatsApp API",
  "Twilio",
];

export function CaseStudyModuleForm({
  open,
  onOpenChange,
  projectId,
  module,
}: CaseStudyModuleFormProps) {
  const [techInput, setTechInput] = useState("");
  const createModule = useCreateCaseStudyModule();
  const updateModule = useUpdateCaseStudyModule();
  const isEditing = !!module;

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      module_type: "website",
      title: "",
      description: "",
      delivery_type: "live_ui",
      tech_stack: [],
      inputs: "",
      outputs: "",
      status: "live",
      kpis: "",
    },
  });

  useEffect(() => {
    if (module) {
      form.reset({
        module_type: module.module_type,
        title: module.title,
        description: module.description || "",
        delivery_type: module.delivery_type,
        tech_stack: module.tech_stack || [],
        inputs: module.inputs || "",
        outputs: module.outputs || "",
        status: module.status,
        kpis: module.kpis || "",
      });
    } else {
      form.reset({
        module_type: "website",
        title: "",
        description: "",
        delivery_type: "live_ui",
        tech_stack: [],
        inputs: "",
        outputs: "",
        status: "live",
        kpis: "",
      });
    }
  }, [module, form, open]);

  const onSubmit = async (values: ModuleFormValues) => {
    try {
      if (isEditing) {
        await updateModule.mutateAsync({
          id: module.id,
          project_id: projectId,
          module_type: values.module_type,
          title: values.title,
          description: values.description || null,
          delivery_type: values.delivery_type,
          tech_stack: values.tech_stack,
          inputs: values.inputs || null,
          outputs: values.outputs || null,
          status: values.status,
          kpis: values.kpis || null,
          media: module.media || [],
        });
        toast.success("Module updated successfully");
      } else {
        await createModule.mutateAsync({
          project_id: projectId,
          module_type: values.module_type,
          title: values.title,
          description: values.description || null,
          delivery_type: values.delivery_type,
          tech_stack: values.tech_stack,
          inputs: values.inputs || null,
          outputs: values.outputs || null,
          status: values.status,
          kpis: values.kpis || null,
          media: [],
          display_order: 0,
        });
        toast.success("Module created successfully");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? "Failed to update module" : "Failed to create module");
    }
  };

  const addTechStack = (tech: string) => {
    const current = form.getValues("tech_stack");
    if (!current.includes(tech)) {
      form.setValue("tech_stack", [...current, tech]);
    }
    setTechInput("");
  };

  const removeTechStack = (tech: string) => {
    const current = form.getValues("tech_stack");
    form.setValue("tech_stack", current.filter((t) => t !== tech));
  };

  const handleTechKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && techInput.trim()) {
      e.preventDefault();
      addTechStack(techInput.trim());
    }
  };

  const isLoading = createModule.isPending || updateModule.isPending;
  const selectedTech = form.watch("tech_stack");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Module" : "Add New Module"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="module_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="automation">Automation</SelectItem>
                        <SelectItem value="ai_agent">AI Agent</SelectItem>
                        <SelectItem value="ai_content">AI Content</SelectItem>
                        <SelectItem value="integration">Integration</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="testing">Testing</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E-commerce Website" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this module does..."
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
              name="delivery_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="live_ui">Live UI</SelectItem>
                      <SelectItem value="background_automation">Background Automation</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="internal_tool">Internal Tool</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tech Stack */}
            <FormField
              control={form.control}
              name="tech_stack"
              render={() => (
                <FormItem>
                  <FormLabel>Tech Stack</FormLabel>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedTech.map((tech) => (
                        <Badge key={tech} variant="secondary" className="gap-1">
                          {tech}
                          <button
                            type="button"
                            onClick={() => removeTechStack(tech)}
                            className="ml-1 hover:bg-muted rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Input
                      placeholder="Type and press Enter to add custom tech..."
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      onKeyDown={handleTechKeyDown}
                    />
                    <div className="flex flex-wrap gap-1">
                      {techStackOptions
                        .filter((t) => !selectedTech.includes(t))
                        .slice(0, 12)
                        .map((tech) => (
                          <Button
                            key={tech}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => addTechStack(tech)}
                          >
                            + {tech}
                          </Button>
                        ))}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="inputs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inputs (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What data/inputs does this module receive?"
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outputs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outputs (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What does this module produce/output?"
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="kpis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>KPIs / Results (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 50% faster processing, 3x more leads..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isEditing ? "Update" : "Add"} Module
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
