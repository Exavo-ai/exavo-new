import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const FAQ = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const faqs = [
    {
      question: "What AI services does Exavo AI offer?",
      answer: "We offer comprehensive AI solutions including chatbot development, business process automation, predictive analytics, natural language processing, computer vision, and custom machine learning models tailored to your business needs."
    },
    {
      question: "How long does it take to implement an AI solution?",
      answer: "Implementation time varies based on complexity. Simple chatbots can be deployed in 1-2 weeks, while custom AI systems may take 4-12 weeks. We provide a detailed timeline during our initial consultation."
    },
    {
      question: "Do I need technical expertise to use your AI tools?",
      answer: "No! Our AI solutions are designed to be user-friendly and intuitive. We provide comprehensive training and 24/7 support to ensure your team can effectively use and manage all AI tools."
    },
    {
      question: "What industries do you serve?",
      answer: "We serve a wide range of industries including healthcare, finance, retail, manufacturing, education, and professional services. Our AI solutions are customizable to meet specific industry requirements."
    },
    {
      question: "How secure is my data with Exavo AI?",
      answer: "Security is our top priority. We use bank-level encryption, comply with GDPR and international data protection standards, and implement strict access controls. Your data is stored securely and never shared with third parties."
    },
    {
      question: "What kind of support do you provide?",
      answer: "We offer 24/7 technical support, dedicated account managers, regular system maintenance, and continuous optimization. Our team is always available via chat, email, and phone."
    },
    {
      question: "Can I integrate your AI with my existing systems?",
      answer: "Yes! Our AI solutions are designed for seamless integration with popular platforms and tools including CRM systems, databases, communication tools, and custom applications through APIs."
    },
    {
      question: "What is your pricing model?",
      answer: "We offer flexible pricing based on your needs - from monthly subscriptions to custom enterprise packages. Schedule a consultation to discuss a plan that fits your budget and requirements."
    },
    {
      question: "Do you offer a free trial or demo?",
      answer: "Yes! We provide free consultations and demos to showcase how our AI solutions can benefit your business. Book a demo to see our technology in action."
    },
    {
      question: "How do I get started with Exavo AI?",
      answer: "Simply book a consultation through our website. Our team will assess your needs, provide recommendations, and create a customized implementation plan to get you started."
    }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                Frequently Asked <span className="bg-gradient-hero bg-clip-text text-transparent">Questions</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Find answers to common questions about Exavo AI services and solutions
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="bg-card border border-border rounded-lg px-6 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <AccordionTrigger className="text-left hover:text-primary transition-colors">
                      <span className="text-lg font-semibold">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-20 bg-gradient-accent/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="max-w-4xl mx-auto p-12 text-center bg-gradient-card border-primary/20">
              <MessageCircle className="w-16 h-16 mx-auto mb-6 text-primary" />
              <h2 className="text-3xl font-bold mb-4">
                Still have questions?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Our team is here to help. Contact us for personalized assistance.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/contact')}
                  className="bg-gradient-hero hover:shadow-glow-lg transition-all"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/booking')}
                >
                  Book a Consultation
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default FAQ;
