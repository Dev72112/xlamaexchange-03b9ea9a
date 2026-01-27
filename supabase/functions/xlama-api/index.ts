import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const XLAMA_API_BASE = "https://ciandnwvnweoyoutaysb.supabase.co/functions/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("XLAMA_API_KEY");
    if (!apiKey) {
      console.error("XLAMA_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    // Remove "xlama-api" from the path to get the actual endpoint
    // Path format: /xlama-api/endpoint/params
    const endpointPath = pathParts.slice(1).join("/");
    
    if (!endpointPath) {
      return new Response(
        JSON.stringify({ error: "No endpoint specified", usage: "GET /xlama-api/{endpoint}" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the target URL with query params
    const targetUrl = new URL(`${XLAMA_API_BASE}/${endpointPath}`);
    url.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    console.log(`[xlama-api] Proxying ${req.method} to: ${targetUrl.toString()}`);

    // Forward the request to the external API
    const requestInit: RequestInit = {
      method: req.method,
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    };

    // Include body for POST/PUT/PATCH requests
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      try {
        const body = await req.text();
        if (body) {
          requestInit.body = body;
        }
      } catch {
        // No body to parse
      }
    }

    const response = await fetch(targetUrl.toString(), requestInit);
    const data = await response.text();

    console.log(`[xlama-api] Response status: ${response.status}`);

    // Parse JSON if possible, otherwise return as-is
    let responseBody: string;
    try {
      const jsonData = JSON.parse(data);
      responseBody = JSON.stringify(jsonData);
    } catch {
      responseBody = data;
    }

    return new Response(responseBody, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("[xlama-api] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Proxy error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
