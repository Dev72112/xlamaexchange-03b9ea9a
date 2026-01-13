import { useState, useEffect } from "react";
import { Layout } from "@/shared/components";
import { RpcDiagnostics } from "@/components/RpcDiagnostics";
import { CacheControls } from "@/components/CacheControls";
import { Helmet } from "react-helmet-async";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, Info, Settings, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

const BUILD_VERSION = "1.4.0";
const BUILD_DATE = new Date().toISOString().split('T')[0];

interface WalletConnectStatus {
  loading: boolean;
  configured: boolean;
  projectIdPreview: string | null;
  error: string | null;
}

const Debug = () => {
  const [walletConnectStatus, setWalletConnectStatus] = useState<WalletConnectStatus>({
    loading: true,
    configured: false,
    projectIdPreview: null,
    error: null,
  });

  // Fetch WalletConnect config from backend (matches how appkit.ts actually works)
  useEffect(() => {
    const checkWalletConnect = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
          setWalletConnectStatus({
            loading: false,
            configured: false,
            projectIdPreview: null,
            error: 'VITE_SUPABASE_URL not set',
          });
          return;
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/walletconnect-config`);
        const data = await response.json();
        
        const projectId = data.projectId;
        const isConfigured = Boolean(projectId && projectId.length > 0);
        
        setWalletConnectStatus({
          loading: false,
          configured: isConfigured,
          projectIdPreview: isConfigured ? `${projectId.slice(0, 4)}...${projectId.slice(-4)}` : null,
          error: null,
        });
      } catch (err: any) {
        setWalletConnectStatus({
          loading: false,
          configured: false,
          projectIdPreview: null,
          error: err.message || 'Failed to check',
        });
      }
    };

    checkWalletConnect();
  }, []);

  // Client-side env vars (these are injected at build time)
  const envVarConfig = [
    { 
      label: 'VITE_ALCHEMY_API_KEY', 
      value: import.meta.env.VITE_ALCHEMY_API_KEY,
      source: 'client',
      description: 'Enables private Alchemy RPC for better reliability. Falls back to public RPCs if not set.'
    },
    { 
      label: 'VITE_GA_MEASUREMENT_ID', 
      value: import.meta.env.VITE_GA_MEASUREMENT_ID,
      source: 'client',
      description: 'Google Analytics tracking. Optional for analytics.'
    },
  ];

  return (
    <Layout>
      <Helmet>
        <title>Debug Tools | xlama</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="container px-4 py-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Terminal className="w-6 h-6" />
            Debug Tools
          </h1>
          <Badge variant="secondary" className="font-mono">
            v{BUILD_VERSION}
          </Badge>
        </div>
        
        <div className="space-y-6">
          <RpcDiagnostics />
          
          <CacheControls />
          
          {/* Build Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Build Environment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 mb-4">
                {[
                  { label: 'Build Mode', value: import.meta.env.MODE },
                  { label: 'Base URL', value: import.meta.env.BASE_URL },
                  { label: 'Production', value: String(import.meta.env.PROD) },
                  { label: 'Build Date', value: BUILD_DATE },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {item.value}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Environment Variables with status */}
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">Optional Environment Variables</h4>
              <div className="space-y-3">
                {/* Client-side env vars */}
                {envVarConfig.map((item) => {
                  const isSet = Boolean(item.value);
                  return (
                    <div key={item.label} className="p-3 rounded-lg bg-muted/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.label}</span>
                        <Badge 
                          variant={isSet ? 'default' : 'outline'}
                          className={`text-xs ${isSet ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'text-muted-foreground'}`}
                        >
                          {isSet ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Set</>
                          ) : (
                            <><AlertTriangle className="w-3 h-3 mr-1" /> Not Set</>
                          )}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  );
                })}

                {/* WalletConnect - fetched from backend */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">VITE_WALLETCONNECT_PROJECT_ID</span>
                    {walletConnectStatus.loading ? (
                      <Badge variant="secondary" className="text-xs">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Checking...
                      </Badge>
                    ) : walletConnectStatus.configured ? (
                      <Badge 
                        variant="default"
                        className="text-xs bg-green-500/10 text-green-500 border-green-500/30"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> 
                        {walletConnectStatus.projectIdPreview}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Not Set
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enables WalletConnect (fetched from backend). OKX Direct connection works without this.
                    {walletConnectStatus.error && (
                      <span className="text-destructive block mt-1">Error: {walletConnectStatus.error}</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Notice */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-medium">How VITE_* Environment Variables Work</p>
                  <p className="text-muted-foreground">
                    Vite injects environment variables at <strong>build time</strong>, not runtime. 
                    After adding or updating secrets in Lovable Cloud, you must click 
                    <strong> Publish → Update</strong> to trigger a new production build that includes the updated values.
                  </p>
                  <p className="text-muted-foreground mt-2">
                    <strong>Note:</strong> All environment variables above are <strong>optional</strong>. 
                    The app works without them by using fallback options (public RPCs, OKX Direct connection).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Debug;
