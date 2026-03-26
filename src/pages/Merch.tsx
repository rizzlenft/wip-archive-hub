import { motion } from "framer-motion";
import { ShoppingBag, ExternalLink, Sparkles } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import merchHatRainbow from "@/assets/merch-hat-rainbow.jpg";
import merchTshirtRainbow from "@/assets/merch-tshirt-rainbow.jpg";
import merchMugRainbow from "@/assets/merch-mug-rainbow.jpg";
import merchHoodieRainbow from "@/assets/merch-hoodie-rainbow.jpg";

const products = [
  {
    name: "WIP Rainbow Snapback",
    price: "$33.15",
    image: merchHatRainbow,
    description: "Classic black snapback with embroidered WIP logo. One size fits all.",
    buyUrl: "https://the-wip-meetup.printify.me/product/26761482/retro-wip-embroidered-trucker-cap",
    badge: "Popular",
  },
  {
    name: "WIP Classic Tee",
    price: "$25.99",
    image: merchTshirtRainbow,
    description: "Premium cotton tee with the iconic WIP print. Unisex fit.",
    buyUrl: "https://the-wip-meetup.printify.me/product/26761219/wip-retro-rainbow-tee-psychedelic-work-in-progress-graphic-t-shirt",
  },
  {
    name: "WIP Hoodie",
    price: "$67.82",
    image: merchHoodieRainbow,
    description: "Cozy heavyweight hoodie with kangaroo pocket and WIP logo.",
    buyUrl: "https://the-wip-meetup.printify.me/product/26761314/psychedelic-rainbow-wip-logo-organic-pullover-hoodie",
    badge: "New",
  },
  {
    name: "WIP Coffee Mug",
    price: "$14.33",
    image: merchMugRainbow,
    description: "Start your mornings right with the WIP mug. 11oz ceramic.",
    buyUrl: "https://the-wip-meetup.printify.me/product/26761570/15oz-black-mug-rainbow-retro-wip-logo-coffee-cup",
  },
];

const Merch = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Merch"
        description="Rep The WIP Meetup with official merch — snapbacks, tees, hoodies, and mugs. Every purchase supports the web3 community."
        canonical="/merch"
      />
      <Navigation />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Official Merch</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Rep the <span className="text-gradient-rainbow">WIP</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Wear the community. Every purchase supports the builders, creators, and dreamers of The WIP.
            </p>
          </motion.div>

          {/* Product Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-20">
            {products.map((product, i) => (
              <motion.div
                key={product.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group"
              >
                <div className="rounded-2xl bg-card border border-border/40 overflow-hidden hover:scale-[1.03] hover:border-primary/30 transition-all duration-300 shadow-lg shadow-black/20">
                  <div className="relative aspect-square overflow-hidden bg-muted/10">
                    <img
                      src={product.image}
                      alt={`${product.name} — official WIP Meetup merchandise`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {product.badge && (
                      <span className="absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-full bg-primary text-primary-foreground">
                        {product.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-primary">{product.price}</span>
                      <Button size="sm" variant="electric" asChild>
                        <a href={product.buyUrl} target="_blank" rel="noopener noreferrer">
                          Buy <ExternalLink className="w-3.5 h-3.5 ml-1" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-xl mx-auto"
          >
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Want something custom?</h2>
            <p className="text-muted-foreground mb-6">
              Drop us a message on Discord and let us know what WIP merch you'd love to see next!
            </p>
            <Button variant="hero" size="lg" asChild>
              <a href="https://discord.gg/bTjc6k5uss" target="_blank" rel="noopener noreferrer">
                Join Discord
              </a>
            </Button>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Merch;
