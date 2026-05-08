import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { ThisWeekCard } from "@/components/ThisWeekCard";
import { LatestEvent } from "@/components/LatestEvent";
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
      <ThisWeekCard />
      <LatestEvent />
      <Platforms />
      <ContactRizzle />
      <Footer />
    </div>
  );
};

export default Index;
