import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BioButton } from "@/types/bioPage";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, getOutputExtension } from "@/lib/imageCompression";
import { Camera, X, Loader2, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SpecialButtonFieldsProps {
  button: BioButton;
  onUpdate: (updates: Partial<BioButton>) => void;
}

// Parse helpers
const parseWifiUrl = (url: string) => {
  const parts = url.split('|');
  return { ssid: parts[0] || '', password: parts[1] || '', encryption: parts[2] || 'WPA' };
};

const parsePixUrl = (url: string) => {
  const parts = url.split('|');
  return { pixKey: parts[0] || '', amount: parts[1] || '', description: parts[2] || '' };
};

const parseVCardUrl = (url: string) => {
  const parts = url.split('|');
  return {
    name: parts[0] || '',
    phone: parts[1] || '',
    email: parts[2] || '',
    website: parts[3] || '',
    address: parts[4] || '',
    instagram: parts[5] || '',
    facebook: parts[6] || '',
    company: parts[7] || '',
    photoUrl: parts[8] || '',
  };
};

export const SpecialButtonFields = ({ button, onUpdate }: SpecialButtonFieldsProps) => {
  // Wi-Fi fields
  if (button.icon === 'Wifi') {
    const wifi = parseWifiUrl(button.url);
    
    const updateWifi = (field: string, value: string) => {
      const updated = { ...wifi, [field]: value };
      onUpdate({ url: `${updated.ssid}|${updated.password}|${updated.encryption}` });
    };

    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Nome da Rede (SSID)</Label>
          <Input
            value={wifi.ssid}
            onChange={(e) => updateWifi('ssid', e.target.value)}
            placeholder="Nome do Wi-Fi"
          />
        </div>
        <div className="space-y-2">
          <Label>Senha</Label>
          <Input
            type="password"
            value={wifi.password}
            onChange={(e) => updateWifi('password', e.target.value)}
            placeholder="Senha do Wi-Fi"
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo de Segurança</Label>
          <Select value={wifi.encryption} onValueChange={(v) => updateWifi('encryption', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WPA">WPA/WPA2</SelectItem>
              <SelectItem value="WEP">WEP</SelectItem>
              <SelectItem value="nopass">Sem senha</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // PIX fields
  if (button.icon === 'QrCode') {
    const pix = parsePixUrl(button.url);
    
    const updatePix = (field: string, value: string) => {
      const updated = { ...pix, [field]: value };
      onUpdate({ url: `${updated.pixKey}|${updated.amount}|${updated.description}` });
    };

    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Chave PIX</Label>
          <Input
            value={pix.pixKey}
            onChange={(e) => updatePix('pixKey', e.target.value)}
            placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
          />
        </div>
        <div className="space-y-2">
          <Label>Valor Sugerido (opcional)</Label>
          <Input
            type="number"
            step="0.01"
            value={pix.amount}
            onChange={(e) => updatePix('amount', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label>Descrição (opcional)</Label>
          <Input
            value={pix.description}
            onChange={(e) => updatePix('description', e.target.value)}
            placeholder="Ex: Pagamento de serviço"
          />
        </div>
      </div>
    );
  }

  // vCard / Save Contact fields
  if (button.icon === 'Contact') {
    return <VCardFields button={button} onUpdate={onUpdate} />;
  }

  // Default URL field for other button types
  return (
    <div className="space-y-2">
      <Label>URL / Contato</Label>
      <Input
        value={button.url}
        onChange={(e) => onUpdate({ url: e.target.value })}
        placeholder={getPlaceholder(button.icon)}
      />
    </div>
  );
};

// Extracted VCard fields component with photo upload
const VCardFields = ({ button, onUpdate }: SpecialButtonFieldsProps) => {
  const vcard = parseVCardUrl(button.url);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateVCard = (field: string, value: string) => {
    const updated = { ...vcard, [field]: value };
    onUpdate({
      url: `${updated.name}|${updated.phone}|${updated.email}|${updated.website}|${updated.address}|${updated.instagram}|${updated.facebook}|${updated.company}|${updated.photoUrl}`,
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file, 'profile');
      const ext = getOutputExtension('profile');
      const fileName = `vcard-photos/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('bio-images')
        .upload(fileName, compressed, { contentType: `image/${ext}`, upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('bio-images').getPublicUrl(fileName);
      updateVCard('photoUrl', urlData.publicUrl);
      toast({ title: 'Foto enviada com sucesso!' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao enviar foto', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = () => {
    updateVCard('photoUrl', '');
  };

  return (
    <div className="space-y-3">
      {/* Photo upload */}
      <div className="space-y-2">
        <Label>Foto do Contato</Label>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-16 w-16">
              {vcard.photoUrl ? (
                <AvatarImage src={vcard.photoUrl} alt="Foto do contato" />
              ) : null}
              <AvatarFallback><User className="h-6 w-6" /></AvatarFallback>
            </Avatar>
            {vcard.photoUrl && (
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enviando...</>
            ) : (
              <><Camera className="h-4 w-4 mr-1" /> Enviar foto</>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={vcard.name} onChange={(e) => updateVCard('name', e.target.value)} placeholder="Nome completo" />
        </div>
        <div className="space-y-2">
          <Label>Empresa</Label>
          <Input value={vcard.company} onChange={(e) => updateVCard('company', e.target.value)} placeholder="Nome da empresa" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input value={vcard.phone} onChange={(e) => updateVCard('phone', e.target.value)} placeholder="+55 11 99999-9999" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={vcard.email} onChange={(e) => updateVCard('email', e.target.value)} placeholder="email@empresa.com" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Website</Label>
        <Input value={vcard.website} onChange={(e) => updateVCard('website', e.target.value)} placeholder="https://www.empresa.com" />
      </div>
      <div className="space-y-2">
        <Label>Endereço</Label>
        <Textarea value={vcard.address} onChange={(e) => updateVCard('address', e.target.value)} placeholder="Rua, número, bairro, cidade - Estado" rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Instagram</Label>
          <Input value={vcard.instagram} onChange={(e) => updateVCard('instagram', e.target.value)} placeholder="@usuario" />
        </div>
        <div className="space-y-2">
          <Label>Facebook</Label>
          <Input value={vcard.facebook} onChange={(e) => updateVCard('facebook', e.target.value)} placeholder="facebook.com/pagina" />
        </div>
      </div>
    </div>
  );
};

const getPlaceholder = (icon: string) => {
  switch (icon) {
    case 'MessageCircle': return '+55 11 99999-9999';
    case 'Phone': return '+55 11 99999-9999';
    case 'Mail': return 'email@exemplo.com';
    case 'MapPin': return 'Rua Exemplo, 123 - Cidade';
    case 'Star': return 'https://g.page/r/sua-empresa/review';
    case 'Calendar': return 'https://calendly.com/sua-empresa ou link de agendamento';
    default: return 'https://exemplo.com';
  }
};
