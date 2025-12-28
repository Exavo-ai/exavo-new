import { Link } from "react-router-dom";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

export default function BillingCancel() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="Payment Cancelled - Exavo AI"
        description="Your payment was cancelled. No charges were made."
      />
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="max-w-lg w-full text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
            <CardDescription className="text-base">
              Your payment was cancelled and no charges were made to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you experienced any issues during checkout, please don't hesitate to contact our support team.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button asChild>
                <Link to="/pricing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Try Again
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
