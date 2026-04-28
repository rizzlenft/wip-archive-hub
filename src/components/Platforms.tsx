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
      {
        name: "WIPCoin Portal",
        url: "https://farcaster.xyz/miniapps/eOxi0VR7PqQk/wipcoin-portal",
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
    name: "Hyperfy",
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
    description: "Get rewarded",
    url: "https://wip-staking.pages.dev/trade",
    icon: wipLogoStatic,
    color: "from-yellow-400 to-orange-500",
  },
];

export const Platforms = () => {
  return (
    <section id="platforms" className="py-24 relative overflow-hidden">
      {/* Animated background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: `url(${wipCv})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Join Us <span className="text-gradient-rainbow">Everywhere</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The WIP community lives across the metaverse. Connect with us wherever you vibe.
          </p>
        </motion.div>

        {/* Organic scattered layout */}
        <div className="max-w-6xl mx-auto">
          {/* Featured Discord - larger and centered */}
          <motion.a
            href={platforms[0].url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02, rotate: -1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="group relative block max-w-md mx-auto mb-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative bg-card/80 backdrop-blur-sm rounded-3xl p-8 border border-primary/30 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <img 
                    src={platforms[0].icon} 
                    alt="Discord"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-2xl">{platforms[0].name}</h3>
                    <ExternalLink className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-muted-foreground">{platforms[0].description}</p>
                </div>
              </div>
            </div>
          </motion.a>

          {/* Flowing grid for other platforms */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {platforms.slice(1).map((platform, index) => (
              <motion.a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 30, rotate: (index % 2 === 0 ? -2 : 2) }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.08, 
                  rotate: index % 2 === 0 ? 2 : -2,
                  y: -5 
                }}
                transition={{ 
                  duration: 0.4, 
                  delay: index * 0.08,
                  type: "spring",
                  stiffness: 400
                }}
                className="group relative"
              >
                {/* Glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${platform.color} rounded-2xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-300`} />
                
                <div className="relative bg-card/60 backdrop-blur-sm rounded-2xl px-5 py-4 border border-muted/50 group-hover:border-primary/40 transition-all duration-300 flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                    <img 
                      src={platform.icon} 
                      alt={platform.name}
                      className="w-5 h-5 object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base">{platform.name}</h3>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-muted-foreground">{platform.description}</p>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
