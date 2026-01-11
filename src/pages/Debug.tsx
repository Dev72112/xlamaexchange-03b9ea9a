import { Layout } from "@/shared/components";
import { RpcDiagnostics } from "@/components/RpcDiagnostics";
import { Helmet } from "react-helmet-async";

const Debug = () => {
  return (
    <Layout>
      <Helmet>
        <title>Debug Tools | xlama</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="container px-4 py-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug Tools v1.1</h1>
        
        <div className="space-y-6">
          <RpcDiagnostics />
          
          {/* Environment Info */}
          <div className="p-4 rounded-lg bg-muted/50 text-xs font-mono space-y-1">
            <p>Build Mode: {import.meta.env.MODE}</p>
            <p>Base URL: {import.meta.env.BASE_URL}</p>
            <p>Prod: {String(import.meta.env.PROD)}</p>
            <p>VITE_ALCHEMY_API_KEY present: {String(Boolean(import.meta.env.VITE_ALCHEMY_API_KEY))}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Debug;
