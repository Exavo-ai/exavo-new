import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const bottlenecks = [
  "Manual workflows slowing growth",
  "Disconnected tools and scattered data",
  "Hiring instead of automating",
  "Missed leads due to slow follow-ups",
  "No visibility into operational performance",
];

const bottlenecksAr = [
  "سير عمل يدوي يبطئ النمو",
  "أدوات غير مترابطة وبيانات مبعثرة",
  "التوظيف بدلاً من الأتمتة",
  "فقدان العملاء المحتملين بسبب بطء المتابعة",
  "عدم وجود رؤية لأداء العمليات",
];

const OperationalBottlenecks = () => {
  const { language } = useLanguage();
  const items = language === "ar" ? bottlenecksAr : bottlenecks;

  return (
    <section className="py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {language === "ar"
              ? "علامات أنك تجاوزت أنظمتك"
              : "Signs You've Outgrown Your Systems"}
          </h2>
        </div>
        <div className="max-w-2xl mx-auto space-y-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-4 bg-card border border-border rounded-xl p-5 hover:shadow-card transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
              <span className="text-foreground font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OperationalBottlenecks;
