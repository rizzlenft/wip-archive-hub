import wipLogo from "@/assets/wip-logo-static.png";

const socialLinks = [
  { name: "Discord", url: "https://discord.gg/bTjc6k5uss" },
  { name: "Twitter", url: "https://twitter.com/theWIPmeetup" },
  { name: "YouTube", url: "https://www.youtube.com/@thewipmeetup" },
  { name: "Substack", url: "https://thewipmeetup.substack.com/" },
  { name: "Farcaster", url: "https://farcaster.xyz/~/channel/thewipmeetup" },
  { name: "Twitch", url: "https://www.twitch.tv/wipmeetup" },
  { name: "Blog", url: "https://paragraph.com/@blog.thewipmeetup" },
];

export const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-10" role="contentinfo">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-3 text-center md:text-left">
            <img src={wipLogo} alt="The WIP" className="h-8 w-8 shrink-0" />
            <span className="font-bold text-xl">The WIP Meetup</span>
          </div>

          {/* Links */}
          <div className="flex max-w-2xl flex-wrap justify-center gap-x-4 gap-y-2 sm:gap-x-6">
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
          <div className="text-center text-sm text-muted-foreground md:text-right">
            <p>© {new Date().getFullYear()} The WIP Meetup</p>
            <a 
              href="https://rizzle.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs mt-1 hover:text-primary transition-colors group"
            >
              <span>Hosted & produced by</span>
              <img 
                src={rizzlePfp} 
                alt="rizzle" 
                className="w-4 h-4 rounded-full group-hover:scale-110 transition-transform"
              />
              <span className="underline underline-offset-2">rizzle</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};