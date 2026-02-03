import { motion } from "framer-motion";
import { Zap, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CTA = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Every Thursday at 12 PM PT</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to <span className="text-gradient-electric glow-text">Join</span> the Movement?
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Don't miss out on the alpha. Join our Discord to get notified about upcoming events 
            and become part of the best web3 community in existence.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="hero" size="xl" asChild>
              <a href="https://discord.gg/XHDcUdm3" target="_blank" rel="noopener noreferrer">
                <Zap className="w-5 h-5" />
                Join Discord Now
                <ArrowRight className="w-5 h-5" />
              </a>
            </Button>
          </div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-12 flex flex-wrap justify-center gap-8 text-muted-foreground"
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient-electric">3,700+</div>
              <div className="text-sm">Community Members</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient-electric">250+</div>
              <div className="text-sm">Episodes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient-electric">5+</div>
              <div className="text-sm">Years Running</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
