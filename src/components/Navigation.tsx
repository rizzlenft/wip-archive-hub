import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import wipLogo from "@/assets/wip-logo-static.png";
import iconFarcaster from "@/assets/icon-farcaster.png";
import iconHyperfy from "@/assets/icon-hyperfy.png";
import iconSubstack from "@/assets/icon-substack.png";

const navLinks = [
  { name: "Episodes", href: "/episodes" },
  { name: "Newsletter", href: "/newsletter" },
  { name: "Merch", href: "/merch" },
];

const socialLinks = [
  { name: "Discord", url: "https://discord.gg/bTjc6k5uss", icon: "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/636e0a6ca814282eca7172c6_icon_clyde_white_RGB.svg" },
  { name: "Twitter", url: "https://twitter.com/theWIPmeetup", icon: "https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png" },
  { name: "YouTube", url: "https://www.youtube.com/@thewipmeetup", icon: "https://www.youtube.com/s/desktop/c01ea7e3/img/favicon_144x144.png" },
  { name: "Farcaster", url: "https://farcaster.xyz/~/channel/thewipmeetup", icon: iconFarcaster },
  { name: "Twitch", url: "https://www.twitch.tv/wipmeetup", icon: "https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png" },
  { name: "Metaverse", url: "https://thewipmeetup.hyperworld.host/", icon: iconHyperfy },
  { name: "Substack", url: "https://thewipmeetup.substack.com/", icon: iconSubstack },
];

export const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, login, logout, user } = useAuth();

  const closeMobile = useCallback(() => setIsMobileMenuOpen(false), []);

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
            <Link to="/" className="flex items-center gap-3 group">
              <img 
                src={wipLogo} 
                alt="The WIP" 
                className="w-10 h-10 group-hover:scale-110 transition-transform"
                width={40}
                height={40}
              />
              <span className="font-bold text-lg hidden sm:inline">The WIP</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.name}
                </Link>
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
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 hover:bg-primary/20 hover:scale-110 transition-all"
                >
                  <img src={link.icon} alt={link.name} className="w-5 h-5 object-contain" loading="lazy" width={20} height={20} />
                </a>
              ))}
            </div>

            {/* CTA + Auth */}
            <div className="flex items-center gap-3">
              {!isAuthenticated ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => login("/events")}
                >
                  Guest Book
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden sm:inline-flex max-w-[180px] truncate"
                    >
                      {user?.email || "My events"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/events">My events</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => { void logout(); }}
                    >
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-foreground"
                aria-label="Toggle menu"
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
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={closeMobile}
                    className="text-2xl font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
                {!isAuthenticated ? (
                  <Button
                    variant="outline"
                    size="lg"
                    className="mt-2"
                    onClick={() => { closeMobile(); login("/events"); }}
                  >
                    Guest Book
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="lg" className="mt-2" asChild>
                      <Link to="/events" onClick={closeMobile}>
                        {user?.email || "My events"}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="mt-2"
                      onClick={() => { closeMobile(); void logout(); }}
                    >
                      Sign out
                    </Button>
                  </>
                )}
                {/* Social Icons */}
                <div className="flex items-center gap-3 mt-6 flex-wrap justify-center">
                  {socialLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link.name}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-muted/50 hover:bg-primary/20 hover:scale-110 transition-all"
                    >
                      <img src={link.icon} alt={link.name} className="w-5 h-5 object-contain" loading="lazy" width={20} height={20} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
