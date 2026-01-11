import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isAlchemyConfigured, getSolanaRpcEndpoints } from '@/config/rpc';
import { Connection } from '@solana/web3.js';
import { CheckCircle, XCircle, Loader2, Wifi } from 'lucide-react';

interface TestResult {
  endpoint: string;
  success: boolean;
  blockhash?: string;
  latency?: number;
  error?: string;
}

export function RpcDiagnostics() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const alchemyConfigured = isAlchemyConfigured();
  const endpoints = getSolanaRpcEndpoints();

  // Mask API key in URL for display
  const maskEndpoint = (url: string) => {
    const match = url.match(/\/v2\/(.+)$/);
    if (match) {
      const key = match[1];
      return url.replace(key, `${key.slice(0, 4)}...${key.slice(-4)}`);
    }
    return url;
  };

  const testEndpoint = async (endpoint: string): Promise<TestResult> => {
    const start = Date.now();
    try {
      const connection = new Connection(endpoint, 'confirmed');
      const { blockhash } = await connection.getLatestBlockhash();
      return {
        endpoint,
        success: true,
        blockhash: blockhash.slice(0, 12) + '...',
        latency: Date.now() - start,
      };
    } catch (err: any) {
      return {
        endpoint,
        success: false,
        error: err.message || 'Unknown error',
        latency: Date.now() - start,
      };
    }
  };

  const runTests = async () => {
    setTesting(true);
    setResults([]);

    const testResults: TestResult[] = [];
    for (const endpoint of endpoints) {
      const result = await testEndpoint(endpoint);
      testResults.push(result);
      setResults([...testResults]);
      
      // Stop after first success to avoid unnecessary calls
      if (result.success) break;
    }

    setTesting(false);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wifi className="h-5 w-5" />
          Solana RPC Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuration Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Alchemy Configured</span>
            <Badge variant={alchemyConfigured ? 'default' : 'destructive'}>
              {alchemyConfigured ? 'Yes' : 'No'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">RPC Endpoints (priority order):</span>
            <div className="bg-muted/50 rounded-md p-2 text-xs font-mono space-y-1">
              {endpoints.map((ep, i) => (
                <div key={i} className="truncate">
                  {i + 1}. {maskEndpoint(ep)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Test Button */}
        <Button 
          onClick={runTests} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Solana RPC Connection'
          )}
        </Button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Test Results:</span>
            {results.map((result, i) => (
              <div 
                key={i} 
                className={`p-3 rounded-md text-sm ${
                  result.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-destructive/10 border border-destructive/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="font-mono text-xs truncate flex-1">
                    {maskEndpoint(result.endpoint)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {result.latency}ms
                  </span>
                </div>
                {result.success ? (
                  <div className="text-xs text-muted-foreground ml-6">
                    Blockhash: {result.blockhash}
                  </div>
                ) : (
                  <div className="text-xs text-destructive ml-6">
                    {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• If Alchemy shows "No", the VITE_ALCHEMY_API_KEY secret may not be set or the app needs a rebuild.</p>
          <p>• 403 errors on Alchemy mean domain restrictions may be blocking requests.</p>
          <p>• 429 errors indicate rate limiting.</p>
        </div>
      </CardContent>
    </Card>
  );
}
