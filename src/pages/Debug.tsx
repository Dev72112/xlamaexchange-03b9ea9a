import { Layout } from "@/shared/components";
import { RpcDiagnostics } from "@/components/RpcDiagnostics";
import { Helmet } from "react-helmet-async";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, Info, Settings } from "lucide-react";

const BUILD_VERSION = "1.2.0";
const BUILD_DATE = new Date().toISOString().split('T')[0];

const Debug = () => {
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
          
          {/* Environment Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Build Environment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {[
                  { label: 'Build Mode', value: import.meta.env.MODE },
                  { label: 'Base URL', value: import.meta.env.BASE_URL },
                  { label: 'Production', value: String(import.meta.env.PROD) },
                  { label: 'Build Date', value: BUILD_DATE },
                  { label: 'VITE_ALCHEMY_API_KEY', value: Boolean(import.meta.env.VITE_ALCHEMY_API_KEY) ? '✓ Present' : '✗ Missing' },
                  { label: 'VITE_WALLETCONNECT_PROJECT_ID', value: Boolean(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID) ? '✓ Present' : '✗ Missing' },
                  { label: 'VITE_GA_MEASUREMENT_ID', value: Boolean(import.meta.env.VITE_GA_MEASUREMENT_ID) ? '✓ Present' : '✗ Missing' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <Badge 
                      variant={item.value?.includes('✓') ? 'default' : item.value?.includes('✗') ? 'destructive' : 'secondary'}
                      className="font-mono text-xs"
                    >
                      {item.value}
                    </Badge>
                  </div>
                ))}
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
