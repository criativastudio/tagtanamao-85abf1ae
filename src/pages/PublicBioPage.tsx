import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { BioPage, BioTheme, BioButton, DEFAULT_THEME } from "@/types/bioPage";
import { BioPageHeader } from "@/components/bio/BioPageHeader";
import { BioPageGallery } from "@/components/bio/BioPageGallery";
import { BioPageButtons } from "@/components/bio/BioPageButtons";

const PublicBioPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [bioPage, setBioPage] = useState<BioPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchBioPage = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("bio_pages")
          .select("*")
          .eq("slug", slug)
          .eq("is_active", true)
          .single();

        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        // Parse JSONB fields with proper type casting
        const galleryPhotos = Array.isArray(data.gallery_photos) 
          ? (data.gallery_photos as unknown as string[]) 
          : [];
        const buttons = Array.isArray(data.buttons) 
          ? (data.buttons as unknown as BioButton[]) 
          : [];
        
        const parsedData: BioPage = {
          ...data,
          gallery_photos: galleryPhotos,
          buttons: buttons,
          theme: typeof data.theme === 'object' ? { ...DEFAULT_THEME, ...data.theme } : DEFAULT_THEME,
        };

        setBioPage(parsedData);

        // Log page view (fire and forget)
        supabase.from("bio_page_analytics").insert({
          bio_page_id: data.id,
          event_type: 'view',
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
        });
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchBioPage();
  }, [slug]);

  const handleButtonClick = async (button: BioButton) => {
    if (!bioPage) return;

    // Log click event
    supabase.from("bio_page_analytics").insert({
      bio_page_id: bioPage.id,
      event_type: 'click',
      button_id: button.id,
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
    });

    // Handle different button types
    if (button.type === 'contact') {
      if (button.icon === 'MessageCircle') {
        const phone = button.url.replace(/\D/g, "");
        window.open(`https://wa.me/${phone}`, "_blank");
      } else if (button.icon === 'Phone') {
        window.open(`tel:${button.url}`, "_self");
      } else if (button.icon === 'Mail') {
        window.open(`mailto:${button.url}`, "_blank");
      } else if (button.icon === 'MapPin') {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(button.url)}`, "_blank");
      }
    } else {
      window.open(button.url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: `hsl(${DEFAULT_THEME.backgroundColor})` }}>
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-28 w-28 rounded-full" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !bioPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Página não encontrada</h1>
          <p className="text-muted-foreground">
            Esta página não existe ou foi desativada.
          </p>
        </div>
      </div>
    );
  }

  const theme = bioPage.theme;
  const activeButtons = bioPage.buttons
    .filter((b) => b.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div 
      className="min-h-screen py-8 px-4 relative overflow-hidden"
      style={{ 
        backgroundColor: `hsl(${theme.backgroundColor})`,
        color: `hsl(${theme.textColor})`,
      }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ backgroundColor: `hsl(${theme.primaryColor})` }}
      />

      <div className="relative z-10 max-w-md mx-auto space-y-8">
        {/* Header */}
        <BioPageHeader 
          title={bioPage.title}
          subtitle={bioPage.subtitle}
          photoUrl={bioPage.profile_photo_url}
          theme={theme}
        />

        {/* Gallery */}
        {theme.showGallery && bioPage.gallery_photos.length > 0 && (
          <BioPageGallery photos={bioPage.gallery_photos} theme={theme} />
        )}

        {/* Buttons */}
        <BioPageButtons 
          buttons={activeButtons}
          theme={theme}
          onButtonClick={handleButtonClick}
        />

        {/* Footer */}
        <p className="text-center text-xs opacity-50 pt-4">
          Powered by TagNaMão
        </p>
      </div>
    </div>
  );
};

export default PublicBioPage;
