import { motion } from "framer-motion";
import { ExternalLink, Sparkles, Palette, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import wipGroupHug from "@/assets/wip-group-hug.gif";
import wipDclRizzle from "@/assets/wip-dcl-rizzle.gif";
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
    <section className="py-20 relative overflow-hidden">
      {/* Background GIF */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${wipGroupHug})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/80" />
      
      {/* Accent glow */}
      <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Experience the Metaverse</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              A <span className="text-gradient-rainbow">Unique World</span> Every Week
            </h2>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Every Thursday, we transform our Hyperfy space into a completely custom experience 
              tailored for each guest. From the architecture to the atmosphere—no two meetups 
              are ever the same. Step into a world built just for that moment.
            </p>

            {/* Feature list */}
            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button variant="hero" size="xl" asChild>
              <a href="https://hyperfy.io/wip" target="_blank" rel="noopener noreferrer">
                <Sparkles className="w-5 h-5" />
                Enter the Metaverse
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </motion.div>

          {/* Visual preview - GIF showcase */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative rounded-2xl overflow-hidden border-glow aspect-video">
              <img 
                src={wipDclRizzle} 
                alt="The WIP Metaverse Experience" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
              
              {/* Floating badge */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-medium">Live every Thursday at 12 PM PT</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
