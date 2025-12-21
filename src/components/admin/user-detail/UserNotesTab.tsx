import { useEffect, useState } from "react";
import { format } from "date-fns";
import { StickyNote, Plus, Edit2, Trash2, Save, X, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Note {
  id: string;
  note: string;
  admin_id: string;
  created_at: string;
  updated_at: string;
  admin_name?: string;
}

interface UserNotesTabProps {
  userId: string;
}

export function UserNotesTab({ userId }: UserNotesTabProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [userId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("admin_notes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch admin names for each note
      const notesWithNames = await Promise.all(
        (data || []).map(async (note) => {
          const { data: adminProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", note.admin_id)
            .maybeSingle();

          return {
            ...note,
            admin_name: adminProfile?.full_name || adminProfile?.email || "Admin",
          };
        })
      );

      setNotes(notesWithNames);
    } catch (error) {
      console.error("Error loading notes:", error);
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setSaving(true);
      const { error } = await supabase.from("admin_notes").insert({
        user_id: userId,
        admin_id: currentUser?.id,
        note: newNote.trim(),
      });

      if (error) throw error;

      toast({ title: "Success", description: "Note added successfully" });
      setNewNote("");
      setIsAdding(false);
      loadNotes();
    } catch (error: any) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingText.trim()) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("admin_notes")
        .update({ note: editingText.trim() })
        .eq("id", noteId);

      if (error) throw error;

      toast({ title: "Success", description: "Note updated successfully" });
      setEditingId(null);
      setEditingText("");
      loadNotes();
    } catch (error: any) {
      console.error("Error updating note:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update note",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const { error } = await supabase
        .from("admin_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      toast({ title: "Success", description: "Note deleted successfully" });
      loadNotes();
    } catch (error: any) {
      console.error("Error deleting note:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setEditingText(note.note);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingText("");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Admin Notes ({notes.length})
            </CardTitle>
            <CardDescription>Private notes visible only to admins</CardDescription>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security Notice */}
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Lock className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-600 dark:text-amber-400">
            These notes are private and visible only to administrators. Clients cannot see this information.
          </AlertDescription>
        </Alert>

        {/* Add New Note Form */}
        {isAdding && (
          <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
            <Textarea
              placeholder="Write your private note here..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewNote("");
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddNote} disabled={saving || !newNote.trim()}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        {notes.length === 0 && !isAdding ? (
          <div className="text-center py-12 text-muted-foreground">
            <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notes yet</p>
            <p className="text-sm">Add a private note about this user</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                {editingId === note.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={cancelEditing}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={saving || !editingText.trim()}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {saving ? "Saving..." : "Update"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm">{note.note}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">{note.admin_name}</span>
                        <span className="mx-2">•</span>
                        <span>{format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                        {note.updated_at !== note.created_at && (
                          <span className="ml-2 italic">(edited)</span>
                        )}
                      </div>
                      {note.admin_id === currentUser?.id && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(note)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
