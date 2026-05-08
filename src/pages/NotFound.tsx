import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { CalendarDays, Mail } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Page Not Found" noindex />
      <Navigation />
      <main className="flex min-h-[70vh] items-center justify-center px-4 pt-24 pb-16">
        <div className="text-center max-w-xl mx-auto space-y-6">
          <h1 className="text-7xl md:text-8xl font-bold text-gradient-rainbow glow-text">404</h1>
          <p className="text-xl text-muted-foreground">
            This corner of the metaverse doesn't exist (yet).
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button size="lg" asChild>
              <Link to="/events">
                <CalendarDays className="w-5 h-5" />
                Browse Events
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/newsletter">
                <Mail className="w-5 h-5" />
                Read the Newsletter
              </Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground pt-2">
            Or <Link to="/" className="text-primary hover:underline">return home</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
