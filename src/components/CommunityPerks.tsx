import { motion } from "framer-motion";
import { Gift, Coins, Heart, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import nftGiftSample from "@/assets/nft-gift-sample.jpeg";
import wipLogo from "@/assets/wip-logo.gif";
import metaverseBg2 from "@/assets/metaverse-bg-2.gif";
const perks = [
  {
    title: "$WIP Token Rewards",
    description: "Attend our weekly meetups and receive $WIP tokens as a thank you for being part of our community. Every attendee gets rewarded!",
    color: "from-yellow-400 to-orange-500",
    isToken: true,
    links: [
      { url: "https://app.uniswap.org/explore/tokens/base/0xe21ec3068a538a064ff0bdd69db0204306fc00a0", text: "Uniswap" },
      { url: "https://www.coingecko.com/en/coins/wip", text: "CoinGecko" },
      { url: "https://www.geckoterminal.com/base/pools/0xfa9d608b5a13a78bd403e61e2459660efa7566348357ef7ccb010522af3660f0", text: "GeckoTerminal" },
    ],
  },
  {
    icon: Gift,
    title: "Free NFT Gifts",
    description: "Each week, our amazing artists Fabiano & Patrizia create unique voxel art NFTs that are gifted to attendees—beautiful collectibles just for showing up!",
    color: "from-pink-400 to-purple-500",
    image: nftGiftSample,
    artists: [
      { name: "Fabiano", url: "https://x.com/fabianospeziari" },
      { name: "Patrizia", url: "https://x.com/patriziabarnatox" },
    ],
    collectionUrl: "https://opensea.io/collection/random-3d-things",
  },
];

export const CommunityPerks = () => {
  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background GIF */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: `url(${metaverseBg2})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Join & <span className="text-gradient-rainbow">Get Rewarded</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Being part of The WIP isn't just about community—it's about being appreciated. 
            Every week, attendees receive exclusive rewards just for showing up.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {perks.map((perk, index) => (
            <motion.div
              key={perk.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="group"
            >
              <div className="h-full p-8 rounded-2xl bg-card border-glow hover:scale-105 transition-all duration-300">
                {perk.image ? (
                  <div className="mb-6 rounded-xl overflow-hidden">
                    <img 
                      src={perk.image} 
                      alt="NFT Gift Sample" 
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                ) : perk.isToken ? (
                  <div className="mb-6">
                    <img 
                      src={wipLogo} 
                      alt="WIP Token" 
                      className="w-16 h-16 rounded-2xl group-hover:scale-110 transition-transform"
                    />
                  </div>
                ) : perk.icon ? (
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${perk.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <perk.icon className="w-8 h-8 text-white" />
                  </div>
                ) : null}
                <h3 className="text-2xl font-bold mb-4">{perk.title}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {perk.description}
                </p>
                
                {/* Live price chart for token */}
                {perk.isToken && (
                  <div className="mb-6 rounded-xl overflow-hidden border border-border">
                    <iframe
                      src="https://www.geckoterminal.com/base/pools/0xfa9d608b5a13a78bd403e61e2459660efa7566348357ef7ccb010522af3660f0?embed=1&info=0&swaps=0"
                      width="100%"
                      height="300"
                      frameBorder="0"
                      className="bg-background"
                      title="$WIP Price Chart"
                    />
                  </div>
                )}
                
                {perk.links && (
                  <div className="flex flex-wrap gap-4">
                    {perk.links.map((link) => (
                      <a
                        key={link.text}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                      >
                        {link.text}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                )}
                {perk.artists && (
                  <div className="flex flex-wrap gap-4">
                    {perk.artists.map((artist) => (
                      <a
                        key={artist.name}
                        href={artist.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                      >
                        @{artist.name}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ))}
                    {perk.collectionUrl && (
                      <a
                        href={perk.collectionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                      >
                        View Collection
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Support the community callout */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center max-w-2xl mx-auto"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Heart className="w-8 h-8 text-white" />
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-4">Support Our Community</h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            When you purchase $WIP, you're directly supporting the builders, creators, and artists 
            who attend our weekly meetups. Every token helps sustain and grow this incredible community 
            that's been thriving since 2019.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="hero" size="lg" asChild>
              <a href="https://app.uniswap.org/explore/tokens/base/0xe21ec3068a538a064ff0bdd69db0204306fc00a0" target="_blank" rel="noopener noreferrer">
                <Coins className="w-5 h-5" />
                Get $WIP on Uniswap
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="https://linktr.ee/thewipmeetup" target="_blank" rel="noopener noreferrer">
                <Users className="w-5 h-5" />
                Learn More
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
