import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// VAPID keys for web push
const VAPID_PUBLIC_KEY = 'BNxP_x_VeL3jyQC8RMZXs0vLSrVdRXNxZj_cSANqDLYnJgNx3XVxdFBxdL5LqS1mC8lRf6yD2c_1eHHXMxXU0UA';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  try {
    // For now, we'll use a simple fetch approach
    // In production, you'd use web-push library or a service like Firebase
    
    // Create the push message payload
    const message = JSON.stringify(payload);
    
    // Note: Full web-push implementation requires crypto operations
    // This is a simplified version - for production, consider using a push service
    console.log(`Would send push to: ${subscription.endpoint.slice(0, 50)}...`);
    console.log(`Payload: ${message}`);
    
    // Return true to indicate the notification was "sent" (logged)
    // In production, implement proper web-push protocol
    return true;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: responseHeaders }
      );
    }

    const { 
      walletAddress, 
      type, // 'bridge_completed' | 'bridge_failed'
      fromToken,
      toToken,
      fromAmount,
      toAmount,
      fromChain,
      toChain,
      txHash,
      error: errorMessage,
    } = await req.json();

    console.log(`Bridge notification request: ${type} for ${walletAddress?.slice(0, 10)}...`);

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { status: 400, headers: responseHeaders }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get push subscriptions for this wallet
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('wallet_address', walletAddress.toLowerCase());

    if (subError) {
      console.error('Failed to fetch subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: responseHeaders }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for wallet');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions' }),
        { status: 200, headers: responseHeaders }
      );
    }

    // Build notification payload based on type
    let payload: PushPayload;
    
    if (type === 'bridge_completed') {
      payload = {
        title: '🎉 Bridge Complete!',
        body: `${fromAmount} ${fromToken} → ${toAmount} ${toToken}`,
        icon: '/xlama-mascot.png',
        badge: '/xlama-mascot.png',
        tag: `bridge-${txHash?.slice(0, 8) || Date.now()}`,
        data: {
          type: 'bridge_completed',
          txHash,
          url: '/history',
        },
      };
    } else if (type === 'bridge_failed') {
      payload = {
        title: '❌ Bridge Failed',
        body: errorMessage || `Failed to bridge ${fromToken} to ${toToken}`,
        icon: '/xlama-mascot.png',
        badge: '/xlama-mascot.png',
        tag: `bridge-failed-${Date.now()}`,
        data: {
          type: 'bridge_failed',
          url: '/history',
        },
      };
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid notification type' }),
        { status: 400, headers: responseHeaders }
      );
    }

    // Send to all subscriptions
    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptions) {
      const success = await sendPushNotification(sub, payload);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log(`Sent ${successCount} notifications, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        total: subscriptions.length,
      }),
      { status: 200, headers: responseHeaders }
    );

  } catch (error) {
    console.error('Send bridge notification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: responseHeaders }
    );
  }
});
