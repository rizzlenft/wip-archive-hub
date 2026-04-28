import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { ThisWeekCard } from "@/components/ThisWeekCard";
import { LatestEvent } from "@/components/LatestEvent";
import { Platforms } from "@/components/Platforms";
import { ContactRizzle } from "@/components/ContactRizzle";
import { Footer } from "@/components/Footer";
import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SEO, SITE_NAME, SITE_URL } from "@/components/SEO";

const homeStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: DEFAULT_OG_IMAGE,
    sameAs: [
      "https://www.youtube.com/@thewipmeetup",
      "https://twitter.com/theWIPmeetup",
      "https://thewipmeetup.substack.com/",
      "https://farcaster.xyz/~/channel/thewipmeetup",
      "https://www.twitch.tv/wipmeetup",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "en-US",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO canonical="/" structuredData={homeStructuredData} />
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
