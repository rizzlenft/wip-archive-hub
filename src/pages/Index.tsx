import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { ThisWeekCard } from "@/components/ThisWeekCard";
import { LatestEvent } from "@/components/LatestEvent";
import { Platforms } from "@/components/Platforms";
import { ContactRizzle } from "@/components/ContactRizzle";
import { Footer } from "@/components/Footer";
import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SEO, SITE_NAME, SITE_URL } from "@/components/SEO";
import { getNextMeetupDate } from "@/lib/meetupSchedule";

const nextMeetup = getNextMeetupDate();
const nextMeetupEnd = new Date(nextMeetup.getTime() + 3 * 60 * 60 * 1000);

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
  {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "The WIP Meetup — Weekly Web3 Metaverse Gathering",
    description:
      "Weekly web3 metaverse meetup for builders, creators, and artists. Join us in the metaverse every Thursday at 12 PM PT.",
    startDate: nextMeetup.toISOString(),
    endDate: nextMeetupEnd.toISOString(),
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "VirtualLocation",
      url: "https://thewipmeetup.hyperworld.host/",
    },
    organizer: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    image: DEFAULT_OG_IMAGE,
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
