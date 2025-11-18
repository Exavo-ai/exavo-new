import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

const Contact = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                {t('contact.title')}
              </h1>
              <p className="text-xl text-muted-foreground">
                {t('contact.subtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12">
                {/* Contact Form */}
                <div className="animate-fade-in">
                  <div className="bg-card rounded-2xl p-8 border border-border shadow-card">
                    <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
                    <form className="space-y-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium mb-2">
                          {t('contact.name')}
                        </label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="John Doe"
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-2">
                          {t('contact.email')}
                        </label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium mb-2">
                          {t('contact.phone')}
                        </label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+61 4XX XXX XXX"
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="message" className="block text-sm font-medium mb-2">
                          {t('contact.message')}
                        </label>
                        <Textarea
                          id="message"
                          placeholder="Tell us about your project..."
                          className="w-full min-h-[150px]"
                        />
                      </div>
                      
                      <Button variant="hero" className="w-full shadow-glow">
                        {t('contact.send')}
                      </Button>
                    </form>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-8 animate-fade-in-up">
                  <div className="bg-card rounded-2xl p-8 border border-border shadow-card">
                    <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
                    
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center shrink-0">
                          <Mail className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">Email</h3>
                          <a href="mailto:info@exavo.ai" className="text-muted-foreground hover:text-primary transition-colors">
                            info@exavo.ai
                          </a>
                        </div>
                      </div>
                      
                      
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center shrink-0">
                          <MapPin className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">Location</h3>
                          <p className="text-muted-foreground">
                            Sydney, Australia
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center shrink-0">
                          <Clock className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">Working Hours</h3>
                          <p className="text-muted-foreground">
                            Sunday - Thursday<br />
                            9:00 AM - 6:00 PM (EET)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Map Placeholder */}
                  <div className="bg-card rounded-2xl p-4 border border-border shadow-card overflow-hidden">
                    <div className="w-full h-64 bg-gradient-accent rounded-lg flex items-center justify-center">
                      <MapPin className="w-16 h-16 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
