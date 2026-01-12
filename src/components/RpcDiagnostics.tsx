import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isAlchemyConfigured, getSolanaRpcEndpoints, getRpcDiagnostics } from '@/config/rpc';
import { Connection } from '@solana/web3.js';
import { CheckCircle, XCircle, Loader2, Wifi, RefreshCw, AlertTriangle } from 'lucide-react';

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

  const diagnostics = getRpcDiagnostics();
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
        {/* Build Info Alert */}
        {!alchemyConfigured && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-warning">Alchemy API Key Not Detected</p>
              <p className="text-muted-foreground">
                This build doesn't have VITE_ALCHEMY_API_KEY injected. 
                After adding the secret in Lovable Cloud, you must click <strong>Publish → Update</strong> to rebuild.
              </p>
            </div>
          </div>
        )}

        {/* Configuration Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <span className="text-sm font-medium">Alchemy Configured</span>
            <Badge variant={alchemyConfigured ? 'default' : 'destructive'} className="font-mono">
              {alchemyConfigured ? 'Yes' : 'No'}
            </Badge>
          </div>
          
          {alchemyConfigured && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span className="text-sm font-medium">API Key Length</span>
              <Badge variant="secondary" className="font-mono">
                {diagnostics.keyLength} chars
              </Badge>
            </div>
          )}
          
          <div className="space-y-1.5">
            <span className="text-sm font-medium">RPC Endpoints (priority order):</span>
            <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono space-y-1.5">
              {endpoints.map((ep, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-4">{i + 1}.</span>
                  <span className="truncate">{maskEndpoint(ep)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Test Button */}
        <Button 
          onClick={runTests} 
          disabled={testing}
          className="w-full gap-2"
          size="lg"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Test Solana RPC Connection
            </>
          )}
        </Button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Test Results:</span>
            {results.map((result, i) => (
              <div 
                key={i} 
                className={`p-3 rounded-lg text-sm ${
                  result.success 
                    ? 'bg-success/10 border border-success/30' 
                    : 'bg-destructive/10 border border-destructive/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  )}
                  <span className="font-mono text-xs truncate flex-1">
                    {maskEndpoint(result.endpoint)}
                  </span>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {result.latency}ms
                  </Badge>
                </div>
                {result.success ? (
                  <div className="text-xs text-muted-foreground ml-6 font-mono">
                    Blockhash: {result.blockhash}
                  </div>
                ) : (
                  <div className="text-xs text-destructive ml-6 break-words">
                    {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Help Text */}
        <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground">Troubleshooting:</p>
          <p>• <strong>Alchemy "No":</strong> Secret not set or app needs rebuild (Publish → Update)</p>
          <p>• <strong>403 errors:</strong> Domain restrictions in Alchemy dashboard</p>
          <p>• <strong>429 errors:</strong> Rate limiting, wait and retry</p>
        </div>
      </CardContent>
    </Card>
  );
}
