import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LocationShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petTagId: string;
  petName: string;
  ownerWhatsapp: string | null;
}

export const LocationShareDialog = ({
  open,
  onOpenChange,
  petTagId,
  petName,
  ownerWhatsapp,
}: LocationShareDialogProps) => {
  const [finderPhone, setFinderPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPhoneInput = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, "").slice(0, 11);
    
    // Format as (XX) XXXXX-XXXX
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFinderPhone(formatPhoneInput(e.target.value));
    setError(null);
  };

  const handleSend = () => {
    // Validate phone BEFORE triggering location (sync validation)
    const digits = finderPhone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Digite um número de WhatsApp válido com DDD");
      return;
    }

    if (!ownerWhatsapp) {
      setError("O dono não cadastrou WhatsApp");
      return;
    }

    setSending(true);
    setError(null);

    // CRITICAL: Call geolocation IMMEDIATELY in the click handler
    // This preserves the user gesture context required by browsers
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Send notification via Evolution API
          const { data, error: fnError } = await supabase.functions.invoke("send-pet-location-whatsapp", {
            body: {
              petTagId,
              petName,
              ownerWhatsapp,
              finderPhone: digits,
              latitude,
              longitude,
            },
          });

          if (fnError || data?.error) {
            throw new Error(fnError?.message || data?.error || "Erro ao enviar");
          }

          setSent(true);
          
          // Close after 3 seconds
          setTimeout(() => {
            onOpenChange(false);
          }, 3000);
        } catch (err) {
          console.error("Send error:", err);
          setError(err instanceof Error ? err.message : "Erro ao enviar mensagem");
        } finally {
          setSending(false);
        }
      },
      (geoError) => {
        console.error("Geolocation error:", geoError);
        setSending(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError("Você precisa permitir o acesso à localização");
        } else if (geoError.code === geoError.TIMEOUT) {
          setError("Tempo esgotado ao obter localização. Tente novamente.");
        } else {
          setError("Não foi possível obter sua localização");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  if (sent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-[hsl(220,20%,7%)] border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-green-400 flex items-center gap-2">
              <Send className="h-5 w-5" />
              Mensagem Enviada!
            </DialogTitle>
            <DialogDescription className="text-white/70">
              O tutor de <strong>{petName}</strong> foi notificado com sua localização e número de contato. 
              Obrigado por ajudar! 💚
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[hsl(220,20%,7%)] border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Ajudar a encontrar {petName}
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Ao confirmar, sua <strong>localização atual</strong> e <strong>número de WhatsApp</strong> serão 
            enviados automaticamente para o tutor do pet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="finder-phone" className="text-white/80">
              Seu número de WhatsApp
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                id="finder-phone"
                placeholder="(11) 99999-9999"
                value={finderPhone}
                onChange={handlePhoneChange}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40"
                disabled={sending}
              />
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>

          <div className="rounded-lg bg-white/5 p-3 text-sm text-white/60">
            <p className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>
                Mensagem que será enviada:<br />
                <em className="text-white/80">
                  "Olá, encontrei o seu pet nessa localização. Esse é o meu número para contato."
                </em>
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/20 text-white hover:bg-white/10"
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !finderPhone}
            className="bg-primary hover:bg-primary/90"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Localização
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
