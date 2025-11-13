import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <a href="/" className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              AI Marketplace
            </a>
            
            <div className="hidden md:flex items-center gap-6">
              <a href="#tools" className="text-sm font-medium hover:text-primary transition-colors">
                AI Tools
              </a>
              <a href="#services" className="text-sm font-medium hover:text-primary transition-colors">
                Expert Services
              </a>
              <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
                Pricing
              </a>
              <a href="#about" className="text-sm font-medium hover:text-primary transition-colors">
                About
              </a>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost">Sign In</Button>
            <Button variant="hero">Get Started</Button>
          </div>
          
          <button
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        
        {isOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border">
            <a href="#tools" className="block text-sm font-medium hover:text-primary transition-colors">
              AI Tools
            </a>
            <a href="#services" className="block text-sm font-medium hover:text-primary transition-colors">
              Expert Services
            </a>
            <a href="#pricing" className="block text-sm font-medium hover:text-primary transition-colors">
              Pricing
            </a>
            <a href="#about" className="block text-sm font-medium hover:text-primary transition-colors">
              About
            </a>
            <div className="flex flex-col gap-2 pt-4">
              <Button variant="ghost" className="w-full">Sign In</Button>
              <Button variant="hero" className="w-full">Get Started</Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
