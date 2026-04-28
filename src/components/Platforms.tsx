import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import wipCv from "@/assets/wip-cv.gif";
import wipLogoStatic from "@/assets/wip-logo-static.png";

const platforms = [
  {
    name: "Discord",
    description: "Live events & community",
    url: "https://discord.gg/bTjc6k5uss",
    icon: "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/636e0a6ca814282eca7172c6_icon_clyde_white_RGB.svg",
    color: "from-indigo-500 to-purple-600",
    featured: true,
  },
  {
    name: "YouTube",
    description: "Past episodes & highlights",
    url: "https://www.youtube.com/@thewipmeetup",
    icon: "https://www.youtube.com/s/desktop/c01ea7e3/img/favicon_144x144.png",
    color: "from-red-500 to-red-600",
  },
  {
    name: "Twitter/X",
    description: "Updates & announcements",
    url: "https://twitter.com/theWIPmeetup",
    icon: "https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png",
    color: "from-gray-600 to-gray-800",
  },
  {
    name: "Farcaster",
    description: "Web3 social",
    url: "https://farcaster.xyz/~/channel/thewipmeetup",
    icon: "https://warpcast.com/favicon.ico",
    color: "from-purple-500 to-violet-600",
    miniapps: [
      {
        name: "Meetup Miniapp",
        url: "https://farcaster.xyz/miniapps/yDcoJ9X6iJ2G/the-wip-meetup-miniapp",
      },
    ],
  },
  {
    name: "Twitch",
    description: "Live streams",
    url: "https://www.twitch.tv/wipmeetup",
    icon: "https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png",
    color: "from-purple-600 to-indigo-700",
  },
  {
    name: "Hyperworld",
    description: "Metaverse HQ",
    url: "https://thewipmeetup.hyperworld.host/",
    icon: "https://hyperfy.io/favicon.ico",
    color: "from-cyan-400 to-blue-500",
  },
  {
    name: "Substack",
    description: "Newsletter & updates",
    url: "https://thewipmeetup.substack.com/",
    icon: "https://substack.com/favicon.ico",
    color: "from-orange-500 to-yellow-500",
  },
  {
    name: "$WIP Token",
    description: "Trade & staking",
    url: "https://wip-staking.pages.dev/trade",
    icon: wipLogoStatic,
    color: "from-yellow-400 to-orange-500",
    miniapps: [
      {
        name: "WIPCoin Portal",
        url: "https://farcaster.xyz/miniapps/eOxi0VR7PqQk/wipcoin-portal",
      },
      {
        name: "GeckoTerminal",
        url: "https://www.geckoterminal.com/base/pools/0xfa9d608b5a13a78bd403e61e2459660efa7566348357ef7ccb010522af3660f0",
      },
    ],
  },
];

const getPlatform = (name: string) => platforms.find((platform) => platform.name === name)!;

const platformGroups = [
  {
    title: "Join Live",
    platforms: [getPlatform("Discord"), getPlatform("Hyperworld"), getPlatform("Twitch")],
  },
  {
    title: "Watch & Read",
    platforms: [getPlatform("YouTube"), getPlatform("Substack")],
  },
  {
    title: "Social",
    platforms: [getPlatform("Twitter/X"), getPlatform("Farcaster")],
  },
  {
    title: "$WIP",
    platforms: [getPlatform("$WIP Token")],
  },
];

export const Platforms = () => {
  return (
    <section id="platforms" className="relative overflow-hidden py-14 md:py-20">
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
          className="mb-10 text-center md:mb-14"
        >
          
          <h2 className="mb-4 text-4xl font-bold md:mb-6 md:text-6xl">
            Explore <span className="text-gradient-rainbow">The WIP</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find the main community spaces, broadcasts, updates, and ecosystem links in one place.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 md:gap-5">
          {platformGroups.map((group, groupIndex) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: groupIndex * 0.08 }}
              className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm md:p-5"
            >
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">
                {group.title}
              </h3>
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
                <div className={`absolute inset-0 bg-gradient-to-br ${platform.color} rounded-2xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-300`} />
                
                <div className="relative bg-card/60 backdrop-blur-sm rounded-2xl border border-muted/50 group-hover:border-primary/40 transition-all duration-300 overflow-hidden">
                  <a
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-4 sm:gap-4 sm:px-4"
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${platform.color} shadow-md transition-shadow group-hover:shadow-lg`}>
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
