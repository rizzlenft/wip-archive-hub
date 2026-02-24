import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type MeetupStatus = "live" | "starting-soon" | "upcoming";

const HYPERFY_URL = "https://hyperfy.io/wip";

const getMeetupStatus = (): MeetupStatus => {
  const now = new Date();
  // Convert to PT
  const pt = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const day = pt.getDay(); // 4 = Thursday
  const hour = pt.getHours();
  const minutes = pt.getMinutes();
  const totalMinutes = hour * 60 + minutes;

  if (day !== 4) return "upcoming";

  // Live: Thursday 12:00 PM - 2:00 PM PT
  if (totalMinutes >= 720 && totalMinutes < 840) return "live";
  // Starting soon: Thursday 11:00 AM - 12:00 PM PT
  if (totalMinutes >= 660 && totalMinutes < 720) return "starting-soon";

  return "upcoming";
};

export const LiveStatusBanner = () => {
  const [status, setStatus] = useState<MeetupStatus>(getMeetupStatus);

  useEffect(() => {
    const timer = setInterval(() => setStatus(getMeetupStatus()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (status === "upcoming") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md mx-auto"
      >
        {status === "live" ? (
          <div className="relative rounded-xl border border-red-500/40 bg-red-500/10 backdrop-blur-sm px-5 py-4 text-center space-y-3 overflow-hidden">
            {/* Pulse glow */}
            <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
            
            <div className="flex items-center justify-center gap-2 relative">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-red-400 font-bold uppercase tracking-wider text-sm">
                Live Now
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground relative">
              The WIP Meetup is happening right now!
            </p>

            <Button variant="hero" size="lg" asChild className="relative">
              <a href={HYPERFY_URL} target="_blank" rel="noopener noreferrer">
                <Radio className="w-4 h-4" />
                Join in Hyperfy
              </a>
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-primary/30 bg-primary/5 backdrop-blur-sm px-5 py-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-primary font-bold uppercase tracking-wider text-sm">
                Starting Soon
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Today's meetup kicks off at 12 PM PT — get ready!
            </p>

            <Button variant="outline" size="lg" asChild>
              <a href={HYPERFY_URL} target="_blank" rel="noopener noreferrer">
                <Sparkles className="w-4 h-4" />
                Open Hyperfy
              </a>
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
