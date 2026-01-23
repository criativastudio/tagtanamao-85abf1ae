import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BioButton } from "@/types/bioPage";

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
    const vcard = parseVCardUrl(button.url);
    
    const updateVCard = (field: string, value: string) => {
      const updated = { ...vcard, [field]: value };
      onUpdate({ 
        url: `${updated.name}|${updated.phone}|${updated.email}|${updated.website}|${updated.address}|${updated.instagram}|${updated.facebook}|${updated.company}` 
      });
    };

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={vcard.name}
              onChange={(e) => updateVCard('name', e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Input
              value={vcard.company}
              onChange={(e) => updateVCard('company', e.target.value)}
              placeholder="Nome da empresa"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={vcard.phone}
              onChange={(e) => updateVCard('phone', e.target.value)}
              placeholder="+55 11 99999-9999"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={vcard.email}
              onChange={(e) => updateVCard('email', e.target.value)}
              placeholder="email@empresa.com"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Website</Label>
          <Input
            value={vcard.website}
            onChange={(e) => updateVCard('website', e.target.value)}
            placeholder="https://www.empresa.com"
          />
        </div>
        <div className="space-y-2">
          <Label>Endereço</Label>
          <Textarea
            value={vcard.address}
            onChange={(e) => updateVCard('address', e.target.value)}
            placeholder="Rua, número, bairro, cidade - Estado"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Instagram</Label>
            <Input
              value={vcard.instagram}
              onChange={(e) => updateVCard('instagram', e.target.value)}
              placeholder="@usuario"
            />
          </div>
          <div className="space-y-2">
            <Label>Facebook</Label>
            <Input
              value={vcard.facebook}
              onChange={(e) => updateVCard('facebook', e.target.value)}
              placeholder="facebook.com/pagina"
            />
          </div>
        </div>
      </div>
    );
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
