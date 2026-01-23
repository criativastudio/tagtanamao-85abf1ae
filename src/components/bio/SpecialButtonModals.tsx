import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Wifi, QrCode, Smartphone } from "lucide-react";
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

  useEffect(() => {
    if (open && ssid) {
      const generateQR = async () => {
        try {
          const url = await QRCode.toDataURL(wifiString, { width: 256 });
          setQrUrl(url);
        } catch {
          toast.error("Erro ao gerar QR Code");
        }
      };
      generateQR();
    } else {
      setQrUrl(null);
    }
  }, [open, ssid, wifiString]);

  const copyPassword = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success("Senha copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setCopied(false);
    setQrUrl(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-primary" />
            Conectar ao Wi-Fi
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Network Name */}
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Rede</p>
            <p className="text-xl font-bold text-primary">{ssid}</p>
          </div>
          
          {/* QR Code */}
          {qrUrl && (
            <div className="flex flex-col items-center gap-3">
              <img src={qrUrl} alt="Wi-Fi QR Code" className="rounded-lg border" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Smartphone className="h-4 w-4" />
                <span>Escaneie com a câmera do celular para conectar</span>
              </div>
            </div>
          )}

          {/* Password Section */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Senha do Wi-Fi</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg">
                <p className="font-mono font-medium text-center tracking-wider">{password}</p>
              </div>
              <Button variant="outline" size="icon" onClick={copyPassword}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Success Message */}
          <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg">
            <p className="text-sm text-center text-green-700 dark:text-green-400">
              ✓ Dados da rede Wi-Fi disponíveis! Escaneie o QR ou copie a senha.
            </p>
          </div>
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

export const PixModal = ({ open, onClose, pixKey, amount: initialAmount, description }: PixModalProps) => {
  const [copied, setCopied] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCopied(false);
      setCustomAmount(initialAmount || "");
      setShowPaymentInfo(false);
    }
  }, [open, initialAmount]);

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/\D/g, "");
    // Convert to number and format as currency
    const number = parseInt(numericValue || "0", 10) / 100;
    return number.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    setCustomAmount(rawValue);
  };

  const getDisplayAmount = () => {
    if (!customAmount) return "0,00";
    return formatCurrency(customAmount);
  };

  const getNumericAmount = () => {
    if (!customAmount) return 0;
    return parseInt(customAmount, 10) / 100;
  };

  const generatePayment = () => {
    if (getNumericAmount() <= 0) {
      toast.error("Digite um valor válido para gerar o pagamento");
      return;
    }
    setShowPaymentInfo(true);
    toast.success("Chave PIX gerada com sucesso!");
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    toast.success("Chave PIX copiada! Cole no app do seu banco.");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleClose = () => {
    setCopied(false);
    setCustomAmount("");
    setShowPaymentInfo(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Pagamento PIX
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!showPaymentInfo ? (
            <>
              {/* Amount Input */}
              <div className="space-y-3">
                <Label htmlFor="amount">Valor do serviço</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    R$
                  </span>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={getDisplayAmount()}
                    onChange={handleAmountChange}
                    className="pl-10 text-2xl font-bold h-14 text-center"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Digite o valor que deseja pagar
                </p>
              </div>

              {description && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-center text-muted-foreground">{description}</p>
                </div>
              )}

              {/* Generate Button */}
              <Button 
                onClick={generatePayment} 
                className="w-full h-12"
                disabled={getNumericAmount() <= 0}
              >
                <QrCode className="h-5 w-5 mr-2" />
                Gerar Chave de Pagamento
              </Button>
            </>
          ) : (
            <>
              {/* Payment Generated */}
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Valor a pagar</p>
                <p className="text-3xl font-bold text-primary">
                  R$ {getDisplayAmount()}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Chave PIX (copie e cole no seu banco)</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg break-all">
                    <p className="font-mono text-sm text-center">{pixKey}</p>
                  </div>
                </div>
                <Button onClick={copyPixKey} className="w-full h-12" variant={copied ? "secondary" : "default"}>
                  {copied ? (
                    <>
                      <Check className="h-5 w-5 mr-2 text-green-500" />
                      Copiado! Cole no app do banco
                    </>
                  ) : (
                    <>
                      <Copy className="h-5 w-5 mr-2" />
                      Copiar Chave PIX
                    </>
                  )}
                </Button>
              </div>

              {/* Instructions */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg space-y-2">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Como pagar:
                </p>
                <ol className="text-xs text-blue-600 dark:text-blue-300 space-y-1 list-decimal list-inside">
                  <li>Abra o app do seu banco</li>
                  <li>Vá em PIX → Pagar com Chave</li>
                  <li>Cole a chave copiada</li>
                  <li>Digite o valor: R$ {getDisplayAmount()}</li>
                  <li>Confirme o pagamento</li>
                </ol>
              </div>

              <Button 
                variant="outline" 
                onClick={() => setShowPaymentInfo(false)} 
                className="w-full"
              >
                Alterar Valor
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
