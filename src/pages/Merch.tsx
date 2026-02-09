import { motion } from "framer-motion";
import { ShoppingBag, ExternalLink, Sparkles } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import merchHat from "@/assets/merch-hat.jpg";
import merchTshirt from "@/assets/merch-tshirt.jpg";
import merchMug from "@/assets/merch-mug.jpg";
import merchHoodie from "@/assets/merch-hoodie.jpg";

const products = [
  {
    name: "WIP Rainbow Snapback",
    price: "$30",
    image: merchHat,
    description: "Classic black snapback with embroidered rainbow WIP logo. One size fits all.",
    buyUrl: "#", // Replace with your Printful/Printify link
    badge: "Popular",
  },
  {
    name: "WIP Classic Tee",
    price: "$25",
    image: merchTshirt,
    description: "Premium cotton tee with the iconic rainbow WIP print. Unisex fit.",
    buyUrl: "#",
  },
  {
    name: "WIP Hoodie",
    price: "$50",
    image: merchHoodie,
    description: "Cozy heavyweight hoodie with kangaroo pocket and rainbow WIP logo.",
    buyUrl: "#",
    badge: "New",
  },
  {
    name: "WIP Coffee Mug",
    price: "$18",
    image: merchMug,
    description: "Start your mornings right with the WIP rainbow mug. 11oz ceramic.",
    buyUrl: "#",
  },
];

const Merch = () => {
  return (
    <div className="min-h-screen bg-background">
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
                <div className="rounded-2xl bg-card border-glow overflow-hidden hover:scale-[1.03] transition-all duration-300">
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
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
              <a href="https://discord.gg/XHDcUdm3" target="_blank" rel="noopener noreferrer">
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
