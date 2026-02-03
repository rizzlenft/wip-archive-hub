import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Platforms } from "@/components/Platforms";
import { FeaturedContent } from "@/components/FeaturedContent";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <About />
      <Platforms />
      <FeaturedContent />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
