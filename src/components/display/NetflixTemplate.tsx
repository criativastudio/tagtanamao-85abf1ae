import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ChevronLeft, ChevronRight, Volume2, VolumeX, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaItem {
  url: string;
  title?: string;
  type?: "image" | "video";
}

interface TemplateConfig {
  hero?: {
    type: "video" | "image" | "carousel" | "youtube";
    items: MediaItem[];
    youtubeId?: string;
  };
  covers?: MediaItem[];
  thumbnails?: MediaItem[];
  sections?: { title: string; itemIndexes: number[] }[];
}

interface NetflixTemplateProps {
  businessName: string;
  description?: string | null;
  logoUrl?: string | null;
  themeColor?: string;
  config: TemplateConfig;
}

const extractYoutubeId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

export default function NetflixTemplate({ businessName, description, logoUrl, themeColor = "#e50914", config }: NetflixTemplateProps) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroItems = config.hero?.items || [];
  const covers = config.covers || [];
  const thumbnails = config.thumbnails || [];
  const sections = config.sections || [];

  // Auto-rotate hero carousel
  useEffect(() => {
    if (config.hero?.type !== "carousel" || heroItems.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroItems.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroItems.length, config.hero?.type]);

  const heroNext = () => setHeroIndex((prev) => (prev + 1) % heroItems.length);
  const heroPrev = () => setHeroIndex((prev) => (prev - 1 + heroItems.length) % heroItems.length);

  const currentHero = heroItems[heroIndex];

  // Build sections from thumbnails if no custom sections defined
  const displaySections = sections.length > 0
    ? sections
    : thumbnails.length > 0
      ? [{ title: "Destaques", itemIndexes: thumbnails.map((_, i) => i) }]
      : [];

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans">
      {/* Nav Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent px-4 py-3 md:px-8">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt={businessName} className="h-8 md:h-10 object-contain" />
            ) : (
              <span className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: themeColor }}>
                {businessName}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full aspect-[16/9] max-h-[80vh] overflow-hidden">
        <AnimatePresence mode="wait">
          {currentHero && (
            <motion.div
              key={heroIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              {(currentHero.type === "video" || config.hero?.type === "video") ? (
                <video
                  ref={videoRef}
                  src={currentHero.url}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted={muted}
                  playsInline
                />
              ) : config.hero?.type === "youtube" && config.hero.youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${config.hero.youtubeId}?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&playlist=${config.hero.youtubeId}`}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <img
                  src={currentHero.url}
                  alt={currentHero.title || businessName}
                  className="w-full h-full object-cover"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/80 via-transparent to-transparent" />

        {/* Hero Content */}
        <div className="absolute bottom-[15%] left-4 md:left-12 max-w-lg z-10">
          {logoUrl && (
            <h1 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-lg">
              {businessName}
            </h1>
          )}
          {description && (
            <p className="text-sm md:text-base text-gray-200 line-clamp-3 mb-4 drop-shadow">
              {description}
            </p>
          )}
          <div className="flex items-center gap-3">
            {(config.hero?.type === "video" || config.hero?.type === "youtube") && (
              <Button
                onClick={() => setMuted(!muted)}
                className="rounded-full"
                size="icon"
                variant="ghost"
                style={{ borderColor: themeColor }}
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </div>

        {/* Carousel Controls */}
        {config.hero?.type === "carousel" && heroItems.length > 1 && (
          <>
            <button
              onClick={heroPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 rounded-full p-2 transition"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={heroNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 rounded-full p-2 transition"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="absolute bottom-4 right-4 z-10 flex gap-1.5">
              {heroItems.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition ${i === heroIndex ? "bg-white scale-110" : "bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Cover Photos Row */}
      {covers.length > 0 && (
        <section className="px-4 md:px-12 py-6 -mt-12 relative z-10">
          <h2 className="text-lg md:text-xl font-semibold mb-4 text-white/90">Em Destaque</h2>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {covers.map((cover, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05, zIndex: 10 }}
                className="flex-none w-[280px] md:w-[320px] rounded-md overflow-hidden cursor-pointer relative group"
              >
                <img
                  src={cover.url}
                  alt={cover.title || `Capa ${i + 1}`}
                  className="w-full aspect-[16/9] object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <span className="text-sm font-medium">{cover.title || `Destaque ${i + 1}`}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Thumbnail Sections */}
      {displaySections.map((section, si) => (
        <section key={si} className="px-4 md:px-12 py-4">
          <h2 className="text-lg md:text-xl font-semibold mb-4 text-white/90">{section.title}</h2>
          <div className="flex gap-2 md:gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {section.itemIndexes.map((idx) => {
              const thumb = thumbnails[idx];
              if (!thumb) return null;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.08, zIndex: 10 }}
                  className="flex-none w-[140px] md:w-[180px] rounded overflow-hidden cursor-pointer relative group"
                >
                  <img
                    src={thumb.url}
                    alt={thumb.title || `Item ${idx + 1}`}
                    className="w-full aspect-[2/3] object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <span className="text-xs font-medium line-clamp-2">{thumb.title || ""}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Footer */}
      <footer className="px-4 md:px-12 py-8 border-t border-white/10 mt-8">
        <p className="text-center text-xs text-gray-500">
          Powered by TagNaMão
        </p>
      </footer>
    </div>
  );
}
