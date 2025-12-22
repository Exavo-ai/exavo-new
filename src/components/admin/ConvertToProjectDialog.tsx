import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FolderPlus } from "lucide-react";

interface Lead {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  subject: string;
  message: string;
}

interface ConvertToProjectDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ConvertToProjectDialog({
  lead,
  open,
  onOpenChange,
  onSuccess,
}: ConvertToProjectDialogProps) {
  const [projectName, setProjectName] = useState(lead.subject);
  const [projectDescription, setProjectDescription] = useState(lead.message);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConvert = async () => {
    if (!projectName.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    if (!lead.user_id) {
      toast({
        title: "Cannot Convert",
        description: "Only consultations from registered users can be converted to projects.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create the project linked to the lead and client
      const { error } = await supabase.from("projects").insert({
        name: projectName.trim(),
        title: projectName.trim(),
        description: projectDescription.trim() || null,
        user_id: lead.user_id,
        client_id: lead.user_id,
        workspace_id: lead.user_id,
        lead_id: lead.id,
        status: "active",
        progress: 0,
        start_date: new Date().toISOString().split("T")[0],
      });

      if (error) {
        // Check for unique constraint violation
        if (error.code === "23505") {
          toast({
            title: "Already Converted",
            description: "This consultation has already been converted to a project.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Project Created",
        description: "The consultation has been converted to a project successfully.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error converting to project:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            Convert to Project
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Project Description</Label>
            <Textarea
              id="project-description"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Enter project description"
              className="min-h-[100px]"
            />
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p>
              <strong>Client:</strong> {lead.full_name} ({lead.email})
            </p>
            <p className="mt-1">
              The project will appear in the client's Projects section automatically.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={loading}>
            {loading ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
