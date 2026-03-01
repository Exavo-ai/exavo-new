import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Upload, FileText, Trash2, RefreshCw, Send, Loader2,
  AlertCircle, CheckCircle2, ArrowLeft
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { toast } from "sonner";

interface UploadedDoc {
  id: string;
  name: string;
  size: number;
  status: "processing" | "ready" | "error";
  errorMessage?: string;
  dbId?: string; // actual database id
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const MAX_DOCS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DAILY_LIMIT = 7;
const ALLOWED_EXTENSIONS = ["pdf", "txt", "docx"];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const PlaygroundRAG = () => {
  const { user, loading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const questionsRemaining = DAILY_LIMIT - questionsUsed;
  const hasReadyDocs = documents.some((d) => d.status === "ready");
  const canSend = hasReadyDocs && questionsRemaining > 0 && !isSending && input.trim().length > 0;

  // Load existing documents and usage on mount
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      setIsLoadingDocs(true);
      try {
        // Load documents
        const { data: docs } = await supabase
          .from("rag_documents")
          .select("id, file_name, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (docs) {
          setDocuments(
            docs.map((d: any) => ({
              id: d.id,
              name: d.file_name,
              size: 0,
              status: "ready" as const,
              dbId: d.id,
            }))
          );
        }

        // Load today's usage
        const today = new Date().toISOString().split("T")[0];
        const { data: usage } = await supabase
          .from("rag_usage")
          .select("questions_used")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();

        if (usage) {
          setQuestionsUsed(usage.questions_used);
        }
      } catch (err) {
        console.error("Failed to load playground data:", err);
      } finally {
        setIsLoadingDocs(false);
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/register" replace />;
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate extension
    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error("Unsupported file type. Allowed: PDF, TXT, DOCX");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 5MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (documents.length >= MAX_DOCS) {
      toast.error(`Maximum ${MAX_DOCS} documents reached.`);
      return;
    }

    const tempId = crypto.randomUUID();
    const newDoc: UploadedDoc = {
      id: tempId,
      name: file.name,
      size: file.size,
      status: "processing",
    };

    setDocuments((prev) => [...prev, newDoc]);

    try {
      const fileData = await fileToBase64(file);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const resp = await supabase.functions.invoke("rag-upload", {
        body: { file_name: file.name, file_data: fileData },
      });

      const result = resp.data;

      if (result?.error) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === tempId ? { ...d, status: "error", errorMessage: result.error } : d
          )
        );
        toast.error(result.error);
      } else if (result?.success) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === tempId
              ? { ...d, status: "ready", dbId: result.document_id }
              : d
          )
        );
        if (result.duplicate) {
          toast.info("File already indexed — skipping re-embedding.");
        } else {
          toast.success(`Document processed (${result.chunks_created} chunks).`);
        }
      }
    } catch (err) {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === tempId ? { ...d, status: "error", errorMessage: "Upload failed" } : d
        )
      );
      toast.error("Failed to upload document.");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteDoc = async (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (doc?.dbId) {
      // Delete from DB (chunks cascade)
      await supabase.from("rag_documents").delete().eq("id", doc.dbId);
    }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    toast.success("Document deleted.");
  };

  const handleReplaceDoc = (id: string) => {
    handleDeleteDoc(id);
    fileInputRef.current?.click();
  };

  const handleSend = async () => {
    if (!canSend) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const resp = await supabase.functions.invoke("rag-query", {
        body: { question: userMsg.content },
      });

      const result = resp.data;

      if (result?.error) {
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${result.error}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);

        if (result.questions_used !== undefined) {
          setQuestionsUsed(result.questions_used);
        }
      } else {
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.answer,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setQuestionsUsed(result.questions_used);
      }
    } catch (err) {
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "An error occurred while processing your question. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }

    setIsSending(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const statusConfig = {
    processing: { icon: Loader2, label: "Processing...", className: "text-yellow-600 animate-spin" },
    ready: { icon: CheckCircle2, label: "Ready", className: "text-green-600" },
    error: { icon: AlertCircle, label: "Error", className: "text-destructive" },
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Document Intelligence (RAG) – AI Playground | Exavo AI"
        description="Upload documents and ask questions powered by secure AI retrieval."
      />
      <Navigation />

      <main className="py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <Link
              to="/playground"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Playground
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold">Document Intelligence (RAG)</h1>
            <p className="text-muted-foreground mt-1">
              Upload documents and ask questions using enterprise-grade AI retrieval.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            {/* LEFT COLUMN – Document Management */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Documents</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Upload up to {MAX_DOCS} documents (max 5 MB each). PDF, TXT, DOCX only.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoadingDocs ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {documents.map((doc) => {
                        const StatusIcon = statusConfig[doc.status].icon;
                        return (
                          <div
                            key={doc.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
                          >
                            <FileText className="h-5 w-5 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {doc.size > 0 && <span>{formatFileSize(doc.size)}</span>}
                                <span className="flex items-center gap-1">
                                  <StatusIcon className={`h-3 w-3 ${statusConfig[doc.status].className}`} />
                                  {statusConfig[doc.status].label}
                                </span>
                              </div>
                              {doc.errorMessage && (
                                <p className="text-xs text-destructive mt-0.5">{doc.errorMessage}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleReplaceDoc(doc.id)}
                                title="Replace"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteDoc(doc.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {documents.length < MAX_DOCS && (
                        <Button
                          variant="outline"
                          className="w-full border-dashed"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Document
                        </Button>
                      )}

                      {documents.length >= MAX_DOCS && (
                        <p className="text-xs text-muted-foreground text-center">
                          Maximum {MAX_DOCS} documents reached. Delete one to upload a new file.
                        </p>
                      )}
                    </>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.docx"
                    onChange={handleFileUpload}
                  />
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN – Chat Interface */}
            <Card className="flex flex-col min-h-[500px] lg:min-h-[600px]">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Chat</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Questions remaining today:
                    </span>
                    <Badge
                      variant={questionsRemaining > 0 ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {questionsRemaining} / {DAILY_LIMIT}
                    </Badge>
                  </div>
                </div>
                {questionsRemaining <= 0 && (
                  <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-between">
                    <span className="text-xs text-destructive">Daily limit reached.</span>
                    <Button variant="outline" size="sm" className="h-6 text-xs">
                      Upgrade
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0">
                {/* Chat messages area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                      <FileText className="h-10 w-10 mb-3 opacity-40" />
                      {!hasReadyDocs ? (
                        <>
                          <p className="text-sm font-medium">No documents uploaded</p>
                          <p className="text-xs mt-1">
                            Upload at least one document to start asking questions.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium">Ready to answer</p>
                          <p className="text-xs mt-1">
                            Ask a question about your uploaded documents.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted border border-border"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}

                  {isSending && (
                    <div className="flex justify-start">
                      <div className="bg-muted border border-border rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing documents...
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input area */}
                <div className="border-t border-border p-3">
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                  >
                    <Input
                      placeholder={
                        !hasReadyDocs
                          ? "Upload a document first..."
                          : questionsRemaining <= 0
                          ? "Daily limit reached"
                          : "Ask a question about your documents..."
                      }
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={!hasReadyDocs || questionsRemaining <= 0 || isSending}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={!canSend}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PlaygroundRAG;
