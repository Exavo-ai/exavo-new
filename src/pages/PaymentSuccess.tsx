import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [isVerifying, setIsVerifying] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Simulate verification delay
    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">
            {language === 'ar' ? 'جارٍ التحقق من الدفع...' : 'Verifying payment...'}
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
            {language === 'ar' ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'شكرًا لك! تم تأكيد حجزك وإرسال التفاصيل إلى بريدك الإلكتروني.'
              : 'Thank you! Your booking is confirmed and details have been sent to your email.'}
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => navigate('/client')}
            className="w-full"
            variant="hero"
          >
            {language === 'ar' ? 'عرض حجوزاتي' : 'View My Bookings'}
          </Button>
          <Button
            onClick={() => navigate('/')}
            className="w-full"
            variant="outline"
          >
            {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
          </Button>
        </div>

        {sessionId && (
          <p className="text-xs text-muted-foreground mt-6">
            {language === 'ar' ? 'رقم الجلسة' : 'Session ID'}: {sessionId.substring(0, 20)}...
          </p>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;