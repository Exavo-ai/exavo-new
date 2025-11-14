import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Stats from "@/components/Stats";
import Testimonials from "@/components/Testimonials";
import UseCases from "@/components/UseCases";
import PricingSection from "@/components/Pricing";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import SocialProof from "@/components/SocialProof";
import ChatWidget from "@/components/ChatWidget";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <Features />
        <SocialProof />
        <Stats />
        <UseCases />
        <Testimonials />
        <PricingSection />
        <CTA />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
};

export default Index;
