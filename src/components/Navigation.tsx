import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import wipLogo from "@/assets/wip-logo-static.png";

const navLinks = [
  { name: "About", href: "#about" },
  { name: "Platforms", href: "#platforms" },
  { name: "Episodes", href: "#content" },
];

const socialLinks = [
  { name: "Discord", url: "https://discord.gg/XHDcUdm3", icon: "💬" },
  { name: "Twitter", url: "https://twitter.com/theWIPmeetup", icon: "𝕏" },
  { name: "YouTube", url: "https://www.youtube.com/@thewipmeetup", icon: "▶️" },
  { name: "Warpcast", url: "https://warpcast.com/thewipmeetup", icon: "🟣" },
  { name: "Twitch", url: "https://www.twitch.tv/wipmeetup", icon: "📺" },
];

export const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-background/90 backdrop-blur-lg border-b border-border/50"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <a href="#" className="flex items-center gap-3 group">
              <img 
                src={wipLogo} 
                alt="The WIP" 
                className="w-10 h-10 group-hover:scale-110 transition-transform"
              />
              <span className="font-bold text-lg hidden sm:inline">The WIP</span>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>

            {/* Social Icons */}
            <div className="hidden md:flex items-center gap-2">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.name}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 hover:bg-primary/20 hover:scale-110 transition-all text-sm"
                >
                  {link.icon}
                </a>
              ))}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <Button variant="electric" size="sm" className="hidden sm:flex" asChild>
                <a href="https://discord.gg/XHDcUdm3" target="_blank" rel="noopener noreferrer">
                  <Sparkles className="w-4 h-4" />
                  Join Us
                </a>
              </Button>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-foreground"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-lg pt-20 md:hidden"
          >
            <div className="container mx-auto px-4 py-8">
              <div className="flex flex-col gap-6">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-2xl font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </a>
                ))}
                <Button variant="electric" size="lg" className="mt-4" asChild>
                  <a href="https://discord.gg/XHDcUdm3" target="_blank" rel="noopener noreferrer">
                    <Sparkles className="w-5 h-5" />
                    Join the Community
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
