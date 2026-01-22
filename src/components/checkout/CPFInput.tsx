import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCPFOrCNPJ, validateCPFOrCNPJ } from '@/lib/validators';
import { Check, X } from 'lucide-react';

interface CPFInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function CPFInput({
  value,
  onChange,
  onValidChange,
  label = 'CPF/CNPJ',
  placeholder = '000.000.000-00',
  required = false,
  disabled = false,
}: CPFInputProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const clean = value.replace(/\D/g, '');
    if (clean.length === 11 || clean.length === 14) {
      const valid = validateCPFOrCNPJ(value);
      setIsValid(valid);
      onValidChange?.(valid);
    } else {
      setIsValid(null);
      onValidChange?.(false);
    }
  }, [value, onValidChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPFOrCNPJ(e.target.value);
    onChange(formatted);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const showValidation = touched && value.replace(/\D/g, '').length >= 11;

  return (
    <div className="space-y-2">
      <Label htmlFor="cpf" className="text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Input
          id="cpf"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-10 ${
            showValidation
              ? isValid
                ? 'border-green-500 focus:border-green-500'
                : 'border-destructive focus:border-destructive'
              : ''
          }`}
        />
        {showValidation && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-destructive" />
            )}
          </div>
        )}
      </div>
      {showValidation && !isValid && (
        <p className="text-sm text-destructive">
          {value.replace(/\D/g, '').length === 11
            ? 'CPF inválido. Verifique os dígitos.'
            : 'CNPJ inválido. Verifique os dígitos.'}
        </p>
      )}
    </div>
  );
}
