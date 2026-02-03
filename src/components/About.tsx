import { motion } from "framer-motion";
import { Lightbulb, Globe, Heart, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  {
    icon: Lightbulb,
    title: "Fresh Perspectives Weekly",
    description: "Every Thursday at 12 PM PT, we gather in the metaverse to share ideas, explore new projects, and discuss what's shaping the future of web3.",
  },
  {
    icon: Globe,
    title: "Metaverse Native",
    description: "We don't just talk about the metaverse—we live in it. Join us in our virtual home on Hyperfy for an immersive, welcoming experience.",
  },
  {
    icon: Heart,
    title: "Community First",
    description: "With 3,700+ members and growing, we're one of the most supportive and inclusive communities in web3. Everyone is welcome here.",
  },
  {
    icon: Sparkles,
    title: "Since 2019",
    description: "The longest-running metaverse meetup. We've been here through every cycle, building and growing together as a community.",
  },
];

export const About = () => {
  return (
    <section id="about" className="py-24 relative overflow-hidden">
      {/* Background image section */}
      <div 
        className="absolute inset-0 bg-cover bg-no-repeat opacity-10"
        style={{ backgroundImage: `url(${heroBg})`, backgroundPosition: 'center top' }}
      />
      {/* Background elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            What is <span className="text-gradient-rainbow">The WIP</span>?
          </h2>
          <p className="text-xl text-primary font-semibold mb-4">
            WIP = Work in Progress
          </p>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-4">
            Founded in 2019, The WIP Meetup is the <span className="text-foreground font-medium">oldest running web3 metaverse meetup</span>—a 
            weekly gathering that has been a constant through every market cycle and technological shift.
          </p>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            More than just a meetup, it's a home for builders, creators, and artists pushing the boundaries of what's possible in web3. 
            Whether you're just curious or deeply involved, you belong here.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="h-full p-6 rounded-2xl bg-card border-glow hover:bg-card/80 transition-all duration-300 group-hover:scale-105">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
