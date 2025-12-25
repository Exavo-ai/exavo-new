import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState(false);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setIsVerifying(false);
        return;
      }

      try {
        const res = await fetch("/functions/v1/verify-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // 👈 السطر المهم
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!res.ok) {
          throw new Error("Verification request failed");
        }

        const data = await res.json();

        if (!data?.success) {
          throw new Error("Payment not verified");
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        setVerificationError(true);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">
            {language === "ar" ? "جارٍ التحقق من الدفع..." : "Verifying payment..."}
          </p>
        </div>
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-md w-full bg-background rounded-lg shadow-elegant p-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-500">
            {language === "ar" ? "حدث خطأ أثناء التحقق من الدفع" : "Payment verification failed"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {language === "ar"
              ? "من فضلك تواصل مع الدعم إذا تم الخصم من حسابك."
              : "Please contact support if your card was charged."}
          </p>
          <Button onClick={() => navigate("/client/billing")} className="w-full">
            {language === "ar" ? "الذهاب إلى الفواتير" : "Go to Billing"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-md w-full bg-background rounded-lg shadow-elegant p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">{language === "ar" ? "تم الدفع بنجاح!" : "Payment Successful!"}</h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "شكرًا لك! تم تأكيد الدفع بنجاح." : "Thank you! Your payment has been confirmed."}
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={() => navigate("/client")} className="w-full" variant="hero">
            {language === "ar" ? "عرض حسابي" : "Go to Dashboard"}
          </Button>
          <Button onClick={() => navigate("/client/billing")} className="w-full" variant="outline">
            {language === "ar" ? "عرض الفواتير" : "View Billing"}
          </Button>
        </div>

        {sessionId && (
          <p className="text-xs text-muted-foreground mt-6">
            {language === "ar" ? "رقم الجلسة" : "Session ID"}: {sessionId.substring(0, 20)}...
          </p>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
