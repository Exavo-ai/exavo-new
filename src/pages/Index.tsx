import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import OperationalBottlenecks from "@/components/OperationalBottlenecks";
import AISystemsWeBuild from "@/components/AISystemsWeBuild";
import HowItWorks from "@/components/HowItWorks";
import TrustBanner from "@/components/TrustBanner";
import HowWeHelp from "@/components/HowWeHelp";
import { RealWorkSection } from "@/components/RealWorkSection";
import FlagshipCaseStudy from "@/components/FlagshipCaseStudy";
import MultiAgentUseCase from "@/components/MultiAgentUseCase";
import ValueLadder from "@/components/ValueLadder";
import ImplementationStructure from "@/components/ImplementationStructure";
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
        title="Exavo | AI Implementation & Infrastructure for Growth-Stage Companies"
        description="Exavo designs, deploys, and manages AI systems across operations, revenue, and customer workflows to help growth-stage companies scale."
      />
      <Navigation />
      <main>
        <Hero />
        <OperationalBottlenecks />
        <AISystemsWeBuild />
        <HowItWorks />
        <TrustBanner />
        <HowWeHelp />
        <ValueLadder />
        <ImplementationStructure />
        <RealWorkSection />
        <FlagshipCaseStudy />
        <MultiAgentUseCase />
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
