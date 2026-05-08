import { motion } from "framer-motion";
import { CalendarDays, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { LiveStatusBanner } from "@/components/LiveStatusBanner";
import { Button } from "@/components/ui/button";

import heroBg from "@/assets/hero-bg.jpg";
import wipLogo from "@/assets/wip-logo.gif";

export const Hero = () => {
  return (
    <section className="relative flex min-h-[76vh] items-center justify-center overflow-hidden pt-20 md:min-h-[82vh] md:pt-24">
      {/* Background Image (LCP) */}
      <img
        src={heroBg}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />

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
          decoding="async"
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-5xl space-y-4 md:space-y-5"
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
              alt=""
              className="h-36 w-36 animate-float md:h-52 md:w-52 lg:h-60 lg:w-60"
              width={256}
              height={256}
              loading="eager"
              fetchPriority="high"
            />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl"
          >
            <span className="text-gradient-rainbow glow-text">The WIP Meetup</span>
          </motion.h1>

          {/* Subtitle - consolidated and concise */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            WIP = Work in Progress. The longest-running web3 metaverse meetup brings builders,
            creators, and artists together <span className="font-semibold text-primary">every Thursday at 12 PM PT</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row"
          >
            <Button size="lg" asChild>
              <a href="#watch">
                <PlayCircle className="h-5 w-5" />
                Watch Latest Event
              </a>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <Link to="/events">
                <CalendarDays className="h-5 w-5" />
                Browse Events
              </Link>
            </Button>
          </motion.div>

          {/* Live Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="pt-2"
          >
            <LiveStatusBanner />
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
