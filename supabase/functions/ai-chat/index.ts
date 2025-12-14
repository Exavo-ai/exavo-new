import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'no-referrer-when-downgrade',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
};

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1, "Message content is required").max(10000, "Message too long"),
});

const chatSchema = z.object({
  messages: z.array(messageSchema).min(1, "At least one message is required").max(50, "Too many messages"),
  sessionId: z.string().min(1, "Session ID is required").max(100, "Session ID too long"),
});

function successResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Authorization header is required", 401);
    }

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Invalid or expired authentication token", 401);
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse("BAD_REQUEST", "Invalid JSON in request body", 400);
    }

    const validation = chatSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return errorResponse("VALIDATION_ERROR", firstError?.message || "Validation failed", 422);
    }

    const { messages, sessionId } = validation.data;

    // Check API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return errorResponse("INTERNAL_ERROR", "AI service not configured", 500);
    }

    // Store user message
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const lastMessage = messages[messages.length - 1];
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      session_id: sessionId,
      role: 'user',
      content: lastMessage.content
    });

    // System prompt
    const systemPrompt = `You are a helpful AI assistant for ExavoAI, a professional AI consulting and services company.

Your role is to:
1. Help clients navigate the website and find information
2. Answer questions about our services (AI consulting, custom AI solutions, automation, etc.)
3. Recommend appropriate services based on client needs
4. Assist with the booking process
5. Provide information about pricing and service details

Be professional, helpful, and concise. If a client wants to book a service, guide them to use the booking form.
Always respond in the same language the user is speaking (English or Arabic).`;

    // Call AI API
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse("RATE_LIMIT_EXCEEDED", "Rate limit exceeded. Please try again later.", 429);
      }
      if (response.status === 402) {
        return errorResponse("SERVICE_UNAVAILABLE", "AI service temporarily unavailable", 503);
      }
      return errorResponse("AI_ERROR", "Failed to get AI response", 502);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Store assistant message
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      session_id: sessionId,
      role: 'assistant',
      content: assistantMessage
    });

    return successResponse({ message: assistantMessage });

  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
});
