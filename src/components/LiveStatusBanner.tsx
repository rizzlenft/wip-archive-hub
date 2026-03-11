import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMeetupStatus, type MeetupStatus } from "@/lib/meetupSchedule";

const TWITCH_URL = "https://www.twitch.tv/wipmeetup";
const HYPERFY_URL = "https://hyperfy.io/wip";

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
          <a
            href={TWITCH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative rounded-xl border border-destructive/40 bg-destructive/10 backdrop-blur-sm px-5 py-4 text-center space-y-3 overflow-hidden hover:bg-destructive/15 transition-colors"
          >
            {/* Pulse glow */}
            <div className="absolute inset-0 bg-destructive/5 animate-pulse pointer-events-none" />
            
            <div className="flex items-center justify-center gap-2 relative">
              <span className="text-2xl animate-pulse">🔴</span>
              <span className="text-destructive font-bold uppercase tracking-wider text-lg">
                Live Now
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground relative">
              The WIP Meetup is live on Twitch — tap to watch!
            </p>
          </a>
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

            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" size="lg" asChild>
                <a href={HYPERFY_URL} target="_blank" rel="noopener noreferrer">
                  <Sparkles className="w-4 h-4" />
                  Open Hyperfy
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href={TWITCH_URL} target="_blank" rel="noopener noreferrer">
                  <Radio className="w-4 h-4" />
                  Watch on Twitch
                </a>
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
