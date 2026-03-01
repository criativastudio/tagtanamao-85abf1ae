import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X, icons } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaItem {
  url: string;
  title?: string;
  type?: "image" | "video" | "instagram";
  badge?: string;
  bgColor?: string;
}

function extractReelId(url: string): string | null {
  const match = url.match(/(?:instagram\.com\/(?:reel|reels|p)\/|instagr\.am\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

interface HeroButton {
  label: string;
  icon?: string;
  url?: string;
  action?: string;
}

interface BottomNavItem {
  icon: string;
  label: string;
  url: string;
  badgeCount?: number;
}

interface SpecialButton {
  id: string;
  label: string;
  url: string;
  icon: string;
  enabled?: boolean;
}

interface TemplateConfig {
  hero?: {
    type: "video" | "image" | "carousel" | "youtube";
    items: MediaItem[];
    youtubeId?: string;
  };
  headline?: string;
  subheadline?: string;
  heroSubtitle?: string;
  tags?: string[];
  heroButtons?: HeroButton[];
  covers?: MediaItem[];
  thumbnails?: MediaItem[];
  sections?: { title: string; itemIndexes: number[] }[];
  bottomNav?: BottomNavItem[];
  specialButtons?: SpecialButton[];
}

interface NetflixTemplateProps {
  businessName: string;
  description?: string | null;
  logoUrl?: string | null;
  themeColor?: string;
  config: TemplateConfig;
  isPublic?: boolean;
  onSpecialButtonClick?: (button: SpecialButton) => void;
}

// Dynamic Lucide icon renderer
function LucideIcon({ name, className, size = 20 }: { name: string; className?: string; size?: number }) {
  const IconComponent = (icons as any)[name];
  if (!IconComponent) {
    const Fallback = (icons as any)["Home"];
    return Fallback ? <Fallback className={className} size={size} /> : null;
  }
  return <IconComponent className={className} size={size} />;
}

// Fullscreen media lightbox
function MediaLightbox({ item, onClose }: { item: MediaItem | null; onClose: () => void }) {
  if (!item) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 transition"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        <div className="max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
          {item.type === "video" ? (
            <video
              src={item.url}
              className="w-full max-h-[85vh] object-contain rounded-lg"
              controls
              autoPlay
              playsInline
              preload="auto"
            />
          ) : (
            <img
              src={item.url}
              alt={item.title || ""}
              className="w-full max-h-[85vh] object-contain rounded-lg"
            />
          )}
          {item.title && (
            <p className="text-white text-center mt-3 text-sm font-medium">{item.title}</p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function NetflixTemplate({
  businessName,
  description,
  logoUrl,
  themeColor = "#e50914",
  config,
  isPublic = false,
  onSpecialButtonClick,
}: NetflixTemplateProps) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Hero swipe state
  const heroTouchStartX = useRef(0);
  const heroTouchEndX = useRef(0);

  const heroItems = config.hero?.items || [];
  const covers = config.covers || [];
  const thumbnails = config.thumbnails || [];
  const sections = config.sections || [];
  const headline = config.headline || businessName;
  const subheadline = config.subheadline || "";
  const heroSubtitle = config.heroSubtitle || "";
  const tags = config.tags || [];
  const heroButtons = config.heroButtons || [];
  const bottomNav = config.bottomNav || [];

  // Play Netflix "ta-dum" sound once on public page load
  useEffect(() => {
    if (!isPublic) return;
    const audio = new Audio("/sounds/netflix-tadum.mp3");
    audio.volume = 0.7;
    let played = false;

    const playOnce = () => {
      if (played) return;
      played = true;
      audio.play().catch(() => {});
    };

    audio.play().then(() => {
      played = true;
    }).catch(() => {
      const events = ["click", "touchstart", "scroll"];
      const handler = () => {
        playOnce();
        events.forEach((e) => document.removeEventListener(e, handler));
      };
      events.forEach((e) => document.addEventListener(e, handler, { once: false }));
    });

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [isPublic]);

  // Inject Bebas Neue font
  useEffect(() => {
    if (!document.querySelector('link[href*="Bebas+Neue"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  // Auto-rotate hero carousel
  useEffect(() => {
    if (config.hero?.type !== "carousel" || heroItems.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroItems.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroItems.length, config.hero?.type]);

  const heroNext = useCallback(() => setHeroIndex((prev) => (prev + 1) % heroItems.length), [heroItems.length]);
  const heroPrev = useCallback(() => setHeroIndex((prev) => (prev - 1 + heroItems.length) % heroItems.length), [heroItems.length]);
  const currentHero = heroItems[heroIndex];

  // Hero swipe handlers
  const onHeroTouchStart = (e: React.TouchEvent) => {
    heroTouchStartX.current = e.touches[0].clientX;
  };
  const onHeroTouchEnd = () => {
    const diff = heroTouchStartX.current - heroTouchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) heroNext();
      else heroPrev();
    }
  };
  const onHeroTouchMove = (e: React.TouchEvent) => {
    heroTouchEndX.current = e.touches[0].clientX;
  };

  // Open media in lightbox
  const openMedia = (item: MediaItem) => {
    if (item.type === "instagram") return; // Can't lightbox iframes
    setLightboxItem(item);
  };

  const displaySections =
    sections.length > 0
      ? sections
      : thumbnails.length > 0
        ? [{ title: "Destaques", itemIndexes: thumbnails.map((_, i) => i) }]
        : [];

  const hasBottomNav = bottomNav.length > 0;

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-white font-sans"
      style={{ paddingBottom: hasBottomNav ? "72px" : 0 }}
    >
      {/* Inject styles */}
      <style>{`
        @keyframes netflix-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .netflix-carousel {
          animation: netflix-scroll 30s linear infinite;
        }
        .netflix-carousel:hover {
          animation-play-state: paused;
        }
        .netflix-headline {
          font-family: 'Bebas Neue', sans-serif;
          text-shadow: 0 4px 30px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.8), 0 0 60px rgba(0,0,0,0.5);
        }
        /* Card hover: scale + shadow on the card itself */
        .netflix-card {
          transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease;
        }
        .netflix-card:hover, .netflix-card:active {
          transform: scale(1.06);
          box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 16px rgba(229,9,20,0.25);
        }
        .netflix-card:active {
          transform: scale(1.03);
        }
        .netflix-card .netflix-card-title {
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.3s, transform 0.3s;
        }
        .netflix-card:hover .netflix-card-title {
          opacity: 1;
          transform: translateY(0);
        }
        .slider-hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Lightbox */}
      <MediaLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />

      {/* Top Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {logoUrl ? (
            <img src={logoUrl} alt={businessName} className="h-8 md:h-10 object-contain" />
          ) : (
            <span className="text-xl font-bold tracking-tight" style={{ color: themeColor }}>
              {businessName}
            </span>
          )}
        </div>
      </nav>

      {/* Hero Section - Swipeable */}
      <section
        className="relative w-full aspect-[9/16] max-h-[85vh] overflow-hidden"
        onTouchStart={heroItems.length > 1 ? onHeroTouchStart : undefined}
        onTouchMove={heroItems.length > 1 ? onHeroTouchMove : undefined}
        onTouchEnd={heroItems.length > 1 ? onHeroTouchEnd : undefined}
      >
        <AnimatePresence mode="wait">
          {currentHero && (
            <motion.div
              key={heroIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 cursor-pointer"
              onClick={() => currentHero && openMedia(currentHero)}
            >
              {currentHero.type === "video" || config.hero?.type === "video" ? (
                <video
                  ref={videoRef}
                  src={currentHero.url}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted={muted}
                  playsInline
                  preload="metadata"
                  poster=""
                  onLoadedData={(e) => {
                    const el = e.currentTarget;
                    el.style.opacity = "1";
                  }}
                  style={{ opacity: 1, transition: "opacity 0.3s" }}
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

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-black/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/60 via-transparent to-transparent pointer-events-none" />

        {/* Hero Content */}
        <div className="absolute bottom-[4%] left-0 right-0 px-6 z-10 text-center pointer-events-none">
          {subheadline && (
            <p className="text-xs md:text-sm uppercase tracking-[0.3em] text-white/80 mb-2 font-medium">
              {subheadline}
            </p>
          )}

          <h1 className="netflix-headline text-6xl md:text-8xl leading-none mb-1" style={{ color: "white" }}>
            {headline}
          </h1>

          {heroSubtitle && <p className="text-sm md:text-base text-white/70 mb-4 tracking-wide">{heroSubtitle}</p>}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
              {tags.map((tag, i) => (
                <span key={i} className="flex items-center gap-2 text-xs text-white/60">
                  {i > 0 && <span className="text-white/30">·</span>}
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Hero Buttons */}
          {heroButtons.length > 0 && (
            <div className="flex items-center justify-center gap-3 flex-wrap pointer-events-auto">
              {heroButtons.map((btn, i) => (
                <a
                  key={i}
                  href={btn.url || "#"}
                  onClick={(e) => {
                    if (btn.action === "scroll") {
                      e.preventDefault();
                      document.getElementById("covers-section")?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
                    i === 0
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                  }`}
                >
                  {btn.icon && <LucideIcon name={btn.icon} size={16} />}
                  {btn.label}
                </a>
              ))}
            </div>
          )}

          {/* Mute toggle for video/youtube */}
          {(config.hero?.type === "video" || config.hero?.type === "youtube") && (
            <div className="mt-4 pointer-events-auto">
              <Button onClick={() => setMuted(!muted)} className="rounded-full" size="icon" variant="ghost">
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
            </div>
          )}
        </div>

        {/* Carousel Controls */}
        {(config.hero?.type === "carousel" || heroItems.length > 1) && heroItems.length > 1 && (
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

      {/* Auto-scrolling Covers Carousel */}
      {covers.length > 0 && (
        <section id="covers-section" className="py-6 -mt-8 relative z-10 overflow-hidden">
          <h2 className="text-base md:text-lg font-semibold mb-4 text-white/90 px-4">Em Destaque</h2>
          <div className="overflow-hidden">
            <div
              className="netflix-carousel flex gap-3"
              style={{ width: covers.length > 2 ? "max-content" : undefined }}
            >
              {[...covers, ...(covers.length > 2 ? covers : [])].map((cover, i) => (
                <div
                  key={i}
                  className="flex-none w-[150px] md:w-[180px] rounded-lg overflow-hidden relative cursor-pointer netflix-card"
                  style={{ backgroundColor: cover.bgColor || "#1a1a2e" }}
                  onClick={() => openMedia(cover)}
                >
                  {/* Netflix N badge */}
                  <div className="absolute top-1.5 left-1.5 z-10 w-6 h-8 flex items-center justify-center">
                    <span
                      className="text-[#e50914] font-black text-2xl leading-none"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      N
                    </span>
                  </div>

                  {cover.type === "instagram" && extractReelId(cover.url) ? (
                    <div className="w-full aspect-[2/3] overflow-hidden relative">
                      <iframe
                        src={`https://www.instagram.com/reel/${extractReelId(cover.url)}/embed/?autoplay=1&mute=1`}
                        className="absolute border-0"
                        style={{
                          width: "300%",
                          height: "300%",
                          top: "-100%",
                          left: "-100%",
                          transform: "scale(0.5)",
                          transformOrigin: "center center",
                          pointerEvents: "none",
                        }}
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        scrolling="no"
                      />
                    </div>
                  ) : cover.type === "video" ? (
                    <video
                      src={cover.url}
                      className="w-full aspect-[2/3] object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      onLoadedData={(e) => { e.currentTarget.style.opacity = "1"; }}
                      style={{ opacity: 0, transition: "opacity 0.3s" }}
                    />
                  ) : (
                    <img
                      src={cover.url}
                      alt={cover.title || ""}
                      className="w-full aspect-[2/3] object-cover"
                      loading="lazy"
                    />
                  )}

                  {/* Static gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  {/* Title on hover */}
                  {cover.title && (
                    <div className="netflix-card-title absolute bottom-8 left-0 right-0 px-3 z-10">
                      <span className="text-xs font-bold uppercase tracking-wide text-white drop-shadow-lg">{cover.title}</span>
                    </div>
                  )}

                  {/* Badge — rounded top, taller, with margins */}
                  {cover.badge && (
                    <div className="absolute bottom-1 left-1 right-1 z-10 bg-[#e50914] text-white text-[9px] font-bold text-center py-1 tracking-wider uppercase rounded-t-md rounded-b-sm">
                      {cover.badge}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Thumbnail Sections - Swipeable Slider */}
      {displaySections.map((section, si) => {
        const scrollRef = React.createRef<HTMLDivElement>();
        const scrollBy = (dir: number) => {
          if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: dir * 300, behavior: "smooth" });
          }
        };
        return (
          <section key={si} className="py-4 relative group/slider">
            <h2 className="text-base md:text-lg font-semibold mb-3 text-white/90 px-4">{section.title}</h2>
            {/* Left Arrow */}
            <button
              onClick={() => scrollBy(-1)}
              className="absolute left-0 top-1/2 translate-y-1 z-20 bg-black/70 hover:bg-black/90 rounded-r-md p-1.5 opacity-0 group-hover/slider:opacity-100 transition-opacity"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            {/* Right Arrow */}
            <button
              onClick={() => scrollBy(1)}
              className="absolute right-0 top-1/2 translate-y-1 z-20 bg-black/70 hover:bg-black/90 rounded-l-md p-1.5 opacity-0 group-hover/slider:opacity-100 transition-opacity"
              aria-label="Próximo"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
            <div
              ref={scrollRef}
              className="flex gap-2 overflow-x-auto px-4 slider-hide-scrollbar"
              style={{
                scrollSnapType: "x mandatory",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {section.itemIndexes.map((idx) => {
                const thumb = thumbnails[idx];
                if (!thumb) return null;
                return (
                  <div
                    key={idx}
                    className="flex-none w-[31%] md:w-[180px] rounded-lg overflow-hidden cursor-pointer relative netflix-card"
                    style={{ backgroundColor: thumb.bgColor || "#1a1a2e", scrollSnapAlign: "start" }}
                    onClick={() => openMedia(thumb)}
                  >
                    {/* N badge */}
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <span
                        className="text-[#e50914] font-black text-lg"
                        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                      >
                        N
                      </span>
                    </div>

                    {thumb.type === "instagram" && extractReelId(thumb.url) ? (
                      <div className="w-full aspect-[2/3] overflow-hidden relative">
                        <iframe
                          src={`https://www.instagram.com/reel/${extractReelId(thumb.url)}/embed/?autoplay=1&mute=1`}
                          className="absolute border-0"
                          style={{
                            width: "300%",
                            height: "300%",
                            top: "-100%",
                            left: "-100%",
                            transform: "scale(0.5)",
                            transformOrigin: "center center",
                            pointerEvents: "none",
                          }}
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          scrolling="no"
                        />
                      </div>
                    ) : thumb.type === "video" ? (
                      <video
                        src={thumb.url}
                        className="w-full aspect-[2/3] object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        onLoadedData={(e) => { e.currentTarget.style.opacity = "1"; }}
                        style={{ opacity: 0, transition: "opacity 0.3s" }}
                      />
                    ) : (
                      <img
                        src={thumb.url}
                        alt={thumb.title || ""}
                        className="w-full aspect-[2/3] object-cover"
                        loading="lazy"
                      />
                    )}

                    {/* Static gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    {/* Title on hover */}
                    {thumb.title && (
                      <div className="netflix-card-title absolute bottom-8 left-0 right-0 px-2 z-10">
                        <span className="text-[10px] md:text-xs font-bold uppercase text-white drop-shadow-lg">{thumb.title}</span>
                      </div>
                    )}

                    {/* Badge — rounded top, taller, margins */}
                    {thumb.badge && (
                      <div className="absolute bottom-1 left-1 right-1 z-10 bg-[#e50914] text-white text-[8px] font-bold text-center py-1 tracking-wider uppercase rounded-t-md rounded-b-sm">
                        {thumb.badge}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Spacer if no content */}
      {covers.length === 0 && thumbnails.length === 0 && (
        <div className="px-6 py-20 text-center text-white/30 text-sm">
          Adicione capas e thumbnails no editor para preencher esta área
        </div>
      )}

      {/* Special Buttons */}
      {(config.specialButtons || []).filter(b => b.enabled).length > 0 && (
        <section className="px-4 py-6">
          <div className="flex flex-wrap gap-3 justify-center max-w-lg mx-auto">
            {(config.specialButtons || []).filter(b => b.enabled).map((btn) => (
              <button
                key={btn.id}
                onClick={() => onSpecialButtonClick?.(btn)}
                className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 hover:border-white/20 transition-all duration-200 group"
                style={{ minWidth: "140px" }}
              >
                <LucideIcon name={btn.icon} size={18} className="text-white/70 group-hover:text-[#e50914] transition-colors" />
                <span className="text-sm font-medium text-white/90">{btn.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="px-4 py-6 text-center">
        <p className="text-[10px] text-gray-600">Powered by TagNaMão</p>
      </footer>

      {/* Fixed Bottom Nav */}
      {hasBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10">
          <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
            {bottomNav.slice(0, 5).map((item, i) => (
              <a
                key={i}
                href={item.url || "#"}
                target={item.url?.startsWith("http") ? "_blank" : undefined}
                rel={item.url?.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors relative min-w-[48px]"
              >
                <LucideIcon name={item.icon || "Home"} size={22} className="text-white/80" />
                {item.badgeCount && item.badgeCount > 0 && (
                  <span className="absolute -top-0.5 right-0.5 bg-[#e50914] text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {item.badgeCount}
                  </span>
                )}
                <span className="text-[9px] text-white/50 leading-tight">{item.label}</span>
              </a>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
