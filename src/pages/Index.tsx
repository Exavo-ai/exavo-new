import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import HowWeHelp from "@/components/HowWeHelp";
import CaseStudies from "@/components/CaseStudies";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import SEO from "@/components/SEO";
import Newsletter from "@/components/Newsletter";

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEO 
        title="Exavo – AI Services & Data Analytics"
        description="Exavo offers AI-powered solutions: custom models, automated analytics, and system integration — transforming your data into actionable insights."
      />
      <Navigation />
      <main>
        <Hero />
        <HowItWorks />
        <HowWeHelp />
        <CaseStudies />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Newsletter />
      <Footer />
      <ChatWidget />
    </div>
  );
};

export default Index;
