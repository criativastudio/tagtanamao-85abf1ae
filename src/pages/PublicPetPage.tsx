import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Phone, MessageCircle, MapPin, Gift, AlertTriangle, ShieldCheck,
  ChevronLeft, ChevronRight, Instagram, Music2, Youtube, Facebook, 
  Twitter, Linkedin, Mail, Globe, Link, LucideIcon
} from "lucide-react";

interface PetButton {
  id: string;
  label: string;
  url: string;
  icon: string;
  color: string;
  enabled: boolean;
  order: number;
}

interface PetTag {
  id: string;
  pet_name: string | null;
  pet_photo_url: string | null;
  owner_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  reward_enabled: boolean | null;
  reward_text: string | null;
  is_activated: boolean | null;
  lost_mode: boolean | null;
  gallery_photos: string[];
  buttons: PetButton[];
  theme_color: string;
}

const iconMap: Record<string, LucideIcon> = {
  Instagram,
  Music2,
  Youtube,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Globe,
  Link,
};

const getIcon = (iconName: string): LucideIcon => {
  return iconMap[iconName] || Link;
};

const PublicPetPage = () => {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [pet, setPet] = useState<PetTag | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchPetAndLogScan = async () => {
      if (!qrCode) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Fetch pet tag via secure edge function that respects privacy settings
        const { data, error } = await supabase.functions.invoke("get-pet-tag", {
          body: { qrCode },
        });

        if (error || data?.notFound || data?.error) {
          console.error("Pet tag fetch error:", error || data?.error);
          setNotFound(true);
          setLoading(false);
          return;
        }

        // Parse JSON fields
        const galleryPhotos = Array.isArray(data.gallery_photos) 
          ? data.gallery_photos 
          : JSON.parse(data.gallery_photos || '[]');
        const buttons = Array.isArray(data.buttons) 
          ? data.buttons 
          : JSON.parse(data.buttons || '[]');

        setPet({
          ...data,
          gallery_photos: galleryPhotos,
          buttons: buttons,
          theme_color: data.theme_color || '#10b981'
        });

        // Log the scan and send notification (fire and forget)
        const logScanAndNotify = async (latitude?: number, longitude?: number) => {
          // Log the scan
          await supabase.from("qr_scans").insert({
            pet_tag_id: data.id,
            latitude: latitude,
            longitude: longitude,
            user_agent: navigator.userAgent,
          });

          // Send WhatsApp notification with location (fire and forget)
          supabase.functions.invoke("notify-scan-location", {
            body: {
              petTagId: data.id,
              latitude,
              longitude,
            },
          }).catch(err => {
            console.log("Notification skipped:", err?.message);
          });
        };

        navigator.geolocation?.getCurrentPosition(
          async (position) => {
            await logScanAndNotify(position.coords.latitude, position.coords.longitude);
          },
          async () => {
            await logScanAndNotify();
          }
        );
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPetAndLogScan();
  }, [qrCode]);

  // Auto-slide gallery
  useEffect(() => {
    if (!pet?.gallery_photos || pet.gallery_photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % pet.gallery_photos.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [pet?.gallery_photos]);

  const handleWhatsApp = () => {
    if (!pet?.whatsapp) return;
    const phone = pet.whatsapp.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá! Encontrei seu pet ${pet.pet_name || ""} e gostaria de ajudar a devolvê-lo.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const handleCall = () => {
    if (!pet?.phone) return;
    window.open(`tel:${pet.phone}`, "_self");
  };

  const handleMaps = () => {
    if (!pet?.address) return;
    const encodedAddress = encodeURIComponent(pet.address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
  };

  const handleButtonClick = (button: PetButton) => {
    let url = button.url;
    if (!url) return;
    
    // Handle special URLs based on icon type
    if (button.icon === 'MessageCircle') {
      // WhatsApp - clean the number and create wa.me link
      // Remove all non-digit characters
      let phone = url.replace(/\D/g, '');
      
      // Remove leading zeros
      phone = phone.replace(/^0+/, '');
      
      // Add country code if not present (assume Brazil +55)
      // Brazilian numbers: 2 digit area code + 8-9 digit number = 10-11 digits
      if (phone.length <= 11) {
        phone = `55${phone}`;
      }
      
      // Validate minimum length (country code + area code + number)
      if (phone.length >= 12) {
        url = `https://wa.me/${phone}`;
      } else {
        console.error('Invalid WhatsApp number:', url);
        return;
      }
    } else if (button.icon === 'Phone') {
      // Phone call - ensure tel: prefix
      const phone = url.replace(/\D/g, '');
      url = `tel:+55${phone.startsWith('55') ? phone.slice(2) : phone}`;
    } else if (button.icon === 'Mail') {
      // Email - ensure mailto: prefix
      if (!url.startsWith('mailto:')) {
        url = `mailto:${url}`;
      }
    } else if (button.icon === 'Instagram') {
      // Instagram - handle username or full URL
      if (!url.startsWith('http')) {
        url = `https://instagram.com/${url.replace('@', '')}`;
      }
    } else if (button.icon === 'MapPin') {
      // Maps - open Google Maps with the address
      const encodedAddress = encodeURIComponent(url);
      url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    } else if (button.icon === 'Youtube') {
      // YouTube - handle channel/video URL
      if (!url.startsWith('http')) {
        url = `https://youtube.com/${url.replace('@', '')}`;
      }
    } else if (button.icon === 'Facebook') {
      // Facebook - handle profile URL
      if (!url.startsWith('http')) {
        url = `https://facebook.com/${url}`;
      }
    } else if (button.icon === 'Twitter') {
      // Twitter/X - handle profile URL
      if (!url.startsWith('http')) {
        url = `https://twitter.com/${url.replace('@', '')}`;
      }
    } else if (button.icon === 'Linkedin') {
      // LinkedIn - handle profile URL
      if (!url.startsWith('http')) {
        url = `https://linkedin.com/in/${url}`;
      }
    } else if (button.icon === 'Music2') {
      // TikTok - handle profile URL
      if (!url.startsWith('http')) {
        url = `https://tiktok.com/@${url.replace('@', '')}`;
      }
    } else if (!url.startsWith('http') && !url.startsWith('tel:') && !url.startsWith('mailto:')) {
      // Default - add https if no protocol
      url = `https://${url}`;
    }
    
    window.open(url, '_blank');
  };

  const handlePrevSlide = () => {
    if (!pet?.gallery_photos) return;
    setCurrentSlide(prev => prev === 0 ? pet.gallery_photos.length - 1 : prev - 1);
  };

  const handleNextSlide = () => {
    if (!pet?.gallery_photos) return;
    setCurrentSlide(prev => (prev + 1) % pet.gallery_photos.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,4%)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[hsl(220,20%,7%)] border-0">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-32 w-32 rounded-full mx-auto bg-[hsl(220,20%,12%)]" />
            <Skeleton className="h-8 w-3/4 mx-auto bg-[hsl(220,20%,12%)]" />
            <Skeleton className="h-6 w-1/2 mx-auto bg-[hsl(220,20%,12%)]" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-12 w-full bg-[hsl(220,20%,12%)]" />
              <Skeleton className="h-12 w-full bg-[hsl(220,20%,12%)]" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notFound || !pet) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,4%)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center bg-[hsl(220,20%,7%)] border-0">
          <CardContent className="p-8 space-y-4">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
            <h1 className="text-2xl font-bold text-white">Pet não encontrado</h1>
            <p className="text-white/60">
              Este QR Code não está associado a nenhum pet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!pet.is_activated) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,4%)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center bg-[hsl(220,20%,7%)] border-0">
          <CardContent className="p-8 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-4xl">🐾</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Aguardando Ativação</h1>
            <p className="text-white/60">
              Este QR Code ainda não foi ativado pelo proprietário.
            </p>
            <p className="text-sm text-white/40">
              Se você é o dono deste produto, acesse seu dashboard para ativar usando o código que veio no manual.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasContactInfo = pet.whatsapp || pet.phone || pet.address;
  const activeButtons = pet.buttons.filter(b => b.enabled).sort((a, b) => a.order - b.order);
  const themeColor = pet.theme_color || '#10b981';

  return (
    <div 
      className="min-h-screen py-8 px-4 relative overflow-hidden"
      style={{ 
        background: `linear-gradient(180deg, ${themeColor}15 0%, hsl(220 20% 4%) 40%)`,
      }}
    >
      {/* LED Background Glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: themeColor, opacity: 0.15 }}
      />
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="relative z-10 max-w-md mx-auto space-y-6">
        {/* Profile Photo with LED Ring */}
        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative">
            {/* LED Ring Animation */}
            <motion.div 
              className="absolute inset-0 rounded-full"
              style={{ 
                boxShadow: `0 0 30px 8px ${themeColor}80, 0 0 60px 15px ${themeColor}40`,
              }}
              animate={{
                boxShadow: [
                  `0 0 30px 8px ${themeColor}80, 0 0 60px 15px ${themeColor}40`,
                  `0 0 40px 12px ${themeColor}90, 0 0 80px 20px ${themeColor}50`,
                  `0 0 30px 8px ${themeColor}80, 0 0 60px 15px ${themeColor}40`,
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            
            <div 
              className="w-28 h-28 rounded-full overflow-hidden border-2 relative z-10"
              style={{ borderColor: themeColor, backgroundColor: 'hsl(220 20% 7%)' }}
            >
              {pet.pet_photo_url ? (
                <img
                  src={pet.pet_photo_url}
                  alt={pet.pet_name || "Pet"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  🐾
                </div>
              )}
            </div>
          </div>

          {/* Name & Owner */}
          <div className="text-center mt-4 space-y-1">
            <h1 
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {pet.pet_name || "Pet sem nome"}
            </h1>
            {pet.owner_name && (
              <p className="text-sm text-white/60">Tutor: {pet.owner_name}</p>
            )}
          </div>
        </motion.div>

        {/* Reward Banner */}
        {pet.reward_enabled && pet.reward_text && (
          <motion.div 
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ 
              backgroundColor: `${themeColor}20`,
              border: `1px solid ${themeColor}40`
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Gift className="h-5 w-5 shrink-0 mt-0.5" style={{ color: themeColor }} />
            <div>
              <p className="font-semibold" style={{ color: themeColor }}>Recompensa!</p>
              <p className="text-sm text-white/70">{pet.reward_text}</p>
            </div>
          </motion.div>
        )}

        {/* Gallery Carousel */}
        {pet.gallery_photos.length > 0 && (
          <motion.div 
            className="relative rounded-2xl overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="aspect-[4/3] relative">
              {pet.gallery_photos.map((photo, index) => (
                <motion.img
                  key={photo}
                  src={photo}
                  alt={`Foto ${index + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: index === currentSlide ? 1 : 0 }}
                  transition={{ duration: 0.5 }}
                />
              ))}
              
              {/* LED Border */}
              <div 
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ 
                  boxShadow: `inset 0 0 25px ${themeColor}30, 0 0 20px ${themeColor}20`,
                  border: `1px solid ${themeColor}30`
                }}
              />

              {/* Navigation Arrows */}
              {pet.gallery_photos.length > 1 && (
                <>
                  <button 
                    onClick={handlePrevSlide}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button 
                    onClick={handleNextSlide}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Dots Indicator */}
              {pet.gallery_photos.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                  {pet.gallery_photos.map((_, index) => (
                    <button
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentSlide ? 'w-6' : 'w-2 opacity-50'
                      }`}
                      style={{ backgroundColor: themeColor }}
                      onClick={() => setCurrentSlide(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Custom Buttons */}
        {activeButtons.length > 0 && (
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {activeButtons.map((button, index) => {
              const Icon = getIcon(button.icon);
              return (
                <motion.button
                  key={button.id}
                  onClick={() => handleButtonClick(button)}
                  className="w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-medium relative overflow-hidden group transition-all"
                  style={{ 
                    backgroundColor: `${button.color}20`,
                    border: `1px solid ${button.color}40`,
                    color: 'white'
                  }}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* LED Glow on Hover */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                    style={{ 
                      boxShadow: `0 0 25px ${button.color}50, inset 0 0 15px ${button.color}20`,
                    }}
                  />
                  <Icon className="w-5 h-5 relative z-10" style={{ color: button.color }} />
                  <span className="relative z-10">{button.label}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Privacy Notice - when contact info is hidden */}
        {!hasContactInfo && !activeButtons.length && (
          <motion.div 
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ 
              backgroundColor: `${themeColor}10`,
              border: `1px solid ${themeColor}30`
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" style={{ color: themeColor }} />
            <div>
              <p className="font-semibold text-white">Pet Seguro em Casa</p>
              <p className="text-sm text-white/60">
                O tutor não marcou este pet como perdido. Se você encontrou este pet sozinho, 
                peça ao tutor para ativar o modo "Pet Perdido" no dashboard.
              </p>
            </div>
          </motion.div>
        )}

        {/* Contact Buttons (Lost Mode) */}
        {hasContactInfo && (
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {pet.whatsapp && (
              <Button
                onClick={handleWhatsApp}
                className="w-full h-14 text-base font-medium"
                style={{ backgroundColor: '#25D366' }}
              >
                <MessageCircle className="mr-3 h-5 w-5" />
                Enviar WhatsApp
              </Button>
            )}

            {pet.phone && (
              <Button
                onClick={handleCall}
                variant="outline"
                className="w-full h-14 text-base font-medium border-white/20 text-white hover:bg-white/10"
              >
                <Phone className="mr-3 h-5 w-5" />
                Ligar para o Tutor
              </Button>
            )}

            {pet.address && (
              <Button
                onClick={handleMaps}
                variant="outline"
                className="w-full h-14 text-base font-medium border-white/20 text-white hover:bg-white/10"
              >
                <MapPin className="mr-3 h-5 w-5" />
                Ver Endereço no Mapa
              </Button>
            )}
          </motion.div>
        )}

        {/* Footer Message */}
        <p className="text-center text-sm text-white/40 pt-4">
          {hasContactInfo 
            ? "Obrigado por ajudar a encontrar este pet! 💚"
            : "Identificado com TagNaMão 🏷️"
          }
        </p>
      </div>
    </div>
  );
};

export default PublicPetPage;
