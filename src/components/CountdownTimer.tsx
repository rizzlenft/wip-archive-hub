import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getNextMeetupDate, isMeetupActive } from "@/lib/meetupSchedule";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

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
  const [targetDate] = useState(getNextMeetupDate);
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
