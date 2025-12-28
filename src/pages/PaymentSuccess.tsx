import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface PaymentDetails {
  amount: number;
  currency: string;
  description: string;
  status: string;
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { session_id: sessionId },
      });

      if (error) throw error;

      if (data?.payment) {
        setPaymentDetails({
          amount: data.payment.amount,
          currency: data.payment.currency,
          description: data.payment.description || "Service Payment",
          status: data.payment.status,
        });
      }
    } catch (err) {
      console.error("[PAYMENT-SUCCESS] Verification error:", err);
      // Don't show error to user - payment may still be successful
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-md w-full bg-background rounded-lg shadow-elegant p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {language === "ar" ? "جاري التحقق من الدفع..." : "Verifying payment..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-md w-full bg-background rounded-lg shadow-elegant p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">
            {language === "ar" ? "تم الدفع بنجاح!" : "Payment Successful!"}
          </h1>
          <p className="text-muted-foreground">
            {language === "ar"
              ? "شكرًا لك! تم استلام الدفع بنجاح."
              : "Thank you! Your payment has been received successfully."}
          </p>
        </div>

        {paymentDetails && (
          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {language === "ar" ? "الوصف" : "Description"}
                </span>
                <span className="font-medium">{paymentDetails.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {language === "ar" ? "المبلغ" : "Amount"}
                </span>
                <span className="font-semibold text-green-600">
                  {paymentDetails.currency} {paymentDetails.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {language === "ar" ? "الحالة" : "Status"}
                </span>
                <span className="font-medium capitalize">{paymentDetails.status}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button onClick={() => navigate("/client/billing")} className="w-full" variant="hero">
            {language === "ar" ? "عرض الفواتير" : "View Billing"}
          </Button>

          <Button onClick={() => navigate("/client")} className="w-full" variant="outline">
            {language === "ar" ? "العودة للوحة التحكم" : "Back to Dashboard"}
          </Button>
        </div>

        {sessionId && (
          <p className="text-xs text-muted-foreground mt-6">
            {language === "ar" ? "رقم العملية" : "Session ID"}: {sessionId.substring(0, 20)}...
          </p>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
