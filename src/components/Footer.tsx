import wipLogo from "@/assets/wip-logo-static.png";
import rizzlePfp from "@/assets/rizzle-pfp.jpeg";

const socialLinks = [
  { name: "Discord", url: "https://discord.gg/XHDcUdm3" },
  { name: "Twitter", url: "https://twitter.com/theWIPmeetup" },
  { name: "YouTube", url: "https://www.youtube.com/@thewipmeetup" },
  { name: "Substack", url: "https://thewipmeetup.substack.com/" },
  { name: "Farcaster", url: "https://farcaster.xyz/~/channel/thewipmeetup" },
  { name: "Twitch", url: "https://www.twitch.tv/wipmeetup" },
  { name: "Blog", url: "https://paragraph.com/@blog.thewipmeetup" },
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
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 sm:gap-x-6">
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