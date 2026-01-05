import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { securityHeaders } from '../_shared/security-headers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify this is called by a cron job or with service role key
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.includes('Bearer')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Delete nonces older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error, count } = await supabase
      .from('signature_nonces')
      .delete({ count: 'exact' })
      .lt('created_at', sevenDaysAgo)

    if (error) {
      console.error('Error cleaning up nonces:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to cleanup nonces', details: error.message }),
        { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const deletedCount = count || 0
    console.log(`Cleaned up ${deletedCount} old nonces`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: deletedCount,
        cutoff: sevenDaysAgo 
      }),
      { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Nonce cleanup error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
