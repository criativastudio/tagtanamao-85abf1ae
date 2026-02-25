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
import { CreditCard, Lock } from "lucide-react";

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
}

export default function CreditCardForm({ onCardDataChange, onValidChange, disabled = false }: CreditCardFormProps) {
  const [holderName, setHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const brand = detectCardBrand(cardNumber);
  const cvvLength = getCVVLength(brand);

  const isCardNumberValid = validateCardNumber(cardNumber);
  const [expiryMonth, expiryYear] = expiry.split("/");
  const isExpiryValid = validateExpiry(expiryMonth, expiryYear);
  const isCvvValid = cvv.replace(/\D/g, "").length === cvvLength;
  const isHolderNameValid = holderName.trim().length >= 3;

  const isFormValid = isCardNumberValid && isExpiryValid && isCvvValid && isHolderNameValid;

  useEffect(() => {
    onValidChange(isFormValid);

    onCardDataChange({
      holderName: holderName.trim(),
      number: cardNumber.replace(/\s/g, ""),
      expiryMonth: expiryMonth || "",
      expiryYear: expiryYear || "",
      cvv: cvv.replace(/\D/g, ""),
      brand,
    });
  }, [holderName, cardNumber, expiry, cvv, brand, isFormValid]);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const getBrandIcon = () => {
    if (!brand) return <CreditCard className="h-5 w-5 text-muted-foreground" />;
    return <span className="text-sm font-medium text-primary">{brand.toUpperCase()}</span>;
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-card/50">
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
  );
}
