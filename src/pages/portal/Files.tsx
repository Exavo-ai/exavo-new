import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Folder, 
  FileText, 
  Upload, 
  Search, 
  MoreVertical, 
  Download, 
  Trash2, 
  Edit2,
  File 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface FileItem {
  id: string;
  name: string;
  size: number;
  created_at: string;
  file_path: string;
}

export default function FilesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; file: FileItem | null }>({
    open: false,
    file: null,
  });
  const [newFileName, setNewFileName] = useState("");

  useEffect(() => {
    loadFiles();
  }, [user]);

  const loadFiles = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Note: This would need a proper storage bucket and table setup
      // For now, we'll use a simple files metadata approach
      const { data, error } = await supabase
        .from("user_files")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error("Error loading files:", error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        // Upload to Supabase Storage (bucket needs to be created)
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        // This assumes a 'user-files' bucket exists
        const { error: uploadError } = await supabase.storage
          .from("user-files")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Store metadata
        const { error: insertError } = await supabase
          .from("user_files")
          .insert({
            user_id: user.id,
            name: file.name,
            file_path: fileName,
            size: file.size,
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });

      // Create notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Files Uploaded",
        message: `${fileList.length} file(s) uploaded successfully`,
      });

      loadFiles();
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

  const handleDownload = async (file: FileItem) => {
    try {
      const { data, error } = await supabase.storage
        .from("user-files")
        .download(file.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (file: FileItem) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("user-files")
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete metadata
      const { error: deleteError } = await supabase
        .from("user_files")
        .delete()
        .eq("id", file.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      // Create notification
      await supabase.from("notifications").insert({
        user_id: user!.id,
        title: "File Deleted",
        message: `${file.name} has been deleted`,
      });

      loadFiles();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleRename = async () => {
    if (!renameDialog.file || !newFileName.trim()) return;

    try {
      const { error } = await supabase
        .from("user_files")
        .update({ name: newFileName.trim() })
        .eq("id", renameDialog.file.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "File renamed successfully",
      });

      setRenameDialog({ open: false, file: null });
      setNewFileName("");
      loadFiles();
    } catch (error) {
      console.error("Rename error:", error);
      toast({
        title: "Error",
        description: "Failed to rename file",
        variant: "destructive",
      });
    }
  };

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  if (loading) {
    return <div className="text-center py-12">Loading files...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Files</h1>
          <p className="text-muted-foreground">Manage your documents and media</p>
        </div>
        <div>
          <Input
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id="file-upload"
          />
          <Button asChild disabled={uploading}>
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : "Upload Files"}
            </label>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? "No files found matching your search" : "No files uploaded yet"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <File className="w-8 h-8 text-muted-foreground" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(file)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setRenameDialog({ open: true, file });
                            setNewFileName(file.name);
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(file)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="font-medium truncate">{file.name}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{new Date(file.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <Dialog open={renameDialog.open} onOpenChange={(open) => setRenameDialog({ open, file: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <Input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="Enter new file name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog({ open: false, file: null })}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
