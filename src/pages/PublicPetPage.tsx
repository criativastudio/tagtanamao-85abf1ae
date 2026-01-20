import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, MessageCircle, MapPin, Gift, AlertTriangle, ShieldCheck } from "lucide-react";

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
}

const PublicPetPage = () => {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [pet, setPet] = useState<PetTag | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

        setPet(data);

        // Log the scan (fire and forget)
        navigator.geolocation?.getCurrentPosition(
          async (position) => {
            await supabase.from("qr_scans").insert({
              pet_tag_id: data.id,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              user_agent: navigator.userAgent,
            });
          },
          async () => {
            // If geolocation denied, log without location
            await supabase.from("qr_scans").insert({
              pet_tag_id: data.id,
              user_agent: navigator.userAgent,
            });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-48 w-48 rounded-full mx-auto" />
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notFound || !pet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8 space-y-4">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Pet não encontrado</h1>
            <p className="text-muted-foreground">
              Este QR Code não está associado a nenhum pet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if product is not yet activated
  if (!pet.is_activated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-4xl">🐾</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Aguardando Ativação</h1>
            <p className="text-muted-foreground">
              Este QR Code ainda não foi ativado pelo proprietário.
            </p>
            <p className="text-sm text-muted-foreground">
              Se você é o dono deste produto, acesse seu dashboard para ativar usando o código que veio no manual.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if contact details are hidden (not in lost mode)
  const hasContactInfo = pet.whatsapp || pet.phone || pet.address;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md overflow-hidden">
        {/* Pet Photo Header */}
        <div className="relative bg-gradient-to-br from-primary to-primary/80 p-6 pb-24">
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
            {pet.pet_photo_url ? (
              <img
                src={pet.pet_photo_url}
                alt={pet.pet_name || "Pet"}
                className="w-32 h-32 rounded-full border-4 border-background object-cover shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-background bg-muted flex items-center justify-center shadow-lg">
                <span className="text-4xl">🐾</span>
              </div>
            )}
          </div>
        </div>

        <CardContent className="pt-20 pb-6 px-6 space-y-6">
          {/* Pet & Owner Info */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{pet.pet_name || "Pet sem nome"}</h1>
            {pet.owner_name && (
              <p className="text-muted-foreground">Tutor: {pet.owner_name}</p>
            )}
          </div>

          {/* Reward Banner */}
          {pet.reward_enabled && pet.reward_text && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
              <Gift className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-600 dark:text-yellow-400">Recompensa!</p>
                <p className="text-sm text-muted-foreground">{pet.reward_text}</p>
              </div>
            </div>
          )}

          {/* Privacy Notice - when contact info is hidden */}
          {!hasContactInfo && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Pet Seguro em Casa</p>
                <p className="text-sm text-muted-foreground">
                  O tutor não marcou este pet como perdido. Se você encontrou este pet sozinho, 
                  peça ao tutor para ativar o modo "Pet Perdido" no dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons - only shown when contact info is available */}
          {hasContactInfo && (
            <div className="space-y-3">
              {pet.whatsapp && (
                <Button
                  onClick={handleWhatsApp}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Enviar WhatsApp
                </Button>
              )}

              {pet.phone && (
                <Button
                  onClick={handleCall}
                  variant="outline"
                  className="w-full h-12"
                  size="lg"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Ligar para o Tutor
                </Button>
              )}

              {pet.address && (
                <Button
                  onClick={handleMaps}
                  variant="outline"
                  className="w-full h-12"
                  size="lg"
                >
                  <MapPin className="mr-2 h-5 w-5" />
                  Ver Endereço no Mapa
                </Button>
              )}
            </div>
          )}

          {/* Footer Message */}
          <p className="text-center text-sm text-muted-foreground">
            {hasContactInfo 
              ? "Obrigado por ajudar a encontrar este pet! 💚"
              : "Este pet está identificado com TagNaMão 🏷️"
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicPetPage;