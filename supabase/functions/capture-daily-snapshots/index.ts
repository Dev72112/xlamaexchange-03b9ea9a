import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OKX DEX API configuration
const OKX_API_BASE = 'https://www.okx.com';
const ALL_CHAIN_INDICES = '1,56,137,42161,10,43114,250,8453,324,59144,534352,196,81457,501';

interface WalletBalance {
  chainIndex: string;
  tokenContractAddress: string;
  symbol: string;
  balance: string;
  tokenPrice: string;
}

async function fetchWalletBalances(address: string): Promise<WalletBalance[]> {
  const OKX_API_KEY = Deno.env.get('OKX_API_KEY');
  const OKX_SECRET_KEY = Deno.env.get('OKX_SECRET_KEY');
  const OKX_API_PASSPHRASE = Deno.env.get('OKX_API_PASSPHRASE');
  const OKX_PROJECT_ID = Deno.env.get('OKX_PROJECT_ID');

  if (!OKX_API_KEY || !OKX_SECRET_KEY || !OKX_API_PASSPHRASE) {
    console.error('Missing OKX API credentials');
    return [];
  }

  const timestamp = new Date().toISOString();
  const path = `/api/v5/dex/balance/all-token-balances-by-address?address=${address}&chainIndex=${ALL_CHAIN_INDICES}&excludeRiskToken=true`;
  
  // Create signature
  const message = timestamp + 'GET' + path;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(OKX_SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  const headers: Record<string, string> = {
    'OK-ACCESS-KEY': OKX_API_KEY,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': OKX_API_PASSPHRASE,
    'Content-Type': 'application/json',
  };

  if (OKX_PROJECT_ID) {
    headers['OK-ACCESS-PROJECT'] = OKX_PROJECT_ID;
  }

  try {
    const response = await fetch(`${OKX_API_BASE}${path}`, { headers });
    const data = await response.json();

    if (data.code !== '0' || !data.data) {
      console.error('OKX API error:', data.msg);
      return [];
    }

    const balances: WalletBalance[] = [];
    for (const chain of data.data) {
      if (chain.tokenAssets) {
        for (const token of chain.tokenAssets) {
          balances.push({
            chainIndex: chain.chainIndex,
            tokenContractAddress: token.tokenContractAddress || 'native',
            symbol: token.symbol,
            balance: token.balance,
            tokenPrice: token.tokenPrice || '0',
          });
        }
      }
    }
    return balances;
  } catch (error) {
    console.error('Error fetching balances for', address, error);
    return [];
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authorization
  const authHeader = req.headers.get('Authorization');
  const expectedToken = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!authHeader || !authHeader.includes(expectedToken || '')) {
    console.error('Unauthorized request');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Create Supabase client with service role for bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get active wallet users (seen in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: users, error: usersError } = await supabase
      .from('wallet_users')
      .select('user_address')
      .gte('last_seen_at', thirtyDaysAgo.toISOString());

    if (usersError) {
      console.error('Error fetching wallet users:', usersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${users?.length || 0} active wallet users`);

    const today = new Date().toISOString().slice(0, 10);
    let processedCount = 0;
    let insertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users || []) {
      processedCount++;
      const address = user.user_address;

      try {
        // Fetch balances from OKX
        const balances = await fetchWalletBalances(address);

        if (balances.length === 0) {
          console.log(`No balances for ${address}`);
          skippedCount++;
          continue;
        }

        // Prepare snapshot records
        const snapshotRecords = balances
          .filter(b => parseFloat(b.balance) > 0)
          .map(b => {
            const balance = parseFloat(b.balance);
            const price = parseFloat(b.tokenPrice) || 0;
            const valueUsd = balance * price;

            return {
              user_address: address.toLowerCase(),
              chain_index: b.chainIndex,
              token_address: b.tokenContractAddress || 'native',
              token_symbol: b.symbol,
              token_logo: null,
              balance: b.balance,
              price_at_snapshot: price > 0 ? price : null,
              value_usd: valueUsd > 0 ? valueUsd : null,
              snapshot_type: 'daily',
              snapshot_date: today,
            };
          });

        if (snapshotRecords.length === 0) {
          skippedCount++;
          continue;
        }

        // Insert with ON CONFLICT DO NOTHING (via unique constraint)
        const { error: insertError } = await supabase
          .from('wallet_snapshots')
          .upsert(snapshotRecords, { 
            onConflict: 'user_address,snapshot_type,snapshot_date,chain_index,token_address',
            ignoreDuplicates: true
          });

        if (insertError) {
          console.error(`Error inserting snapshot for ${address}:`, insertError);
          errorCount++;
        } else {
          insertedCount += snapshotRecords.length;
          console.log(`Captured daily snapshot for ${address}: ${snapshotRecords.length} tokens`);
        }

        // Rate limiting: wait 100ms between users to avoid OKX rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Error processing ${address}:`, err);
        errorCount++;
      }
    }

    const result = {
      success: true,
      date: today,
      usersProcessed: processedCount,
      tokensInserted: insertedCount,
      usersSkipped: skippedCount,
      errors: errorCount,
    };

    console.log('Daily snapshot complete:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Daily snapshot error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
