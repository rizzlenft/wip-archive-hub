import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { LatestEvent } from "@/components/LatestEvent";
import { MetaverseExperience } from "@/components/MetaverseExperience";
import { CommunityPerks } from "@/components/CommunityPerks";
import { Platforms } from "@/components/Platforms";
import { ContactRizzle } from "@/components/ContactRizzle";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <LatestEvent />
      <MetaverseExperience />
      <ContactRizzle />
      <CommunityPerks />
      <Platforms />
      <Footer />
    </div>
  );
};

export default Index;
