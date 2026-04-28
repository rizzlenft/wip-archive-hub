import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Coins, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import wipLogoStatic from "@/assets/wip-logo-static.png";
import metaverseBg2 from "@/assets/metaverse-bg-2.gif";
import nftGift1 from "@/assets/nft-gift-1.jpeg";
import nftGift2 from "@/assets/nft-gift-2.avif";
import nftGift3 from "@/assets/nft-gift-3.avif";
import nftGift4 from "@/assets/nft-gift-4.avif";
import nftGift5 from "@/assets/nft-gift-5.avif";
import nftGift6 from "@/assets/nft-gift-6.avif";

const nftGallery = [nftGift1, nftGift2, nftGift3, nftGift4, nftGift5, nftGift6];

const artists = [
  { name: "Fabiano", handle: "fabianospeziari", url: "https://x.com/fabianospeziari" },
  { name: "Patrizia", handle: "patriziabarnato", url: "https://x.com/patriziabarnato" },
];

const collectionUrl = "https://opensea.io/collection/random-3d-things";

export const CommunityPerks = () => {
  const [currentNft, setCurrentNft] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentNft((prev) => (prev + 1) % nftGallery.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-16 max-w-5xl overflow-hidden rounded-2xl border-glow bg-card/80 backdrop-blur-sm"
        >
          <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="flex min-h-[360px] flex-col justify-between border-b border-border/80 p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <img
                    src={wipLogoStatic}
                    alt="WIP Token"
                    className="h-16 w-16 shrink-0 rounded-2xl shadow-rainbow"
                    loading="lazy"
                    width={64}
                    height={64}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Weekly Rewards</p>
                    <h3 className="text-2xl font-bold sm:text-3xl">$WIP for showing up</h3>
                  </div>
                </div>
                <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Attend the meetup and receive $WIP as a thank you for contributing to the community.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="font-bold text-foreground">Thursdays</p>
                  <p className="text-muted-foreground">12–3 PM PT</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="font-bold text-foreground">Community</p>
                  <p className="text-muted-foreground">Rewarded live</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid items-center gap-8 md:grid-cols-[0.95fr_1.05fr]">
                <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-xl bg-muted/20">
                  <motion.img
                    key={currentNft}
                    src={nftGallery[currentNft]}
                    alt={`NFT Gift #${currentNft + 1}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {nftGallery.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentNft(i)}
                        aria-label={`View NFT ${i + 1}`}
                        className={`h-2 rounded-full transition-all ${i === currentNft ? "w-5 bg-primary" : "w-2 bg-muted-foreground/40"}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="text-center md:text-left">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-accent">Free NFT Gifts</p>
                  <h3 className="mb-4 text-2xl font-bold sm:text-3xl">Voxel art from every meetup</h3>
                  <p className="mb-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
                    Fabiano & Patrizia create unique collectibles for attendees, turning each week into a keepsake.
                  </p>

                  <div className="mb-6 grid grid-cols-2 gap-3">
                    {artists.map((artist) => (
                      <a
                        key={artist.name}
                        href={artist.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-3 transition-all hover:border-primary/40 hover:bg-muted/50"
                      >
                        <img
                          src={`https://unavatar.io/twitter/${artist.handle}`}
                          alt={artist.name}
                          className="h-10 w-10 shrink-0 rounded-full border border-primary/30 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=7c3aed&color=fff&size=48`;
                          }}
                        />
                        <span className="truncate text-sm font-semibold text-foreground">@{artist.name}</span>
                      </a>
                    ))}
                  </div>

                  <a
                    href={collectionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    View Collection
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-sm p-5 md:p-6"
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4 text-left">
              <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Support The WIP</h3>
                <p className="text-sm text-muted-foreground">
                  Help keep the meetups running, artists creating, and community growing.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
              <Button variant="hero" size="default" asChild>
                <a href="https://wip-staking.pages.dev/trade" target="_blank" rel="noopener noreferrer">
                  <Coins className="w-4 h-4" />
                  Buy $WIP
                </a>
              </Button>
              <Button variant="outline" size="default" className="border-primary/30 hover:bg-primary/10" asChild>
                <a href="https://piri-pay.vercel.app/tip/qY3jM8YzHk" target="_blank" rel="noopener noreferrer">
                  <Heart className="w-4 h-4 text-primary" />
                  Donate
                </a>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
