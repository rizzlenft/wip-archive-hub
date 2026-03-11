import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { ThisWeekCard } from "@/components/ThisWeekCard";
import { LatestEvent } from "@/components/LatestEvent";
import { MetaverseExperience } from "@/components/MetaverseExperience";
import { CommunityPerks } from "@/components/CommunityPerks";
import { Platforms } from "@/components/Platforms";
import { ContactRizzle } from "@/components/ContactRizzle";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO canonical="/" />
      <Navigation />
      <Hero />
      <section className="relative z-10 -mt-8 mb-12">
        <ThisWeekCard />
      </section>
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
