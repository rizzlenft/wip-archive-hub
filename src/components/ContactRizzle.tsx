import { motion } from "framer-motion";
import { Mic, Handshake, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import rizzlePfp from "@/assets/rizzle-pfp-3.jpeg";

export const ContactRizzle = () => {
  return (
    <section className="relative overflow-hidden py-8 md:py-10">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-5xl"
        >
          <div className="rounded-2xl border border-primary/20 bg-card/60 px-5 py-5 backdrop-blur-sm md:px-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              {/* Rizzle PFP */}
              <motion.a
                href="https://x.com/NFTland"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05, rotate: 2 }}
                whileTap={{ scale: 0.97 }}
                className="group relative shrink-0 self-center md:self-auto"
              >
                <div className="h-16 w-16 overflow-hidden rounded-xl shadow-lg ring-2 ring-primary/30 transition-all group-hover:shadow-primary/20 group-hover:ring-primary/60">
                  <img
                    src={rizzlePfp}
                    alt="Rizzle"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </motion.a>

              {/* Content */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl md:text-2xl font-bold">
                  Want to be on the{" "}
                  <span className="text-gradient-rainbow">WIP</span>?
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed mt-1">
                  Guest appearances, project showcases, and sponsorships start with Rizzle.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
                  <Button variant="hero" size="default" asChild>
                    <a
                      href="https://x.com/NFTland"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Mic className="w-4 h-4" />
                      Be a Guest
                    </a>
                  </Button>
                  <Button variant="outline" size="default" className="border-primary/30 hover:bg-primary/10" asChild>
                    <a
                      href="https://x.com/NFTland"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Handshake className="w-4 h-4" />
                      Sponsor an Event
                    </a>
                  </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
