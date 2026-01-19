import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Per-function rate limit configurations
export const RATE_LIMITS: Record<string, { maxRequests: number; windowSeconds: number }> = {
  // High-frequency endpoints (quote fetching, price checks)
  'okx-dex': { maxRequests: 100, windowSeconds: 60 },
  'price-history': { maxRequests: 60, windowSeconds: 60 },
  'crypto-news': { maxRequests: 30, windowSeconds: 60 },
  'zerion': { maxRequests: 60, windowSeconds: 60 },
  
  // Medium-frequency endpoints (transaction operations)
  'changenow': { maxRequests: 60, windowSeconds: 60 },
  'signed-orders': { maxRequests: 30, windowSeconds: 60 },
  
  // Low-frequency endpoints (sensitive operations)
  'register-referral': { maxRequests: 10, windowSeconds: 60 },
  'record-commission': { maxRequests: 20, windowSeconds: 60 },
  'submit-claim': { maxRequests: 5, windowSeconds: 60 },
  'send-bridge-notification': { maxRequests: 10, windowSeconds: 60 },
  
  // Default for any unlisted functions
  'default': { maxRequests: 30, windowSeconds: 60 },
};

export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

export async function checkRateLimit(
  functionName: string,
  clientIp: string
): Promise<{ allowed: boolean; remaining?: number }> {
  const config = RATE_LIMITS[functionName] || RATE_LIMITS['default'];
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Rate limit: Missing Supabase credentials, allowing request');
    return { allowed: true };
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: clientIp,
      p_function_name: functionName,
      p_max_requests: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    });
    
    if (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if rate limit check fails
      return { allowed: true };
    }
    
    return { 
      allowed: data === true,
      remaining: data === true ? config.maxRequests : 0
    };
  } catch (err) {
    console.error('Rate limit exception:', err);
    return { allowed: true };
  }
}

export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    { 
      status: 429, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Retry-After': '60'
      } 
    }
  );
}
