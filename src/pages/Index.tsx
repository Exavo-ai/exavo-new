import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import TrustBanner from "@/components/TrustBanner";
import HowWeHelp from "@/components/HowWeHelp";
import { RealWorkSection } from "@/components/RealWorkSection";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import SEO from "@/components/SEO";
import Newsletter from "@/components/Newsletter";

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEO 
        title="Exavo | AI Automation, AI Agents & Digital Solutions"
        description="Exavo builds AI automation, intelligent agents, and custom digital solutions to help businesses scale faster and operate smarter."
      />
      <Navigation />
      <main>
        <Hero />
        <HowItWorks />
        <TrustBanner />
        <HowWeHelp />
        <RealWorkSection />
        <Testimonials />
        <CTA />
        <FAQ />
      </main>
      <Newsletter />
      <Footer />
      <ChatWidget />
    </div>
  );
};

export default Index;
