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
import { MapPin, Phone, Send, Loader2, AlertCircle } from "lucide-react";
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
  const [locationDenied, setLocationDenied] = useState(false);

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFinderPhone(formatPhoneInput(e.target.value));
    setError(null);
  };

  const sendNotification = async (latitude?: number, longitude?: number) => {
    const digits = finderPhone.replace(/\D/g, "");
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("send-pet-location-whatsapp", {
        body: {
          petTagId,
          petName,
          ownerWhatsapp,
          finderPhone: digits,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
        },
      });

      if (fnError || data?.error) {
        throw new Error(fnError?.message || data?.error || "Erro ao enviar");
      }

      setSent(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 3000);
    } catch (err) {
      console.error("Send error:", err);
      setError(err instanceof Error ? err.message : "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
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

    // Try to get location - call immediately in click handler
    // If denied or fails, automatically send without location (no interruption)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // Location granted - send with coordinates
        await sendNotification(position.coords.latitude, position.coords.longitude);
      },
      async (geoError) => {
        console.error("Geolocation error:", geoError);
        // Location denied or failed - automatically continue sending without location
        setLocationDenied(true);
        await sendNotification(); // Send without location, don't interrupt flow
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000,
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
              O tutor de <strong>{petName}</strong> foi notificado com seu número de contato. 
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
            {locationDenied 
              ? "Envie seu número de contato para que o tutor possa falar com você."
              : <>Ao confirmar, sua <strong>localização atual</strong> e <strong>número de WhatsApp</strong> serão 
                enviados automaticamente para o tutor do pet.</>
            }
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
              <p className="text-sm text-yellow-400 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>

          {!locationDenied && (
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
          )}

          {locationDenied && (
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm text-yellow-200">
              <p className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Sem localização, o tutor receberá apenas seu número de contato para entrar em contato com você.
                </span>
              </p>
            </div>
          )}
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
                Enviar Contato
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
