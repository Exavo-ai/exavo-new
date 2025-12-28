import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

export default function BillingSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Brief delay to let webhook process
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="Payment Successful - Exavo AI"
        description="Your payment was successful. Thank you for your purchase!"
      />
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="max-w-lg w-full text-center">
          <CardHeader className="pb-4">
            {loading ? (
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            )}
            <CardTitle className="text-2xl">
              {loading ? "Processing Payment..." : "Payment Successful!"}
            </CardTitle>
            <CardDescription className="text-base">
              {loading 
                ? "Please wait while we confirm your payment."
                : "Thank you for your purchase. Your credits have been added to your account."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionId && (
              <p className="text-xs text-muted-foreground">
                Session ID: {sessionId}
              </p>
            )}
            
            {!loading && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button asChild>
                  <Link to="/client/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/pricing">
                    Buy More Credits
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
