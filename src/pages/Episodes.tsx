import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Calendar, Users, Play, X, ChevronDown, ArrowUp } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  fetchAllEpisodes, 
  extractUniqueGuests, 
  groupEpisodesByYear,
  type Episode 
} from "@/lib/youtube";

const Episodes = () => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
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

  // Extract all unique guests and years
  const allGuests = useMemo(() => extractUniqueGuests(episodes), [episodes]);
  const allYears = useMemo(() => {
    const years = new Set(episodes.map(ep => ep.publishedAt.getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [episodes]);

  // Filter episodes
  const filteredEpisodes = useMemo(() => {
    let result = [...episodes];
    
    // Filter by search query (title or guest)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(ep => 
        ep.title.toLowerCase().includes(query) ||
        ep.guests.some(g => g.toLowerCase().includes(query))
      );
    }
    
    // Filter by selected guest
    if (selectedGuest) {
      result = result.filter(ep => 
        ep.guests.some(g => g.toLowerCase() === selectedGuest.toLowerCase())
      );
    }
    
    // Filter by selected year
    if (selectedYear) {
      result = result.filter(ep => ep.publishedAt.getFullYear() === selectedYear);
    }
    
    return result;
  }, [episodes, searchQuery, selectedGuest, selectedYear]);

  // Group filtered episodes by year for timeline view
  const groupedByYear = useMemo(() => groupEpisodesByYear(filteredEpisodes), [filteredEpisodes]);
  const sortedYears = useMemo(() => 
    Array.from(groupedByYear.keys()).sort((a, b) => b - a), 
    [groupedByYear]
  );

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedGuest(null);
    setSelectedYear(null);
  };

  const hasActiveFilters = searchQuery || selectedGuest || selectedYear;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 relative overflow-hidden">
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
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Episode <span className="text-gradient-rainbow">Archive</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Explore {episodes.length}+ episodes from the longest-running web3 metaverse meetup. 
              Search by guest, browse by year, or dive into the timeline.
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-5 h-5 text-primary" />
                <span>Since 2019</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Play className="w-5 h-5 text-primary" />
                <span>{episodes.length} Episodes</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-5 h-5 text-primary" />
                <span>{allGuests.length} Guests Featured</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="py-6 sticky top-16 md:top-20 z-30 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search episodes or guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Guest Filter Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGuestDropdown(!showGuestDropdown);
                  setShowYearDropdown(false);
                }}
                className={selectedGuest ? "border-primary text-primary" : ""}
              >
                <Users className="w-4 h-4 mr-2" />
                {selectedGuest || "All Guests"}
                <ChevronDown className="w-4 h-4 ml-2" />
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
            
            {/* Year Filter Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => {
                  setShowYearDropdown(!showYearDropdown);
                  setShowGuestDropdown(false);
                }}
                className={selectedYear ? "border-primary text-primary" : ""}
              >
                <Calendar className="w-4 h-4 mr-2" />
                {selectedYear || "All Years"}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              
              <AnimatePresence>
                {showYearDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-40 bg-popover border border-border rounded-lg shadow-xl z-50"
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
            
            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          
          {/* Results count */}
          <p className="text-sm text-muted-foreground mt-3">
            Showing {filteredEpisodes.length} of {episodes.length} episodes
            {selectedGuest && <span> featuring <strong>{selectedGuest}</strong></span>}
            {selectedYear && <span> from <strong>{selectedYear}</strong></span>}
          </p>
        </div>
      </section>

      {/* Timeline View */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredEpisodes.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No episodes found matching your criteria.</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/20" />
              
              {sortedYears.map((year, yearIndex) => (
                <div key={year} className="relative">
                  {/* Year marker */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="sticky top-36 md:top-40 z-20 flex items-center justify-start md:justify-center mb-8"
                  >
                    <div className="ml-0 md:ml-0 bg-primary text-primary-foreground px-6 py-2 rounded-full font-bold text-xl shadow-lg">
                      {year}
                    </div>
                  </motion.div>
                  
                  {/* Episodes for this year */}
                  <div className="space-y-6 mb-16">
                    {groupedByYear.get(year)?.map((episode, index) => (
                      <motion.div
                        key={episode.videoId}
                        initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        className={`relative flex items-start gap-4 md:gap-8 ${
                          index % 2 === 0 
                            ? "md:flex-row md:pr-[52%]" 
                            : "md:flex-row-reverse md:pl-[52%]"
                        }`}
                      >
                        {/* Timeline dot */}
                        <div className="absolute left-4 md:left-1/2 md:-translate-x-1/2 w-3 h-3 bg-primary rounded-full mt-4 shadow-lg shadow-primary/50" />
                        
                        {/* Episode card */}
                        <div className="ml-10 md:ml-0 flex-1 group">
                          <div 
                            className="bg-card rounded-xl overflow-hidden border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
                            onClick={() => setPlayingVideo(playingVideo === episode.videoId ? null : episode.videoId)}
                          >
                            {/* Thumbnail / Video */}
                            <div className="relative aspect-video bg-muted">
                              {playingVideo === episode.videoId ? (
                                <iframe
                                  src={`https://www.youtube.com/embed/${episode.videoId}?autoplay=1&rel=0`}
                                  title={episode.title}
                                  className="absolute inset-0 w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              ) : (
                                <>
                                  <img
                                    src={episode.thumbnail}
                                    alt={episode.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                      <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                            
                            {/* Info */}
                            <div className="p-4">
                              <p className="text-xs text-muted-foreground mb-1">
                                {episode.publishedAt.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                                {episode.episodeNumber && (
                                  <span className="ml-2 text-primary">#{episode.episodeNumber}</span>
                                )}
                              </p>
                              <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                                {episode.title}
                              </h3>
                              {episode.guests.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {episode.guests.map(guest => (
                                    <span
                                      key={guest}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedGuest(guest);
                                      }}
                                      className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20 cursor-pointer transition-colors"
                                    >
                                      {guest}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
