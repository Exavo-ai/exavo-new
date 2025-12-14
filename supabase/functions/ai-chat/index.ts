import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit, createRateLimitKey, RateLimitPresets } from "../_shared/rate-limit.ts";

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
    // Rate limiting check - 20 requests per minute for AI
    const rateLimitKey = createRateLimitKey(req, "ai-chat");
    const rateCheck = checkRateLimit(rateLimitKey, RateLimitPresets.AI);
    
    if (!rateCheck.allowed) {
      console.log("[AI-CHAT] Rate limit exceeded for:", rateLimitKey);
      return errorResponse("RATE_LIMIT_EXCEEDED", "Too many requests. Please try again later.", 429);
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

    // Fetch available services and packages for context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: servicesData } = await supabase
      .from('services')
      .select(`
        id,
        name,
        description,
        category,
        service_packages (
          id,
          package_name,
          price,
          currency,
          description,
          delivery_time
        )
      `)
      .eq('active', true);

    const servicesContext = servicesData?.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      packages: s.service_packages?.map((p: any) => ({
        id: p.id,
        name: p.package_name,
        price: `${p.price} ${p.currency}`,
        description: p.description,
        delivery: p.delivery_time
      }))
    })) || [];

    // Concierge system prompt
    const systemPrompt = `You are an AI Concierge for Exavo AI, a one-stop AI marketplace helping small and mid-sized businesses adopt AI easily and affordably.

## YOUR ROLE
You are a friendly, consultative guide — NOT a Q&A bot. Your job is to understand the visitor's business goal and recommend the right service package.

## CONVERSATION FLOW
1. **Opening**: Start with a warm, brief greeting and ask ONE question: "What are you hoping to achieve with AI?" or similar.
2. **Discovery**: Ask at most 2-3 short follow-up questions to understand:
   - Their industry/business type
   - The specific outcome they want (save time, increase leads, automate tasks, etc.)
   - Their timeline (urgent vs. exploring)
3. **Recommendation**: Based on their answers, recommend ONE specific service and package from the catalog below. Explain briefly why it fits their needs.
4. **Call to Action**: Encourage them to book by saying something like "Ready to get started? I can open the booking form with this package selected for you." Include this exact format when recommending: [RECOMMEND:service_id:package_id]

## AVAILABLE SERVICES & PACKAGES
${JSON.stringify(servicesContext, null, 2)}

## ABOUT EXAVO AI (Use as source of truth)
- Exavo AI removes AI complexity for non-technical founders
- We provide ready-to-use AI solutions and expert-led projects
- Target audience: Small businesses, SMEs, non-technical founders, agencies, startups
- What we offer: AI automation systems, AI-powered websites, Custom CRM development, Pre-built AI projects, Expert AI workflows and consulting
- Delivery: 3 to 14 days depending on the package
- Exavo is NOT a freelancer marketplace — we provide curated, managed AI solutions
- Contact: info@exavoai.com or https://exavo.ai

## RULES
- Be conversational, warm, and concise (1-3 short sentences per message)
- Never invent services, prices, or features not in the catalog
- If you're unsure what to recommend, suggest they "Book a Free Demo Call" so our team can help
- Always respond in the same language the user speaks (English or Arabic)
- If asked about something outside our services, politely redirect to what we can help with
- Don't ask all questions at once — have a natural back-and-forth conversation`;

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
      console.error("[AI-CHAT] API error:", response.status);
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

    return successResponse({ message: assistantMessage });

  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
});
