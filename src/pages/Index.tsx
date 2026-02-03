import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { LatestEvent } from "@/components/LatestEvent";
import { CommunityPerks } from "@/components/CommunityPerks";
import { Platforms } from "@/components/Platforms";
import { FeaturedContent } from "@/components/FeaturedContent";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <LatestEvent />
      <CommunityPerks />
      <Platforms />
      <FeaturedContent />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
