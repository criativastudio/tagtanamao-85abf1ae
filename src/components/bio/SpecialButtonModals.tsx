import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Wifi, QrCode } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

interface WifiModalProps {
  open: boolean;
  onClose: () => void;
  ssid: string;
  password: string;
  encryption: string;
}

export const WifiModal = ({ open, onClose, ssid, password, encryption }: WifiModalProps) => {
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const wifiString = `WIFI:T:${encryption};S:${ssid};P:${password};;`;

  const generateQR = async () => {
    try {
      const url = await QRCode.toDataURL(wifiString, { width: 256 });
      setQrUrl(url);
    } catch {
      toast.error("Erro ao gerar QR Code");
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success("Senha copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate QR on open
  if (open && !qrUrl) {
    generateQR();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Conectar ao Wi-Fi
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-medium">{ssid}</p>
            <p className="text-sm text-muted-foreground">Escaneie o QR Code para conectar</p>
          </div>
          
          {qrUrl && (
            <div className="flex justify-center">
              <img src={qrUrl} alt="Wi-Fi QR Code" className="rounded-lg" />
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Senha</p>
              <p className="font-mono font-medium">{'•'.repeat(password.length)}</p>
            </div>
            <Button variant="outline" size="icon" onClick={copyPassword}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Ou abra a câmera do seu celular e aponte para o QR Code
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface PixModalProps {
  open: boolean;
  onClose: () => void;
  pixKey: string;
  amount?: string;
  description?: string;
}

export const PixModal = ({ open, onClose, pixKey, amount, description }: PixModalProps) => {
  const [copied, setCopied] = useState(false);

  const copyPixKey = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Pagamento PIX
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {amount && parseFloat(amount) > 0 && (
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Valor sugerido</p>
              <p className="text-3xl font-bold text-primary">
                R$ {parseFloat(amount).toFixed(2).replace('.', ',')}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Chave PIX</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg break-all">
                <p className="font-mono text-sm">{pixKey}</p>
              </div>
              <Button onClick={copyPixKey} className="shrink-0">
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
          </div>

          {description && (
            <div className="text-center text-sm text-muted-foreground">
              {description}
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Abra o app do seu banco e cole a chave PIX para realizar o pagamento
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
