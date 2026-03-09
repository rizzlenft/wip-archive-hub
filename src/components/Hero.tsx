import { motion } from "framer-motion";
import { Calendar, Users, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/CountdownTimer";
import { LiveStatusBanner } from "@/components/LiveStatusBanner";
import heroBg from "@/assets/hero-bg.jpg";
import wipLogo from "@/assets/wip-logo.gif";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 md:pt-28">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})`, backgroundPosition: 'center center' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid opacity-20" />

      {/* Large Background Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ delay: 0.2, duration: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <img 
          src={wipLogo} 
          alt="" 
          className="w-[500px] h-[500px] md:w-[700px] md:h-[700px] lg:w-[900px] lg:h-[900px]"
          loading="lazy"
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          {/* Animated Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex justify-center"
          >
            <img 
              src={wipLogo} 
              alt="The WIP Logo" 
              className="w-40 h-40 md:w-56 md:h-56 lg:w-64 lg:h-64 animate-float"
              width={256}
              height={256}
            />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight"
          >
            <span className="text-gradient-rainbow glow-text">The WIP Meetup</span>
          </motion.h1>

          {/* Subtitle - consolidated and concise */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed"
          >
            The longest-running web3 metaverse meetup. Builders, creators, and artists gather
            <span className="text-primary font-semibold"> every Thursday at 12 PM PT</span>—since 2019.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-6 md:gap-8 pt-2"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">6+ Years Running</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">3,700+ Community Members</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">Weekly Insights & Connections</span>
            </div>
          </motion.div>

          {/* Live Status or Countdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <LiveStatusBanner />
            <CountdownTimer />
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap justify-center gap-4 pt-2"
          >
            <Button variant="hero" size="xl" asChild>
              <a href="https://discord.gg/XHDcUdm3" target="_blank" rel="noopener noreferrer">
                <Sparkles className="w-5 h-5" />
                Join the Community
              </a>
            </Button>
            <Button 
              variant="outline" 
              size="xl" 
              onClick={() => {
                const streams = [
                  "live/UyPHBnJNT0M",
                  "live/L6wVfn9_jlA",
                  "live/rJHxWrCHQEY",
                  "live/HFIBsM1fk_I",
                  "live/NjNlBEYfmFk",
                  "live/Gf-7o8Y0AAk",
                  "live/pP9dP3m2wB4",
                  "live/YrT8z2zAp9I",
                ];
                const randomStream = streams[Math.floor(Math.random() * streams.length)];
                window.open(`https://www.youtube.com/@thewipmeetup/${randomStream}`, '_blank');
              }}
            >
              <Play className="w-5 h-5" />
              Watch a Random Event
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
