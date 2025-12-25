import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-md w-full bg-background rounded-lg shadow-elegant p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">{language === "ar" ? "تم الدفع بنجاح!" : "Payment Successful!"}</h1>
          <p className="text-muted-foreground">
            {language === "ar"
              ? "شكرًا لك! تم استلام الدفع بنجاح."
              : "Thank you! Your payment has been received successfully."}
          </p>
        </div>

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
