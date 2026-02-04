import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import wipCv from "@/assets/wip-cv.gif";

const platforms = [
  {
    name: "Discord",
    description: "Join our live events & community chat",
    url: "https://discord.gg/XHDcUdm3",
    icon: "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/636e0a6ca814282eca7172c6_icon_clyde_white_RGB.svg",
    color: "from-indigo-500 to-purple-600",
    primary: true,
  },
  {
    name: "YouTube",
    description: "Watch past episodes & highlights",
    url: "https://www.youtube.com/@thewipmeetup",
    icon: "https://www.youtube.com/s/desktop/c01ea7e3/img/favicon_144x144.png",
    color: "from-red-500 to-red-600",
  },
  {
    name: "Twitter/X",
    description: "Follow for updates & announcements",
    url: "https://twitter.com/theWIPmeetup",
    icon: "https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png",
    color: "from-gray-600 to-gray-800",
  },
  {
    name: "Warpcast",
    description: "Find us on Farcaster",
    url: "https://warpcast.com/thewipmeetup",
    icon: "https://warpcast.com/favicon.ico",
    color: "from-purple-500 to-violet-600",
  },
  {
    name: "Twitch",
    description: "Catch our live streams",
    url: "https://www.twitch.tv/wipmeetup",
    icon: "https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png",
    color: "from-purple-600 to-indigo-700",
  },
  {
    name: "Hyperfy",
    description: "Enter our metaverse HQ",
    url: "https://hyperfy.io/wipmeetup",
    icon: "https://hyperfy.io/favicon.ico",
    color: "from-cyan-400 to-blue-500",
  },
  {
    name: "$WIP Token",
    description: "Get rewarded & support the community",
    url: "https://app.uniswap.org/explore/tokens/base/0xe21ec3068a538a064ff0bdd69db0204306fc00a0",
    icon: "⚡",
    isEmoji: true,
    color: "from-yellow-400 to-orange-500",
  },
];

export const Platforms = () => {
  return (
    <section id="platforms" className="py-24 relative">
      {/* Background GIF */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15"
        style={{ backgroundImage: `url(${wipCv})` }}
      />
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Join Us <span className="text-gradient-electric">Everywhere</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The WIP community lives across multiple platforms. Find us wherever you feel most at home.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {platforms.map((platform, index) => (
            <motion.a
              key={platform.name}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`group relative overflow-hidden rounded-2xl p-6 border-glow hover:scale-105 transition-all duration-300 ${
                platform.primary ? "md:col-span-2 lg:col-span-1" : ""
              }`}
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${platform.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  {platform.isEmoji ? (
                    <span className="text-2xl">{platform.icon}</span>
                  ) : (
                    <img 
                      src={platform.icon} 
                      alt={platform.name}
                      className="w-6 h-6 object-contain"
                    />
                  )}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{platform.name}</h3>
                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground">{platform.description}</p>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};
