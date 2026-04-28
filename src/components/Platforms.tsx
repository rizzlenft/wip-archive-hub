import { motion } from "framer-motion";
import { Coins, ExternalLink, Gift, Sparkles } from "lucide-react";
import wipCv from "@/assets/wip-cv.gif";
import wipLogoStatic from "@/assets/wip-logo-static.png";

const platforms = [
  {
    name: "Discord",
    description: "Main community and live-event home",
    url: "https://discord.gg/bTjc6k5uss",
    icon: "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/636e0a6ca814282eca7172c6_icon_clyde_white_RGB.svg",
    featured: true,
  },
  {
    name: "YouTube",
    description: "Episodes, replays, and highlights",
    url: "https://www.youtube.com/@thewipmeetup",
    icon: "https://www.youtube.com/s/desktop/c01ea7e3/img/favicon_144x144.png",
  },
  {
    name: "Twitter/X",
    description: "Updates & announcements",
    url: "https://twitter.com/theWIPmeetup",
    icon: "https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png",
  },
  {
    name: "Farcaster",
    description: "Channel and miniapps",
    url: "https://farcaster.xyz/~/channel/thewipmeetup",
    icon: "https://warpcast.com/favicon.ico",
    miniapps: [
      {
        name: "Meetup Miniapp",
        url: "https://farcaster.xyz/miniapps/yDcoJ9X6iJ2G/the-wip-meetup-miniapp",
      },
      {
        name: "WIPCoin Miniapp",
        url: "https://farcaster.xyz/miniapps/eOxi0VR7PqQk/wipcoin-portal",
      },
    ],
  },
  {
    name: "Twitch",
    description: "Live stream backup",
    url: "https://www.twitch.tv/wipmeetup",
    icon: "https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png",
  },
  {
    name: "Hyperworld",
    description: "Step into the metaverse space",
    url: "https://thewipmeetup.hyperworld.host/",
    icon: "https://hyperfy.io/favicon.ico",
  },
  {
    name: "Substack",
    description: "Newsletter and weekly updates",
    url: "https://thewipmeetup.substack.com/",
    icon: "https://substack.com/favicon.ico",
  },
  {
    name: "$WIP Token",
    description: "Stake, trade, and track the token",
    url: "https://wip-staking.pages.dev/trade",
    icon: wipLogoStatic,
    miniapps: [
      {
        name: "Stake",
        url: "https://wip-staking.pages.dev/",
      },
      {
        name: "Trade",
        url: "https://wip-staking.pages.dev/trade",
      },
      {
        name: "Chart",
        url: "https://www.geckoterminal.com/base/pools/0xfa9d608b5a13a78bd403e61e2459660efa7566348357ef7ccb010522af3660f0",
      },
    ],
  },
];

const getPlatform = (name: string) => platforms.find((platform) => platform.name === name)!;

const platformGroups = [
  {
    title: "Join Live",
    description: "Discord, Hyperworld, stream backup, and Farcaster miniapps for Thursdays at 12 PM PT.",
    platforms: [getPlatform("Discord"), getPlatform("Hyperworld"), getPlatform("Twitch"), getPlatform("Farcaster")],
  },
  {
    title: "Watch",
    description: "Catch episodes and announcements.",
    platforms: [getPlatform("YouTube"), getPlatform("Substack")],
  },
  {
    title: "Follow",
    description: "Stay connected across social channels.",
    platforms: [getPlatform("Twitter/X")],
  },
  {
    title: "$WIP",
    description: "Stake, trade, chart, and collect attendee rewards.",
    platforms: [getPlatform("$WIP Token")],
  },
];

const ecosystemHighlights = [
  { icon: Sparkles, title: "Metaverse meetup", text: "Weekly Hyperworld spaces built around featured guests." },
  { icon: Coins, title: "$WIP rewards", text: "Attendee token perks, staking, trading, and charts." },
  { icon: Gift, title: "Voxel gifts", text: "Collectible weekly keepsakes from Fabiano & Patrizia." },
];

export const Platforms = () => {
  return (
    <section id="platforms" className="relative overflow-hidden py-12 md:py-16">
      {/* Animated background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: `url(${wipCv})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center md:mb-10"
        >
          
          <h2 className="mb-3 text-3xl font-bold md:text-5xl">
            Explore <span className="text-gradient-rainbow">The WIP</span>
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto md:text-lg">
            The community spaces, broadcasts, token links, and weekly perks in one place.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-5 grid max-w-6xl gap-3 md:grid-cols-3"
        >
          {ecosystemHighlights.map((item) => (
            <div key={item.title} className="flex gap-3 rounded-xl border border-border/60 bg-card/35 p-3 text-left backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 md:gap-5">
          {platformGroups.map((group, groupIndex) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: groupIndex * 0.08 }}
              className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm"
            >
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
                  {group.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
              </div>
              <div className="grid gap-3">
                {group.platforms.map((platform, index) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.02,
                  y: -2 
                }}
                transition={{ 
                  duration: 0.4, 
                  delay: index * 0.04,
                  type: "spring",
                  stiffness: 400
                }}
                className="group relative min-w-0"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-rainbow opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-25" />
                
                <div className="relative bg-card/60 backdrop-blur-sm rounded-xl border border-muted/50 group-hover:border-primary/40 transition-all duration-300 overflow-hidden">
                  <a
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-4 sm:gap-4 sm:px-4"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-muted/50 shadow-md transition-shadow group-hover:shadow-lg">
                      <img 
                        src={platform.icon} 
                        alt={platform.name}
                        className="w-5 h-5 object-contain"
                      />
                    </div>
                      <div className="min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-base truncate">{platform.name}</h4>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-muted-foreground">{platform.description}</p>
                    </div>
                  </a>

                  {platform.miniapps && (
                    <div className="flex flex-wrap gap-2 px-4 pb-4 -mt-1">
                      {platform.miniapps.map((miniapp) => (
                        <a
                          key={miniapp.name}
                          href={miniapp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                        >
                          {miniapp.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
          </div>
        </div>
    </section>
  );
};
