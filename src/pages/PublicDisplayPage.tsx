import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  Building2, 
  Globe, 
  Instagram, 
  MessageCircle, 
  Phone, 
  Mail, 
  Facebook, 
  Youtube,
  Link as LinkIcon
} from "lucide-react";

interface DisplayButton {
  id: string;
  label: string;
  url: string;
  icon: string;
}

interface BusinessDisplay {
  id: string;
  qr_code: string;
  business_name: string | null;
  logo_url: string | null;
  description: string | null;
  buttons: DisplayButton[];
  theme_color: string | null;
  is_activated: boolean | null;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  link: LinkIcon,
  instagram: Instagram,
  whatsapp: MessageCircle,
  phone: Phone,
  email: Mail,
  website: Globe,
  facebook: Facebook,
  youtube: Youtube,
};

const PublicDisplayPage = () => {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [display, setDisplay] = useState<BusinessDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchDisplayAndLogScan = async () => {
      if (!qrCode) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("business_displays")
          .select("*")
          .eq("qr_code", qrCode)
          .single();

        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        // Parse buttons JSONB field
        let parsedButtons: DisplayButton[] = [];
        if (Array.isArray(data.buttons)) {
          parsedButtons = (data.buttons as unknown[]).map((btn: unknown) => {
            const b = btn as Record<string, unknown>;
            return {
              id: String(b.id || crypto.randomUUID()),
              label: String(b.label || ''),
              url: String(b.url || ''),
              icon: String(b.icon || 'link')
            };
          });
        }

        setDisplay({
          ...data,
          buttons: parsedButtons
        });

        // Log the scan (no geolocation notification for business displays - they're just bio links)
        await supabase.from("qr_scans").insert({
          display_id: data.id,
          user_agent: navigator.userAgent,
        });
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDisplayAndLogScan();
  }, [qrCode]);

  const handleButtonClick = (button: DisplayButton) => {
    const url = button.url;
    
    if (button.icon === 'whatsapp') {
      const phone = url.replace(/\D/g, "");
      window.open(`https://wa.me/${phone}`, "_blank");
    } else if (button.icon === 'phone') {
      window.open(`tel:${url}`, "_self");
    } else if (button.icon === 'email') {
      window.open(`mailto:${url}`, "_blank");
    } else if (button.icon === 'instagram') {
      const username = url.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '');
      window.open(`https://instagram.com/${username}`, "_blank");
    } else {
      // Ensure URL has protocol
      const finalUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(finalUrl, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-24 w-24 rounded-xl mx-auto" />
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-full" />
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

  if (notFound || !display) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8 space-y-4">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Display não encontrado</h1>
            <p className="text-muted-foreground">
              Este QR Code não está associado a nenhum display.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if product is not yet activated
  if (!display.is_activated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8 space-y-4">
            <div 
              className="w-20 h-20 mx-auto rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${display.theme_color || '#3b82f6'}20` }}
            >
              <Building2 className="w-10 h-10" style={{ color: display.theme_color || '#3b82f6' }} />
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

  const themeColor = display.theme_color || '#3b82f6';

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ 
        background: `linear-gradient(135deg, ${themeColor}15, ${themeColor}05)` 
      }}
    >
      <Card className="w-full max-w-md overflow-hidden shadow-xl">
        {/* Header */}
        <div 
          className="relative p-6 pb-20"
          style={{ 
            background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)` 
          }}
        >
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            {display.logo_url ? (
              <img
                src={display.logo_url}
                alt={display.business_name || "Logo"}
                className="w-24 h-24 rounded-xl border-4 border-background object-cover shadow-lg bg-background"
              />
            ) : (
              <div 
                className="w-24 h-24 rounded-xl border-4 border-background flex items-center justify-center shadow-lg bg-background"
              >
                <Building2 className="w-12 h-12" style={{ color: themeColor }} />
              </div>
            )}
          </div>
        </div>

        <CardContent className="pt-16 pb-6 px-6 space-y-6">
          {/* Business Info */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {display.business_name || "Empresa"}
            </h1>
            {display.description && (
              <p className="text-muted-foreground text-sm">{display.description}</p>
            )}
          </div>

          {/* Action Buttons */}
          {display.buttons.length > 0 && (
            <div className="space-y-3">
              {display.buttons.map((button) => {
                const IconComponent = iconMap[button.icon] || LinkIcon;
                return (
                  <Button
                    key={button.id}
                    onClick={() => handleButtonClick(button)}
                    className="w-full h-12 justify-start gap-3"
                    variant="outline"
                    style={{ 
                      borderColor: `${themeColor}30`,
                      '--tw-ring-color': themeColor 
                    } as React.CSSProperties}
                  >
                    <IconComponent className="w-5 h-5" style={{ color: themeColor }} />
                    <span className="flex-1 text-left">{button.label}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {display.buttons.length === 0 && (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm">
                Nenhum link configurado ainda.
              </p>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground pt-4">
            Powered by TagNaMão
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicDisplayPage;
