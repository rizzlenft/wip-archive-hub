import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Calendar, Users, Play, X, ChevronDown, ArrowUp, Shuffle } from "lucide-react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EpisodeRow } from "@/components/episodes/EpisodeRow";
import { SEO } from "@/components/SEO";
import { 
  fetchAllEpisodes, 
  extractUniqueGuests, 
  groupEpisodesByYear,
  type Episode 
} from "@/lib/youtube";

const Episodes = () => {
  const [events, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const loadEpisodes = async () => {
      setLoading(true);
      const data = await fetchAllEpisodes();
      setEpisodes(data);
      setLoading(false);
    };
    loadEpisodes();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowGuestDropdown(false);
      setShowYearDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Extract all unique guests and years
  const allGuests = useMemo(() => extractUniqueGuests(events), [events]);
  const allYears = useMemo(() => {
    const years = new Set(events.map(ep => ep.publishedAt.getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    let result = [...events];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(ep => 
        ep.title.toLowerCase().includes(query) ||
        ep.guests.some(g => g.toLowerCase().includes(query))
      );
    }
    
    if (selectedGuest) {
      result = result.filter(ep => 
        ep.guests.some(g => g.toLowerCase() === selectedGuest.toLowerCase())
      );
    }
    
    if (selectedYear) {
      result = result.filter(ep => ep.publishedAt.getFullYear() === selectedYear);
    }
    
    return result;
  }, [events, searchQuery, selectedGuest, selectedYear]);

  // Group filtered events by year
  const groupedByYear = useMemo(() => groupEpisodesByYear(filteredEvents), [filteredEvents]);
  const sortedYears = useMemo(() => 
    Array.from(groupedByYear.keys()).sort((a, b) => b - a), 
    [groupedByYear]
  );

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedGuest(null);
    setSelectedYear(null);
  };

  const handleRandomEpisode = () => {
    const randomEp = events[Math.floor(Math.random() * events.length)];
    if (randomEp) {
      window.open(`https://www.youtube.com/watch?v=${randomEp.videoId}`, '_blank');
    }
  };

  const hasActiveFilters = searchQuery || selectedGuest || selectedYear;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Events"
        description="Browse 250+ events from The WIP Meetup — the longest-running web3 metaverse meetup. Search by guest, year, or topic."
        canonical="/events"
      />
      <Navigation />
      
      {/* Hero Section with Randomizer & Guest CTA */}
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
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Event <span className="text-gradient-rainbow">Archive</span>
            </h1>
            <p className="text-muted-foreground mb-6">
              {events.length}+ events from the longest-running web3 metaverse meetup
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <Button
                size="lg"
                onClick={handleRandomEpisode}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-lg"
              >
                <Shuffle className="w-5 h-5 mr-2" />
                Random Event
              </Button>
              <Link to="/guests">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary/50 hover:border-primary hover:bg-primary/5"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Explore {allGuests.length}+ Guests
                </Button>
              </Link>
            </div>
            
            {/* Stats Row */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm">Since 2019</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Play className="w-4 h-4 text-primary" />
                <span className="text-sm">{events.length} Events</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Search & Filters - Sticky */}
      <section className="py-4 sticky top-16 md:top-20 z-30 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events or guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            
            {/* Guest Filter */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowGuestDropdown(!showGuestDropdown);
                  setShowYearDropdown(false);
                }}
                className={selectedGuest ? "border-primary text-primary" : ""}
              >
                <Users className="w-3.5 h-3.5 mr-1.5" />
                <span className="hidden sm:inline">{selectedGuest || "Guests"}</span>
                <span className="sm:hidden">Guests</span>
                <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
              </Button>
              
              <AnimatePresence>
                {showGuestDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-64 max-h-80 overflow-auto bg-popover border border-border rounded-lg shadow-xl z-50"
                  >
                    <button
                      onClick={() => {
                        setSelectedGuest(null);
                        setShowGuestDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-muted transition-colors text-sm font-medium"
                    >
                      All Guests
                    </button>
                    {allGuests.map(guest => (
                      <button
                        key={guest}
                        onClick={() => {
                          setSelectedGuest(guest);
                          setShowGuestDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors text-sm ${
                          selectedGuest === guest ? "bg-primary/10 text-primary" : ""
                        }`}
                      >
                        {guest}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Year Filter */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowYearDropdown(!showYearDropdown);
                  setShowGuestDropdown(false);
                }}
                className={selectedYear ? "border-primary text-primary" : ""}
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                {selectedYear || "Year"}
                <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
              </Button>
              
              <AnimatePresence>
                {showYearDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-32 bg-popover border border-border rounded-lg shadow-xl z-50"
                  >
                    <button
                      onClick={() => {
                        setSelectedYear(null);
                        setShowYearDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-muted transition-colors text-sm font-medium"
                    >
                      All Years
                    </button>
                    {allYears.map(year => (
                      <button
                        key={year}
                        onClick={() => {
                          setSelectedYear(year);
                          setShowYearDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors text-sm ${
                          selectedYear === year ? "bg-primary/10 text-primary" : ""
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Random Event Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRandomEpisode}
              className="hidden sm:flex"
            >
              <Shuffle className="w-3.5 h-3.5 mr-1.5" />
              Random
            </Button>
            
            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
          
          {/* Results count */}
          {hasActiveFilters && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing {filteredEvents.length} of {events.length} events
            </p>
          )}
        </div>
      </section>

      {/* Netflix-Style Rows */}
      <section className="py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No events found matching your criteria.</p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedYears.map((year) => (
              <EpisodeRow
                key={year}
                year={year}
                episodes={groupedByYear.get(year) || []}
                onGuestClick={setSelectedGuest}
              />
            ))}
          </div>
        )}
      </section>
      
      {/* Scroll to top button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
      
      <Footer />
    </div>
  );
};

export default Episodes;
