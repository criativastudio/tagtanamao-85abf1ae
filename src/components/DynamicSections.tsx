import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface SectionConfig {
  youtubeUrl?: string;
  youtubeId?: string;
  videoUrl?: string;
  autoplay?: boolean;
}

interface SiteSection {
  id: string;
  title: string;
  description: string | null;
  section_type: string;
  media_url: string | null;
  config: SectionConfig;
  position: number;
  is_active: boolean;
}

const extractYoutubeId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const VideoSection = ({ section }: { section: SiteSection }) => {
  const config = section.config || {};
  const youtubeId = config.youtubeId || (config.youtubeUrl ? extractYoutubeId(config.youtubeUrl) : null);
  const videoUrl = section.media_url || config.videoUrl;
  const autoplay = config.autoplay ? 1 : 0;

  if (youtubeId) {
    return (
      <div className="w-full max-w-4xl mx-auto aspect-video rounded-xl overflow-hidden shadow-lg">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=${autoplay}&mute=${autoplay}&rel=0`}
          title={section.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  if (videoUrl) {
    return (
      <div className="w-full max-w-4xl mx-auto aspect-video rounded-xl overflow-hidden shadow-lg">
        <video
          src={videoUrl}
          controls
          autoPlay={config.autoplay}
          muted={config.autoplay}
          loop
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return null;
};

const PetSlidesSection = () => {
  const { data: pets } = useQuery({
    queryKey: ["pet-slides-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pet_tags_public")
        .select("id, pet_name, pet_photo_url")
        .not("pet_photo_url", "is", null);
      return data || [];
    },
  });

  if (!pets || pets.length === 0) return null;

  return (
    <div className="w-full max-w-5xl mx-auto px-8">
      <Carousel
        opts={{ align: "start", loop: true }}
        plugins={[Autoplay({ delay: 4000, stopOnInteraction: false })]}
      >
        <CarouselContent>
          {pets.map((pet) => (
            <CarouselItem key={pet.id} className="basis-full sm:basis-1/2 md:basis-1/3">
              <div className="p-2">
                <div className="rounded-xl overflow-hidden shadow-md bg-card border border-border">
                  <img
                    src={pet.pet_photo_url!}
                    alt={pet.pet_name || "Pet"}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                  <div className="p-3 flex items-center justify-between">
                    <span className="font-medium text-foreground text-sm">
                      {pet.pet_name || "Sem nome"}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Encontrado via Tag
                    </Badge>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
};

const DynamicSections = () => {
  const { data: sections } = useQuery({
    queryKey: ["site-sections-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_sections")
        .select("*")
        .eq("is_active", true)
        .order("position", { ascending: true });
      return (data as SiteSection[]) || [];
    },
  });

  if (!sections || sections.length === 0) return null;

  return (
    <>
      {sections.map((section) => (
        <section key={section.id} className="py-16 px-4">
          <div className="max-w-6xl mx-auto text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">{section.title}</h2>
            {section.description && (
              <p className="text-muted-foreground max-w-2xl mx-auto">{section.description}</p>
            )}
          </div>
          {section.section_type === "video" && <VideoSection section={section} />}
          {section.section_type === "pet_slides" && <PetSlidesSection />}
        </section>
      ))}
    </>
  );
};

export default DynamicSections;
