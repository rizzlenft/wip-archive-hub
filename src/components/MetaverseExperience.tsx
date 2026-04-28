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
    <section className="relative flex min-h-[72vh] items-center overflow-hidden py-16 md:py-24">
      {/* Full-bleed background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${wipMetaverseCity})` }}
      />
      {/* Gradient overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}

          {/* Main heading */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 text-4xl font-bold leading-tight sm:text-5xl md:mb-8 md:text-6xl lg:text-7xl"
          >
            A <span className="text-gradient-rainbow">Unique World</span> Every Week
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg md:mb-10 md:text-xl"
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
            className="mb-8 grid gap-3 sm:grid-cols-3 md:mb-10 md:gap-4"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/35 p-4 text-left backdrop-blur-sm"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/20">
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
              <a href="https://thewipmeetup.hyperworld.host/" target="_blank" rel="noopener noreferrer">
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
