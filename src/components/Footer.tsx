import { Linkedin, Twitter, Mail, MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import exavoLogo from "@/assets/exavo-logo.png";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src={exavoLogo} alt="Exavo AI" className="h-8 w-8" />
              <h3 className="text-lg font-bold bg-gradient-hero bg-clip-text text-transparent">Exavo AI</h3>
            </div>
            <p className="text-sm text-muted-foreground">Making AI accessible for every business.</p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Linkedin className="w-5 h-5" /></a>
              <a href="mailto:ahmed@exavoai.io" className="text-muted-foreground hover:text-primary transition-colors"><Mail className="w-5 h-5" /></a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Solutions</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/services" className="hover:text-primary transition-colors">AI Chatbot</a></li>
              <li><a href="/services" className="hover:text-primary transition-colors">Automation</a></li>
              <li><a href="/services" className="hover:text-primary transition-colors">Analytics</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/about" className="hover:text-primary transition-colors">{t('nav.about')}</a></li>
              <li><a href="/blog" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="/faq" className="hover:text-primary transition-colors">FAQ</a></li>
              <li><a href="/contact" className="hover:text-primary transition-colors">{t('nav.contact')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" /><a href="mailto:ahmed@exavoai.io">ahmed@exavoai.io</a></li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" />+20 123 456 789</li>
              <li className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5" />Cairo, Egypt</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Exavo AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
