// Validation utilities for checkout

/**
 * Validates CPF using the official algorithm
 */
export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validate first digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Validate second digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

/**
 * Validates CNPJ using the official algorithm
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Validate first digit
  let size = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, size);
  const digits = cleanCNPJ.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  // Validate second digit
  size = size + 1;
  numbers = cleanCNPJ.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

/**
 * Validates CPF or CNPJ
 */
export function validateCPFOrCNPJ(value: string): boolean {
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) return validateCPF(value);
  if (clean.length === 14) return validateCNPJ(value);
  return false;
}

/**
 * Luhn algorithm for credit card validation
 */
export function validateCardNumber(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  
  if (!/^\d{13,19}$/.test(cleanNumber)) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i));
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Detects credit card brand from number
 */
export function detectCardBrand(cardNumber: string): string | null {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  
  const patterns: Record<string, RegExp> = {
    visa: /^4/,
    mastercard: /^5[1-5]|^2[2-7]/,
    amex: /^3[47]/,
    elo: /^(636368|438935|504175|451416|636297|5067|4576|4011|506699)/,
    hipercard: /^(606282|3841)/,
    diners: /^3(?:0[0-5]|[68])/,
  };
  
  for (const [brand, pattern] of Object.entries(patterns)) {
    if (pattern.test(cleanNumber)) return brand;
  }
  
  return null;
}

/**
 * Gets CVV length for card brand
 */
export function getCVVLength(brand: string | null): number {
  return brand === 'amex' ? 4 : 3;
}

/**
 * Validates card expiry date
 */
export function validateExpiry(month: string, year: string): boolean {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear() % 100;
  const currentMonth = currentDate.getMonth() + 1;
  
  const expMonth = parseInt(month);
  const expYear = parseInt(year);
  
  if (isNaN(expMonth) || isNaN(expYear)) return false;
  if (expMonth < 1 || expMonth > 12) return false;
  
  if (expYear < currentYear) return false;
  if (expYear === currentYear && expMonth < currentMonth) return false;
  
  return true;
}

/**
 * Formats CPF with mask
 */
export function formatCPF(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  return clean
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Formats CNPJ with mask
 */
export function formatCNPJ(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 14);
  return clean
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/**
 * Formats CPF or CNPJ with appropriate mask
 */
export function formatCPFOrCNPJ(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (clean.length <= 11) return formatCPF(value);
  return formatCNPJ(value);
}

/**
 * Formats credit card number with spaces
 */
export function formatCardNumber(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 19);
  const brand = detectCardBrand(clean);
  
  // Amex uses 4-6-5 pattern
  if (brand === 'amex') {
    return clean
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4}) (\d{6})(\d)/, '$1 $2 $3');
  }
  
  // Default 4-4-4-4 pattern
  return clean.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/**
 * Formats expiry date MM/YY
 */
export function formatExpiry(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 4);
  if (clean.length >= 2) {
    return clean.slice(0, 2) + '/' + clean.slice(2);
  }
  return clean;
}

/**
 * Formats CEP with mask
 */
export function formatCEP(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 8);
  return clean.replace(/(\d{5})(\d)/, '$1-$2');
}

/**
 * Formats phone number
 */
export function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 10) {
    return clean
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return clean
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

/**
 * Masks card number for display (shows only last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.length < 4) return clean;
  return '**** **** **** ' + clean.slice(-4);
}

/**
 * Sanitizes CPF/CNPJ (removes non-digits)
 */
export function sanitizeCPFCNPJ(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Sanitizes card number (removes spaces and non-digits)
 */
export function sanitizeCardNumber(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Sanitizes phone (removes non-digits)
 */
export function sanitizePhone(value: string): string {
  return value.replace(/\D/g, '');
}
