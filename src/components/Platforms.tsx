import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import wipCv from "@/assets/wip-cv.gif";
import wipLogoStatic from "@/assets/wip-logo-static.png";
import nftGift1 from "@/assets/nft-gift-1.jpeg";
import nftGift2 from "@/assets/nft-gift-2.avif";
import nftGift3 from "@/assets/nft-gift-3.avif";

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
    name: "Metaverse",
    description: "Step into our virtual space",
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
    description: "Stake, trade, and collect attendee rewards",
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
  {
    name: "Voxel Gifts",
    description: "Free weekly NFT keepsakes for attendees",
    url: "https://opensea.io/collection/random-3d-things",
    icon: nftGift1,
    giftImages: [nftGift1, nftGift2, nftGift3],
    miniapps: [
      {
        name: "@fabianospeziari",
        url: "https://x.com/fabianospeziari",
      },
      {
        name: "@patriziabarnato",
        url: "https://x.com/patriziabarnato",
      },
      {
        name: "Collection",
        url: "https://opensea.io/collection/random-3d-things",
      },
    ],
  },
];

const getPlatform = (name: string) => platforms.find((platform) => platform.name === name)!;

const platformGroups = [
  {
    title: "Join Live",
    description: "Where the Thursday meetup happens.",
    platforms: [getPlatform("Discord"), getPlatform("Metaverse")],
  },
  {
    title: "Watch",
    description: "Replay episodes and live streams.",
    platforms: [getPlatform("YouTube"), getPlatform("Twitch")],
  },
  {
    title: "Follow",
    description: "Social channels and weekly updates.",
    platforms: [getPlatform("Twitter/X"), getPlatform("Farcaster"), getPlatform("Substack")],
  },
  {
    title: "Rewards",
    description: "$WIP links and weekly gift details.",
    platforms: [getPlatform("$WIP Token"), getPlatform("Voxel Gifts")],
  },
];

export const Platforms = () => {
  return (
    <section id="platforms" className="relative overflow-hidden py-10 md:py-14">
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
          className="mx-auto mb-8 max-w-2xl text-center md:mb-10"
        >
          
          <h2 className="mb-3 text-3xl font-bold leading-tight md:text-5xl">
            Explore <span className="text-gradient-rainbow">The WIP</span>
          </h2>
          <p className="text-base text-muted-foreground md:text-lg">
            Quick links for joining live, watching replays, following updates, and collecting rewards.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-6xl gap-3 lg:grid-cols-2 md:gap-4">
          {platformGroups.map((group, groupIndex) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: groupIndex * 0.08 }}
              className="rounded-xl border border-border/60 bg-card/35 p-4 backdrop-blur-sm md:p-5"
            >
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary sm:text-sm">
                  {group.title}
                </h3>
                <p className="text-sm text-muted-foreground sm:text-right">{group.description}</p>
              </div>
              <div className="grid gap-2">
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
                
                <div className="relative overflow-hidden rounded-lg border border-muted/50 bg-card/55 backdrop-blur-sm transition-all duration-300 group-hover:border-primary/40">
                  <a
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-16 items-center gap-3 px-3 py-3 sm:min-h-20 sm:px-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-muted/50 shadow-md transition-shadow group-hover:shadow-lg sm:h-11 sm:w-11">
                      <img 
                        src={platform.icon} 
                        alt={platform.name}
                        className="h-5 w-5 rounded-sm object-cover"
                      />
                    </div>
                      <div className="min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-base font-semibold">{platform.name}</h4>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100" />
                      </div>
                      <p className="text-xs leading-snug text-muted-foreground sm:text-sm">{platform.description}</p>
                    </div>
                  </a>

                  {platform.miniapps && (
                    <div className="-mt-1 flex flex-wrap gap-2 px-3 pb-3 sm:px-4">
                      {platform.miniapps.map((miniapp) => (
                        <a
                          key={miniapp.name}
                          href={miniapp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 sm:px-3"
                        >
                          {miniapp.name}
                        </a>
                      ))}
                    </div>
                  )}

                  {platform.giftImages && (
                    <div className="-mt-1 grid grid-cols-3 gap-2 px-3 pb-3 sm:px-4">
                      {platform.giftImages.map((image, giftIndex) => (
                        <img
                          key={image}
                          src={image}
                          alt={`Voxel gift preview ${giftIndex + 1}`}
                          className="aspect-square w-full rounded-md border border-primary/15 bg-muted/30 object-cover"
                          loading="lazy"
                        />
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
