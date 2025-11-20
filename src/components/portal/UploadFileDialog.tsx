import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  service_id?: string;
}

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
}

export default function UploadFileDialog({
  open,
  onOpenChange,
  onUploadSuccess,
}: UploadFileDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open, user]);

  const loadProjects = async () => {
    if (!user) return;

    try {
      // Fetch user's orders/service requests to use as projects
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, service_id, services(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Also fetch appointments as they represent service requests
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("id, service_id, services(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Combine and deduplicate projects by service name
      const allServices: Project[] = [];
      const serviceNames = new Set<string>();

      // Process orders
      if (ordersData) {
        ordersData.forEach((order: any) => {
          if (order.services?.name && !serviceNames.has(order.services.name)) {
            serviceNames.add(order.services.name);
            allServices.push({
              id: order.service_id || order.id,
              name: order.services.name,
              service_id: order.service_id,
            });
          }
        });
      }

      // Process appointments
      if (appointmentsData) {
        appointmentsData.forEach((appointment: any) => {
          if (appointment.services?.name && !serviceNames.has(appointment.services.name)) {
            serviceNames.add(appointment.services.name);
            allServices.push({
              id: appointment.service_id || appointment.id,
              name: appointment.services.name,
              service_id: appointment.service_id,
            });
          }
        });
      }

      setProjects(allServices);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast({
        title: "Error",
        description: "Failed to load your services",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!user || files.length === 0 || !selectedProject) {
      toast({
        title: "Validation Error",
        description: "Please select a service and at least one file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const projectName = projects.find((p) => p.id === selectedProject)?.name;

      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("user-files")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase
          .from("user_files")
          .insert({
            user_id: user.id,
            name: file.name,
            file_path: fileName,
            size: file.size,
            project_name: projectName,
            description: description.trim() || null,
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`,
      });

      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Files Uploaded",
        message: `${files.length} file(s) uploaded to ${projectName}`,
      });

      setFiles([]);
      setSelectedProject("");
      setDescription("");
      onOpenChange(false);
      onUploadSuccess();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Service/Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">
              Service/Project <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projects.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No services found. Please request a service or place an order first.
              </p>
            )}
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>
              Files <span className="text-destructive">*</span>
            </Label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files here, or click to browse
              </p>
              <Input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload-input"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("file-upload-input")?.click()}
              >
                Browse Files
              </Button>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="space-y-2 mt-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                  >
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a description for these files..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0 || !selectedProject}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
