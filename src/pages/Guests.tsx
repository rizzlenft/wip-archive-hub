import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Shuffle, Play, ArrowLeft, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAllEpisodes, extractUniqueGuests, type Episode } from "@/lib/youtube";
import { SEO } from "@/components/SEO";
import wipLogo from "@/assets/wip-logo.gif";

interface GuestWithCount {
  name: string;
  count: number;
  events: Episode[];
}

const Guests = () => {
  const [events, setEvents] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<GuestWithCount | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadEpisodes = async () => {
      setLoading(true);
      const data = await fetchAllEpisodes();
      setEvents(data);
      setLoading(false);
    };
    loadEpisodes();
  }, []);

  // Build guest data with event counts
  const guestsWithCounts = useMemo(() => {
    const guestMap = new Map<string, GuestWithCount>();
    
    events.forEach(ep => {
      ep.guests.forEach(guest => {
        if (!guestMap.has(guest)) {
          guestMap.set(guest, { name: guest, count: 0, events: [] });
        }
        const guestData = guestMap.get(guest)!;
        guestData.count++;
        guestData.events.push(ep);
      });
    });
    
    return Array.from(guestMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  }, [events]);

  // Group guests by first letter
  const groupedGuests = useMemo(() => {
    const filtered = searchQuery.trim() 
      ? guestsWithCounts.filter(g => 
          g.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : guestsWithCounts;
    
    const groups = new Map<string, GuestWithCount[]>();
    
    filtered.forEach(guest => {
      const firstChar = guest.name.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      
      if (!groups.has(letter)) {
        groups.set(letter, []);
      }
      groups.get(letter)!.push(guest);
    });
    
    return groups;
  }, [guestsWithCounts, searchQuery]);

  const sortedLetters = useMemo(() => 
    Array.from(groupedGuests.keys()).sort(), 
    [groupedGuests]
  );

  const handleRandomGuest = () => {
    const randomGuest = guestsWithCounts[Math.floor(Math.random() * guestsWithCounts.length)];
    if (randomGuest) {
      setSelectedGuest(randomGuest);
    }
  };

  const handlePlayEvent = (event: Episode) => {
    window.open(`https://www.youtube.com/watch?v=${event.videoId}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Guests"
        description="Explore the full directory of guests and collaborators who have appeared on The WIP Meetup since 2019."
        canonical="/guests"
      />
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-24 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img src={wipLogo} alt="The WIP Meetup" className="w-24 h-24 rounded-full" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Guest <span className="text-gradient-rainbow">Archive</span>
            </h1>
            <p className="text-muted-foreground mb-6">
              A directory of legendary guests and collaborators from The WIP Meetup
            </p>
            
            {/* Stats */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm">{guestsWithCounts.length}+ verified guests since 2019</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Search & Actions */}
      <section className="py-4 sticky top-16 md:top-20 z-30 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 max-w-2xl mx-auto">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            
            {/* Feeling Lucky */}
            <Button
              variant="outline"
              onClick={handleRandomGuest}
              className="border-primary/50 hover:border-primary"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Feeling Lucky
            </Button>
          </div>
        </div>
      </section>

      {/* Guest Directory */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sortedLetters.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No guests found matching "{searchQuery}"</p>
              <Button variant="outline" className="mt-4" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {sortedLetters.map((letter) => (
                <motion.div
                  key={letter}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Letter Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-2xl font-bold text-primary">{letter}</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                    <span className="text-sm text-muted-foreground">
                      {groupedGuests.get(letter)?.length || 0}
                    </span>
                  </div>
                  
                  {/* Guest Pills */}
                  <div className="flex flex-wrap gap-2">
                    {groupedGuests.get(letter)?.map((guest) => (
                      <button
                        key={guest.name}
                        onClick={() => setSelectedGuest(guest)}
                        className="group flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <Play className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm">{guest.name}</span>
                        {guest.count > 1 && (
                          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                            ×{guest.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Guest Detail Modal */}
      <AnimatePresence>
        {selectedGuest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md"
            onClick={() => setSelectedGuest(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="relative w-full max-w-2xl max-h-[80vh] bg-card border border-border rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedGuest.name}</h2>
                    <p className="text-muted-foreground text-sm">
                      {selectedGuest.count} event{selectedGuest.count > 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedGuest(null)}
                    className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                  >
                    <span className="text-xl">×</span>
                  </button>
                </div>
              </div>
              
              {/* Events List */}
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                <div className="space-y-2">
                  {selectedGuest.events
                    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
                    .map((event) => (
                      <button
                        key={event.videoId}
                        onClick={() => handlePlayEvent(event)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left group"
                      >
                        <div className="relative w-24 h-14 rounded overflow-hidden flex-shrink-0">
                          <img 
                            src={event.thumbnail} 
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-5 h-5 text-white" fill="white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                            {event.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.publishedAt.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Footer />
    </div>
  );
};

export default Guests;
