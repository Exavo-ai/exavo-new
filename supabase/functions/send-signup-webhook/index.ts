import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupData {
  email: string;
  full_name: string;
  phone?: string;
  created_at?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signupData: SignupData = await req.json();
    
    console.log("Sending signup data to webhook:", signupData);

    const webhookUrl = "https://hook.eu1.make.com/h4zau5cf1lfy9zjow4znltuni8dbmu7s";
    
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: signupData.full_name,
        email: signupData.email,
        phone: signupData.phone || null,
        created_at: signupData.created_at || new Date().toISOString(),
        source: "exavo-platform",
      }),
    });

    if (!webhookResponse.ok) {
      console.error("Webhook response not OK:", webhookResponse.status, await webhookResponse.text());
      throw new Error(`Webhook returned status ${webhookResponse.status}`);
    }

    console.log("Webhook sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending signup webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
