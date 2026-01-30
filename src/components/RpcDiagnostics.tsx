import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlowBar } from '@/components/ui/glow-bar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  isAlchemyConfigured, 
  getSolanaRpcEndpoints, 
  getRpcDiagnostics,
  getSolanaAlchemyEndpoint,
  getEvmAlchemyEndpoint 
} from '@/config/rpc';
import { CheckCircle, XCircle, Loader2, Wifi, RefreshCw, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface TestResult {
  endpoint: string;
  success: boolean;
  blockhash?: string;
  latency?: number;
  error?: string;
  httpStatus?: number;
  errorType?: 'auth' | 'cors' | 'rate-limit' | 'network' | 'unknown';
}

interface EvmTestResult {
  endpoint: string;
  success: boolean;
  chainId?: string;
  latency?: number;
  error?: string;
  httpStatus?: number;
}

export function RpcDiagnostics() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [evmResult, setEvmResult] = useState<EvmTestResult | null>(null);

  const diagnostics = getRpcDiagnostics();
  const alchemyConfigured = isAlchemyConfigured();
  const endpoints = getSolanaRpcEndpoints();
  const keyDiag = diagnostics.keyDiagnostics;

  // Mask API key in URL for display
  const maskEndpoint = (url: string) => {
    const match = url.match(/\/v2\/(.+)$/);
    if (match) {
      const key = match[1];
      return url.replace(key, `${key.slice(0, 4)}...${key.slice(-4)}`);
    }
    return url;
  };

  // Raw JSON-RPC test using fetch (to get HTTP status)
  const testEndpointRaw = async (endpoint: string): Promise<TestResult> => {
    const start = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getLatestBlockhash',
          params: [{ commitment: 'finalized' }]
        })
      });
      
      const latency = Date.now() - start;
      const httpStatus = response.status;
      
      if (!response.ok) {
        let errorType: TestResult['errorType'] = 'unknown';
        if (httpStatus === 401 || httpStatus === 403) {
          errorType = 'auth';
        } else if (httpStatus === 429) {
          errorType = 'rate-limit';
        }
        
        const text = await response.text().catch(() => '');
        return {
          endpoint,
          success: false,
          error: `HTTP ${httpStatus}: ${text.slice(0, 100)}`,
          latency,
          httpStatus,
          errorType,
        };
      }
      
      const json = await response.json();
      
      if (json.error) {
        return {
          endpoint,
          success: false,
          error: json.error.message || JSON.stringify(json.error),
          latency,
          httpStatus,
          errorType: 'unknown',
        };
      }
      
      const blockhash = json.result?.value?.blockhash;
      return {
        endpoint,
        success: true,
        blockhash: blockhash ? blockhash.slice(0, 12) + '...' : 'received',
        latency,
        httpStatus,
      };
    } catch (err: any) {
      const latency = Date.now() - start;
      // TypeError: Failed to fetch usually means CORS or network issue
      const isCorsOrNetwork = err.name === 'TypeError' && err.message?.includes('fetch');
      return {
        endpoint,
        success: false,
        error: err.message || 'Unknown error',
        latency,
        errorType: isCorsOrNetwork ? 'cors' : 'network',
      };
    }
  };

  // Test EVM endpoint (Ethereum mainnet)
  const testEvmEndpoint = async (): Promise<EvmTestResult | null> => {
    const endpoint = getEvmAlchemyEndpoint();
    if (!endpoint) return null;
    
    const start = Date.now();
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_chainId',
          params: []
        })
      });
      
      const latency = Date.now() - start;
      const httpStatus = response.status;
      
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return {
          endpoint,
          success: false,
          error: `HTTP ${httpStatus}: ${text.slice(0, 100)}`,
          latency,
          httpStatus,
        };
      }
      
      const json = await response.json();
      
      if (json.error) {
        return {
          endpoint,
          success: false,
          error: json.error.message || JSON.stringify(json.error),
          latency,
          httpStatus,
        };
      }
      
      return {
        endpoint,
        success: true,
        chainId: json.result,
        latency,
        httpStatus,
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
    setEvmResult(null);

    // Test EVM first if Alchemy is configured
    if (alchemyConfigured) {
      const evm = await testEvmEndpoint();
      setEvmResult(evm);
    }

    // Test Solana endpoints
    const testResults: TestResult[] = [];
    for (const endpoint of endpoints) {
      const result = await testEndpointRaw(endpoint);
      testResults.push(result);
      setResults([...testResults]);
      
      // Stop after first success to avoid unnecessary calls
      if (result.success) break;
    }

    setTesting(false);
  };

  // Get error explanation based on type/status
  const getErrorExplanation = (result: TestResult | EvmTestResult) => {
    const status = result.httpStatus;
    const errorType = 'errorType' in result ? result.errorType : undefined;
    
    if (status === 401) {
      return 'API key is invalid or not authorized for this endpoint.';
    }
    if (status === 403) {
      return 'Access forbidden. Key may not be enabled for Solana, or domain restrictions are blocking requests.';
    }
    if (status === 429) {
      return 'Rate limited. Wait a moment and try again.';
    }
    if (errorType === 'cors') {
      return 'CORS/Network error. The browser cannot reach this endpoint.';
    }
    return null;
  };

  return (
    <Card className="border-border bg-card overflow-hidden">
      <GlowBar variant="warning" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wifi className="h-5 w-5" />
          RPC Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Sanity Warnings */}
        {alchemyConfigured && (keyDiag.hasQuotes || keyDiag.hasWhitespace || !keyDiag.isValid) && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-warning">Key Format Warning</p>
              <ul className="text-muted-foreground text-xs space-y-0.5">
                {keyDiag.hasQuotes && <li>• Key contained surrounding quotes (auto-stripped)</li>}
                {keyDiag.hasWhitespace && <li>• Key contained whitespace (auto-trimmed)</li>}
                {!keyDiag.isValid && <li>• Key length ({keyDiag.sanitizedLength}) is unusual (expected 20-64 chars)</li>}
              </ul>
            </div>
          </div>
        )}

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
            <>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm font-medium">API Key Length</span>
                <Badge variant="secondary" className="font-mono">
                  {diagnostics.keyLength} chars
                  {keyDiag.rawLength !== keyDiag.sanitizedLength && (
                    <span className="text-xs ml-1 opacity-60">(raw: {keyDiag.rawLength})</span>
                  )}
                </Badge>
              </div>
            </>
          )}
          
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Solana RPC (Alchemy Only):</span>
            {endpoints.length > 0 ? (
              <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                <span className="truncate">{maskEndpoint(endpoints[0])}</span>
              </div>
            ) : (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-xs text-destructive">
                No RPC configured. Solana swaps will fail until VITE_ALCHEMY_API_KEY is added and app is rebuilt.
              </div>
            )}
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
              Test RPC Connections
            </>
          )}
        </Button>

        {/* EVM Test Result */}
        {evmResult && (
          <div className="space-y-2">
            <span className="text-sm font-medium">EVM (Ethereum) Test:</span>
            <div 
              className={`p-3 rounded-lg text-sm ${
                evmResult.success 
                  ? 'bg-success/10 border border-success/30' 
                  : 'bg-destructive/10 border border-destructive/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {evmResult.success ? (
                  <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                )}
                <span className="font-mono text-xs truncate flex-1">
                  {maskEndpoint(evmResult.endpoint)}
                </span>
                <Badge variant="secondary" className="text-xs font-mono">
                  {evmResult.latency}ms
                </Badge>
                {evmResult.httpStatus && (
                  <Badge variant={evmResult.success ? 'default' : 'destructive'} className="text-xs font-mono">
                    {evmResult.httpStatus}
                  </Badge>
                )}
              </div>
              {evmResult.success ? (
                <div className="text-xs text-muted-foreground ml-6 font-mono">
                  Chain ID: {evmResult.chainId}
                </div>
              ) : (
                <>
                  <div className="text-xs text-destructive ml-6 break-words">
                    {evmResult.error}
                  </div>
                  {getErrorExplanation(evmResult) && (
                    <div className="text-xs text-warning ml-6 mt-1 flex items-start gap-1">
                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {getErrorExplanation(evmResult)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Solana Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Solana Test Results:</span>
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
                  {result.httpStatus && (
                    <Badge variant={result.success ? 'default' : 'destructive'} className="text-xs font-mono">
                      {result.httpStatus}
                    </Badge>
                  )}
                </div>
                {result.success ? (
                  <div className="text-xs text-muted-foreground ml-6 font-mono">
                    Blockhash: {result.blockhash}
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-destructive ml-6 break-words">
                      {result.error}
                    </div>
                    {getErrorExplanation(result) && (
                      <div className="text-xs text-warning ml-6 mt-1 flex items-start gap-1">
                        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {getErrorExplanation(result)}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Help Text */}
        <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground">Troubleshooting (Alchemy-Only Mode):</p>
          <p>• <strong>Alchemy "No":</strong> Secret not set or app needs rebuild (Publish → Update)</p>
          <p>• <strong>No RPC configured:</strong> Add VITE_ALCHEMY_API_KEY, then Publish → Update</p>
          <p>• <strong>401 error:</strong> API key is invalid or wrong</p>
          <p>• <strong>403 error:</strong> Key not enabled for Solana (enable in Alchemy dashboard)</p>
          <p>• <strong>429 error:</strong> Rate limiting, wait and retry</p>
        </div>
      </CardContent>
    </Card>
  );
}
