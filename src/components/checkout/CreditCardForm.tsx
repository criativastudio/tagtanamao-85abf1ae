import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  formatCardNumber, 
  formatExpiry, 
  validateCardNumber, 
  validateExpiry,
  detectCardBrand,
  getCVVLength
} from '@/lib/validators';
import { CreditCard, Lock, Check, X } from 'lucide-react';

interface CreditCardFormProps {
  onCardDataChange: (data: CardData) => void;
  onValidChange: (isValid: boolean) => void;
  disabled?: boolean;
}

export interface FreteOption {
  transportadora: string;
  servico: string;
  preco: number;
  prazo_dias: number;
}

export interface CardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  brand: string | null;
  cep?: string;
  frete?: FreteOption | null;
}

export default function CreditCardForm({
  onCardDataChange,
  onValidChange,
  disabled = false,
}: CreditCardFormProps) {
  const [holderName, setHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [cep, setCep] = useState('');
  const [fretes, setFretes] = useState<FreteOption[]>([]);
  const [freteSelecionado, setFreteSelecionado] = useState<FreteOption | null>(null);
  const [freteLoading, setFreteLoading] = useState(false);
  const [freteError, setFreteError] = useState<string | null>(null);
  const [lastCepFetched, setLastCepFetched] = useState('');
  const [touchedFrete, setTouchedFrete] = useState(false);
  
  const brand = detectCardBrand(cardNumber);
  const cvvLength = getCVVLength(brand);
  
  const isCardNumberValid = validateCardNumber(cardNumber);
  const [expiryMonth, expiryYear] = expiry.split('/');
  const isExpiryValid = validateExpiry(expiryMonth, expiryYear);
  const isCvvValid = cvv.replace(/\D/g, '').length === cvvLength;
  const isHolderNameValid = holderName.trim().length >= 3;
  const cepDigits = cep.replace(/\D/g, '');
  const isCepValid = cepDigits.length === 8;
  
  const isFormValid = isCardNumberValid && isExpiryValid && isCvvValid && isHolderNameValid && !!freteSelecionado;

  useEffect(() => {
    onValidChange(isFormValid);
    onCardDataChange({
      holderName: holderName.trim(),
      number: cardNumber.replace(/\s/g, ''),
      expiryMonth: expiryMonth || '',
      expiryYear: expiryYear || '',
      cvv: cvv.replace(/\D/g, ''),
      brand,
      cep: cepDigits,
      frete: freteSelecionado,
    });
  }, [holderName, cardNumber, expiry, cvv, brand, isFormValid, onCardDataChange, onValidChange, cepDigits, freteSelecionado]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiry(formatExpiry(e.target.value));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, cvvLength);
    setCvv(value);
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const buildFreteOptions = (all: FreteOption[]) => {
    const pac = all.find(f => /pac/i.test(f.servico));
    const sedex = all.find(f => /sedex/i.test(f.servico));
    const others = all.filter(f => f !== pac && f !== sedex);
    const cheapestOther = others.sort((a, b) => a.preco - b.preco)[0];
    return [pac, sedex, cheapestOther].filter(Boolean) as FreteOption[];
  };

  const handleCepBlur = async () => {
    setTouched(prev => ({ ...prev, cep: true }));
    setTouchedFrete(true);
    const sanitized = cep.replace(/\D/g, '');
    if (sanitized.length !== 8) {
      setFreteError('CEP inválido');
      setFretes([]);
      setFreteSelecionado(null);
      return;
    }
    if (sanitized === lastCepFetched) return;

    setFreteLoading(true);
    setFreteError(null);
    setLastCepFetched(sanitized);
    setFretes([]);
    setFreteSelecionado(null);

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${baseUrl}/functions/v1/calcular-frete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cepDestino: sanitized }),
      });
      const data = await response.json();
      if (!data?.success || !Array.isArray(data.fretes)) {
        throw new Error('Resposta inválida');
      }
      const options = buildFreteOptions(data.fretes);
      setFretes(options);
    } catch (error) {
      setFreteError('Não foi possível calcular o frete');
      setFretes([]);
    } finally {
      setFreteLoading(false);
    }
  };

  const getBrandIcon = () => {
    if (!brand) return <CreditCard className="h-5 w-5 text-muted-foreground" />;
    
    const brandIcons: Record<string, string> = {
      visa: '💳 Visa',
      mastercard: '💳 Mastercard',
      amex: '💳 Amex',
      elo: '💳 Elo',
      hipercard: '💳 Hipercard',
      diners: '💳 Diners',
    };
    
    return <span className="text-sm font-medium text-primary">{brandIcons[brand] || '💳'}</span>;
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-card/50">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="h-4 w-4 text-primary" />
        <span className="text-sm text-muted-foreground">Pagamento seguro</span>
      </div>
      
      {/* Holder Name */}
      <div className="space-y-2">
        <Label htmlFor="holderName">Nome no cartão *</Label>
        <Input
          id="holderName"
          type="text"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value.toUpperCase())}
          onBlur={() => handleBlur('holderName')}
          placeholder="NOME COMO ESTÁ NO CARTÃO"
          disabled={disabled}
          className={
            touched.holderName && !isHolderNameValid
              ? 'border-destructive'
              : touched.holderName && isHolderNameValid
              ? 'border-green-500'
              : ''
          }
        />
        {touched.holderName && !isHolderNameValid && (
          <p className="text-sm text-destructive">Nome deve ter pelo menos 3 caracteres</p>
        )}
      </div>

      {/* Card Number */}
      <div className="space-y-2">
        <Label htmlFor="cardNumber">Número do cartão *</Label>
        <div className="relative">
          <Input
            id="cardNumber"
            type="text"
            inputMode="numeric"
            value={cardNumber}
            onChange={handleCardNumberChange}
            onBlur={() => handleBlur('cardNumber')}
            placeholder="0000 0000 0000 0000"
            disabled={disabled}
            className={`pr-24 ${
              touched.cardNumber && cardNumber.replace(/\s/g, '').length >= 13
                ? isCardNumberValid
                  ? 'border-green-500'
                  : 'border-destructive'
                : ''
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {getBrandIcon()}
            {touched.cardNumber && cardNumber.replace(/\s/g, '').length >= 13 && (
              isCardNumberValid ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-destructive" />
              )
            )}
          </div>
        </div>
        {touched.cardNumber && !isCardNumberValid && cardNumber.replace(/\s/g, '').length >= 13 && (
          <p className="text-sm text-destructive">Número de cartão inválido</p>
        )}
      </div>

      {/* Expiry and CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry">Validade *</Label>
          <Input
            id="expiry"
            type="text"
            inputMode="numeric"
            value={expiry}
            onChange={handleExpiryChange}
            onBlur={() => handleBlur('expiry')}
            placeholder="MM/AA"
            disabled={disabled}
            className={
              touched.expiry && expiry.length === 5
                ? isExpiryValid
                  ? 'border-green-500'
                  : 'border-destructive'
                : ''
            }
          />
          {touched.expiry && !isExpiryValid && expiry.length === 5 && (
            <p className="text-sm text-destructive">Data inválida</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cvv">CVV *</Label>
          <div className="relative">
            <Input
              id="cvv"
              type="text"
              inputMode="numeric"
              value={cvv}
              onChange={handleCvvChange}
              onBlur={() => handleBlur('cvv')}
              placeholder={cvvLength === 4 ? '0000' : '000'}
              maxLength={cvvLength}
              disabled={disabled}
              className={`pr-10 ${
                touched.cvv && cvv.length === cvvLength
                  ? isCvvValid
                    ? 'border-green-500'
                    : 'border-destructive'
                  : ''
              }`}
            />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* CEP */}
      <div className="space-y-2">
        <Label htmlFor="cep">CEP *</Label>
        <Input
          id="cep"
          type="text"
          inputMode="numeric"
          value={cep}
          onChange={(e) => setCep(e.target.value)}
          onBlur={handleCepBlur}
          placeholder="00000-000"
          disabled={disabled}
          className={
            touched.cep && !isCepValid
              ? 'border-destructive'
              : touched.cep && isCepValid
              ? 'border-green-500'
              : ''
          }
        />
        {touched.cep && !isCepValid && (
          <p className="text-sm text-destructive">CEP inválido</p>
        )}
        {freteError && (
          <p className="text-sm text-destructive">{freteError}</p>
        )}
      </div>

      {/* Frete */}
      <div className="space-y-2">
        <Label>Opções de frete *</Label>
        {freteLoading && (
          <p className="text-sm text-muted-foreground">Calculando frete...</p>
        )}
        {!freteLoading && fretes.length > 0 && (
          <RadioGroup
            value={freteSelecionado ? `${freteSelecionado.transportadora}-${freteSelecionado.servico}` : ''}
            onValueChange={(value) => {
              const selected = fretes.find(
                (f) => `${f.transportadora}-${f.servico}` === value
              ) || null;
              setFreteSelecionado(selected);
              setTouchedFrete(true);
            }}
            className="space-y-2"
          >
            {fretes.map((frete) => {
              const value = `${frete.transportadora}-${frete.servico}`;
              return (
                <label key={value} className="flex items-center gap-3 rounded-md border border-border p-3">
                  <RadioGroupItem value={value} id={value} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {frete.transportadora} {frete.servico}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      R$ {frete.preco.toFixed(2)} • {frete.prazo_dias} dias
                    </span>
                  </div>
                </label>
              );
            })}
          </RadioGroup>
        )}
        {touchedFrete && !freteSelecionado && fretes.length > 0 && (
          <p className="text-sm text-destructive">Selecione um frete para continuar</p>
        )}
      </div>

      {/* Security notice */}
      <div className="flex items-center gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
        <Lock className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          Seus dados são criptografados e processados com segurança pelo Asaas. 
          Não armazenamos os dados do seu cartão.
        </p>
      </div>
    </div>
  );
}
