import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const getPTDate = (): Date => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
};

const isMeetupActive = (): boolean => {
  const pt = getPTDate();
  const day = pt.getDay();
  const totalMinutes = pt.getHours() * 60 + pt.getMinutes();
  // Hide countdown during "Starting Soon" (11 AM) through "Live" (2 PM) on Thursday
  return day === 4 && totalMinutes >= 660 && totalMinutes < 840;
};

const getNextThursdayNoonPT = (): Date => {
  const pt = getPTDate();
  const day = pt.getDay();
  let daysUntil = (4 - day + 7) % 7;

  const totalMin = pt.getHours() * 60 + pt.getMinutes();
  // If it's Thursday past noon PT, target next week
  if (daysUntil === 0 && totalMin >= 720) daysUntil = 7;

  // Build a target date in PT space, set to noon, then find the real UTC offset
  const future = new Date();
  future.setDate(future.getDate() + daysUntil);

  // Get PT offset for that future date (handles DST)
  const utcStr = future.toLocaleString("en-US", { timeZone: "UTC" });
  const ptStr = future.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  const ptOffsetMs = new Date(utcStr).getTime() - new Date(ptStr).getTime();

  // PT noon = 12:00 on that date in PT. In UTC that's 12:00 + offset.
  const ptDate = new Date(future.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  ptDate.setHours(12, 0, 0, 0);
  return new Date(ptDate.getTime() + ptOffsetMs);
};

const calculateTimeLeft = (targetDate: Date): TimeLeft => {
  const now = new Date();
  const difference = targetDate.getTime() - now.getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
};

export const CountdownTimer = () => {
  const [targetDate] = useState(getNextThursdayNoonPT);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const [active, setActive] = useState(isMeetupActive);

  useEffect(() => {
    const checkActive = setInterval(() => setActive(isMeetupActive()), 30_000);
    return () => clearInterval(checkActive);
  }, []);

  // Hide countdown when the live banner is showing
  if (active) return null;

  const timeBlocks = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground uppercase tracking-wider">
        Next Meetup In
      </p>
      <div className="flex justify-center gap-3 md:gap-4">
        {timeBlocks.map((block, index) => (
          <motion.div
            key={block.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col items-center"
          >
            <div className="w-16 md:w-20 h-16 md:h-20 rounded-xl bg-card border-glow flex items-center justify-center">
              <span className="text-2xl md:text-3xl font-bold text-gradient-rainbow">
                {String(block.value).padStart(2, "0")}
              </span>
            </div>
            <span className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
              {block.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
