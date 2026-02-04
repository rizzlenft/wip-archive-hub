import wipLogo from "@/assets/wip-logo-static.png";

const socialLinks = [
  { name: "Discord", url: "https://discord.gg/XHDcUdm3" },
  { name: "Twitter", url: "https://twitter.com/theWIPmeetup" },
  { name: "YouTube", url: "https://www.youtube.com/@thewipmeetup" },
  { name: "Warpcast", url: "https://warpcast.com/thewipmeetup" },
  { name: "Twitch", url: "https://www.twitch.tv/wipmeetup" },
];

export const Footer = () => {
  return (
    <footer className="py-12 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={wipLogo} alt="The WIP" className="w-8 h-8" />
            <span className="font-bold text-xl">The WIP Meetup</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6">
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Copyright & Credit */}
          <div className="text-sm text-muted-foreground text-center md:text-right">
            <p>© {new Date().getFullYear()} The WIP Meetup</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Hosted & produced by{" "}
              <a 
                href="https://twitter.com/raboracle" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                rizzle
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
