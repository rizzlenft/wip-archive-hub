import { motion } from "framer-motion";
import { ExternalLink, Sparkles, Palette, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import wipMetaverseCity from "@/assets/wip-metaverse-city.png";

const features = [
  {
    icon: Palette,
    title: "Custom Builds",
    description: "Each week's space is uniquely designed for our featured guest",
  },
  {
    icon: Users,
    title: "Live Gathering",
    description: "Meet builders, creators, and artists from around the world",
  },
  {
    icon: Zap,
    title: "Interactive",
    description: "Walk around, explore, and engage in real-time",
  },
];

export const MetaverseExperience = () => {
  return (
    <section className="py-24 relative overflow-hidden min-h-[80vh] flex items-center">
      {/* Full-bleed background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${wipMetaverseCity})` }}
      />
      {/* Gradient overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
      
      {/* Animated accent glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}

          {/* Main heading */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight"
          >
            A <span className="text-gradient-rainbow">Unique World</span> Every Week
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto"
          >
            Every Thursday, we transform our metaverse space into a completely custom experience 
            tailored for each guest. From the architecture to the atmosphere—no two meetups 
            are ever the same. Step into a world built just for that moment.
          </motion.p>

          {/* Feature list - horizontal on larger screens */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center gap-6 mb-12"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-4 bg-background/30 backdrop-blur-sm rounded-xl p-4 border border-border/50 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Button variant="hero" size="xl" asChild className="shadow-2xl shadow-primary/30">
              <a href="https://hyperfy.io/wip" target="_blank" rel="noopener noreferrer">
                <Sparkles className="w-5 h-5" />
                Enter the Metaverse
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
