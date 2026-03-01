
-- RAG Documents table
CREATE TABLE IF NOT EXISTS public.rag_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rag_documents_user_id ON public.rag_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_user_hash ON public.rag_documents(user_id, file_hash);

ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_documents FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents" ON public.rag_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON public.rag_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON public.rag_documents
  FOR DELETE USING (auth.uid() = user_id);

-- RAG Chunks table
CREATE TABLE IF NOT EXISTS public.rag_chunks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.rag_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  chunk_text text NOT NULL,
  embedding_json text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_user_id ON public.rag_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_document_id ON public.rag_chunks(document_id);

ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_chunks FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chunks" ON public.rag_chunks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chunks" ON public.rag_chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chunks" ON public.rag_chunks
  FOR DELETE USING (auth.uid() = user_id);

-- RAG Usage table
CREATE TABLE IF NOT EXISTS public.rag_usage (
  user_id uuid NOT NULL,
  date date NOT NULL,
  questions_used integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.rag_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_usage FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage" ON public.rag_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own usage" ON public.rag_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" ON public.rag_usage
  FOR UPDATE USING (auth.uid() = user_id);
