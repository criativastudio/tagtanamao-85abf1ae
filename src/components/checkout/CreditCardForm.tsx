import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatCardNumber,
  formatExpiry,
  validateCardNumber,
  validateExpiry,
  detectCardBrand,
  getCVVLength,
} from "@/lib/validators";
import { CreditCard, Lock, Check, X, Truck } from "lucide-react";

interface CreditCardFormProps {
  onCardDataChange: (data: CardData) => void;
  onValidChange: (isValid: boolean) => void;
  disabled?: boolean;
}

export interface CardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  brand: string | null;
  cep?: string;
  freteSelecionado?: any;
}

export default function CreditCardForm({ onCardDataChange, onValidChange, disabled = false }: CreditCardFormProps) {
  // ===== CARTÃO =====
  const [holderName, setHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ===== CEP & FRETE =====
  const [cep, setCep] = useState("");
  const [fretes, setFretes] = useState<any[]>([]);
  const [freteSelecionado, setFreteSelecionado] = useState<any>(null);
  const [loadingFrete, setLoadingFrete] = useState(false);
  const [erroFrete, setErroFrete] = useState("");

  const brand = detectCardBrand(cardNumber);
  const cvvLength = getCVVLength(brand);

  const isCardNumberValid = validateCardNumber(cardNumber);
  const [expiryMonth, expiryYear] = expiry.split("/");
  const isExpiryValid = validateExpiry(expiryMonth, expiryYear);
  const isCvvValid = cvv.replace(/\D/g, "").length === cvvLength;
  const isHolderNameValid = holderName.trim().length >= 3;

  const isFormValid =
    isCardNumberValid && isExpiryValid && isCvvValid && isHolderNameValid && cep.length === 8 && !!freteSelecionado;

  // ===== EDGE FUNCTION (MELHOR ENVIO) =====
  async function calcularFrete(cepDestino: string) {
    try {
      setLoadingFrete(true);
      setErroFrete("");
      setFretes([]);
      setFreteSelecionado(null);

      const res = await fetch("https://xzrycwlskxigxgxcyzrj.supabase.co/functions/v1/bright-handler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep_destino: cepDestino }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao calcular frete");
      }

      setFretes(data.fretes || []);
    } catch (e) {
      console.error(e);
      setErroFrete("Erro ao calcular frete. Verifique o CEP.");
    } finally {
      setLoadingFrete(false);
    }
  }

  // ===== SYNC COM CHECKOUT =====
  useEffect(() => {
    onValidChange(isFormValid);

    onCardDataChange({
      holderName: holderName.trim(),
      number: cardNumber.replace(/\s/g, ""),
      expiryMonth: expiryMonth || "",
      expiryYear: expiryYear || "",
      cvv: cvv.replace(/\D/g, ""),
      brand,
      cep,
      freteSelecionado,
    });
  }, [holderName, cardNumber, expiry, cvv, brand, cep, freteSelecionado, isFormValid]);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const getBrandIcon = () => {
    if (!brand) return <CreditCard className="h-5 w-5 text-muted-foreground" />;
    return <span className="text-sm font-medium text-primary">{brand.toUpperCase()}</span>;
  };

  // ===== UI =====
  return (
    <div className="space-y-6 p-4 rounded-lg border border-border bg-card/50">
      {/* CEP */}
      <div className="space-y-2">
        <Label htmlFor="cep">CEP *</Label>
        <Input
          id="cep"
          inputMode="numeric"
          placeholder="00000-000"
          value={cep}
          disabled={disabled}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            setCep(value);
            if (value.length === 8) calcularFrete(value);
          }}
        />

        {loadingFrete && <p className="text-sm text-muted-foreground">Calculando frete...</p>}
        {erroFrete && <p className="text-sm text-destructive">{erroFrete}</p>}

        {fretes.length > 0 && (
          <div className="space-y-2 pt-2">
            {fretes.map((frete, i) => (
              <label
                key={i}
                className={`flex items-center justify-between border rounded px-3 py-2 cursor-pointer ${
                  freteSelecionado === frete ? "border-primary" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="frete"
                    checked={freteSelecionado === frete}
                    onChange={() => setFreteSelecionado(frete)}
                  />
                  <Truck className="h-4 w-4" />
                  <span>{frete.name}</span>
                </div>
                <strong>R$ {frete.price}</strong>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* CARTÃO */}
      <div className="space-y-4">
        <Label>Pagamento com cartão</Label>

        <Input
          placeholder="Nome no cartão"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value.toUpperCase())}
          onBlur={() => handleBlur("holderName")}
          disabled={disabled}
        />

        <div className="relative">
          <Input
            placeholder="0000 0000 0000 0000"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            onBlur={() => handleBlur("cardNumber")}
            disabled={disabled}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{getBrandIcon()}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="MM/AA"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            disabled={disabled}
          />
          <Input
            placeholder={cvvLength === 4 ? "0000" : "000"}
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, cvvLength))}
            disabled={disabled}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-4 w-4" />
          Pagamento processado com segurança pelo Asaas
        </div>
      </div>
    </div>
  );
}
