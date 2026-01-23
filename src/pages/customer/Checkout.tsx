import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Truck,
  Loader2,
  Ticket,
  QrCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { ShippingQuote } from '@/types/ecommerce';
import CouponInput from '@/components/checkout/CouponInput';
import CPFInput from '@/components/checkout/CPFInput';
import CreditCardForm, { CardData } from '@/components/checkout/CreditCardForm';
import PixAwaitingPayment from '@/components/checkout/PixAwaitingPayment';
import AsaasAwaitingPayment from '@/components/checkout/AsaasAwaitingPayment';
import PaymentSuccessOverlay from '@/components/checkout/PaymentSuccessOverlay';

interface AppliedCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number | null;
  max_discount: number | null;
  max_uses: number | null;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

interface PixConfig {
  pix_key: string;
  pix_key_type: string;
  admin_whatsapp: string;
  admin_notification_enabled: boolean;
}

interface PixPaymentData {
  id: string;
  pixKey: string;
  transactionId: string;
  amount: number;
  expiresAt: string;
}

interface AsaasPaymentData {
  id: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  pixQrCode?: {
    encodedImage: string;
    payload: string;
    expirationDate: string;
  };
  status: string;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { cart, getCartTotal, clearCart } = useCart();
  
  const [step, setStep] = useState<'shipping' | 'processing' | 'awaiting_pix' | 'awaiting_asaas' | 'confirmation'>('shipping');
  const [loading, setLoading] = useState(false);
  const [loadingShipping, setLoadingShipping] = useState(false);
  
  // PIX config from database
  const [pixConfig, setPixConfig] = useState<PixConfig>({
    pix_key: '',
    pix_key_type: 'email',
    admin_whatsapp: '5511999999999',
    admin_notification_enabled: true,
  });
  
  // PIX payment data (after generation)
  const [pixPaymentData, setPixPaymentData] = useState<PixPaymentData | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  
  // Asaas payment data
  const [asaasPaymentData, setAsaasPaymentData] = useState<AsaasPaymentData | null>(null);
  const [asaasBillingType, setAsaasBillingType] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX');
  const [customerCpfCnpj, setCustomerCpfCnpj] = useState('');
  const [isCpfValid, setIsCpfValid] = useState(false);
  
  // Credit card data
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [isCardValid, setIsCardValid] = useState(false);
  
  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'asaas'>('pix');
  
  // Shipping form
  const [shippingData, setShippingData] = useState({
    name: profile?.full_name || '',
    phone: profile?.phone || '',
    zip: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  
  // Shipping quotes
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingQuote | null>(null);
  
  // Coupon
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Order result for non-PIX payments
  const [orderResult, setOrderResult] = useState<{
    orderId: string;
    paymentLink: string;
    paymentMethod: 'pix' | 'asaas';
  } | null>(null);

  // Polling state
  const [pollingCount, setPollingCount] = useState(0);
  const MAX_POLLING = 30;

  useEffect(() => {
    if (!user) {
      navigate('/auth?from=shop&redirect=/loja/checkout');
      return;
    }
    if (cart.length === 0 && step === 'shipping') {
      navigate('/');
    }
  }, [user, cart, step]);

  useEffect(() => {
    if (profile) {
      setShippingData(prev => ({
        ...prev,
        name: profile.full_name || prev.name,
        phone: profile.phone || prev.phone,
      }));
    }
  }, [profile]);

  // Fetch PIX settings from database
  useEffect(() => {
    const fetchPixSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('key, value')
          .in('key', ['pix_key', 'pix_key_type', 'admin_whatsapp', 'admin_notification_enabled']);

        if (error) throw error;

        const settingsMap: Record<string, string> = {};
        data?.forEach(item => {
          settingsMap[item.key] = item.value;
        });

        setPixConfig({
          pix_key: settingsMap['pix_key'] || '',
          pix_key_type: settingsMap['pix_key_type'] || 'email',
          admin_whatsapp: settingsMap['admin_whatsapp'] || '5511999999999',
          admin_notification_enabled: settingsMap['admin_notification_enabled'] === 'true',
        });
      } catch (error) {
        console.error('Error fetching PIX settings:', error);
      }
    };

    fetchPixSettings();
  }, []);

  const getTotalWithShipping = () => {
    return getCartTotal() - discountAmount + (selectedShipping?.price || 0);
  };

  const handleApplyCoupon = (coupon: AppliedCoupon | null, discount: number) => {
    setAppliedCoupon(coupon);
    setDiscountAmount(discount);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleZipChange = async (zip: string) => {
    setShippingData(prev => ({ ...prev, zip }));
    
    // Auto-fill address from CEP
    if (zip.replace(/\D/g, '').length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${zip.replace(/\D/g, '')}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setShippingData(prev => ({
            ...prev,
            address: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
          }));
          
          // Fetch shipping quotes
          fetchShippingQuotes(zip.replace(/\D/g, ''));
        }
      } catch (error) {
        console.error('Error fetching CEP:', error);
      }
    }
  };

  const fetchShippingQuotes = async (zip: string) => {
    setLoadingShipping(true);
    
    // Simulated shipping quotes (would integrate with Correios API)
    setTimeout(() => {
      const quotes: ShippingQuote[] = [
        { service: 'PAC', carrier: 'Correios', price: 0, delivery_time: 8 },
        { service: 'SEDEX', carrier: 'Correios', price: 15.90, delivery_time: 3 },
      ];
      
      setShippingQuotes(quotes);
      setSelectedShipping(quotes[0]); // Default to free shipping
      setLoadingShipping(false);
    }, 1000);
  };

  const validateShipping = () => {
    const required = ['name', 'phone', 'zip', 'address', 'number', 'city', 'state'];
    for (const field of required) {
      if (!shippingData[field as keyof typeof shippingData]) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha todos os campos de endereço.',
          variant: 'destructive',
        });
        return false;
      }
    }
    if (!selectedShipping) {
      toast({
        title: 'Selecione o frete',
        description: 'Escolha uma opção de entrega.',
        variant: 'destructive',
      });
      return false;
    }
    // Validate CPF/CNPJ for Asaas payments
    if (paymentMethod === 'asaas') {
      if (!isCpfValid) {
        toast({
          title: 'CPF/CNPJ inválido',
          description: 'Informe um CPF ou CNPJ válido para continuar.',
          variant: 'destructive',
        });
        return false;
      }
      // Validate card for credit card payment
      if (asaasBillingType === 'CREDIT_CARD' && !isCardValid) {
        toast({
          title: 'Dados do cartão inválidos',
          description: 'Preencha corretamente os dados do cartão de crédito.',
          variant: 'destructive',
        });
        return false;
      }
    }
    return true;
  };

  const sendAdminNotification = (orderId: string, total: number) => {
    if (!pixConfig.admin_notification_enabled || !pixConfig.admin_whatsapp) return;
    
    const message = `🛒 *NOVO PEDIDO PIX!*

📦 Pedido: #${orderId.slice(0, 8)}
💰 Valor: ${formatCurrency(total)}
👤 Cliente: ${shippingData.name}
📱 Telefone: ${shippingData.phone}
📍 Cidade: ${shippingData.city}/${shippingData.state}

⏳ Aguardando pagamento PIX.`;
    
    window.open(`https://wa.me/${pixConfig.admin_whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCardDataChange = useCallback((data: CardData) => {
    setCardData(data);
  }, []);

  const handleCardValidChange = useCallback((valid: boolean) => {
    setIsCardValid(valid);
  }, []);

  const handleCreateOrder = async () => {
    if (!validateShipping()) return;
    
    setLoading(true);
    
    try {
      // Create order with payment method info
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          total_amount: getTotalWithShipping(),
          status: 'pending',
          payment_status: 'pending',
          payment_method: paymentMethod === 'pix' ? 'pix' : asaasBillingType.toLowerCase(),
          shipping_name: shippingData.name,
          shipping_phone: shippingData.phone,
          shipping_address: `${shippingData.address}, ${shippingData.number}${shippingData.complement ? ` - ${shippingData.complement}` : ''} - ${shippingData.neighborhood}`,
          shipping_city: shippingData.city,
          shipping_state: shippingData.state,
          shipping_zip: shippingData.zip,
          shipping_cost: selectedShipping?.price || 0,
          shipping_method: selectedShipping?.service,
          coupon_id: appliedCoupon?.id || null,
          discount_amount: discountAmount,
          notes: paymentMethod === 'pix' ? `Pagamento PIX - Aguardando confirmação` : null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      setCurrentOrderId(order.id);

      // Increment coupon usage atomically if applied
      if (appliedCoupon) {
        const { data: couponResult, error: couponError } = await supabase.rpc(
          'increment_coupon_usage',
          { coupon_uuid: appliedCoupon.id }
        );

        // Check if coupon usage failed (e.g., limit exceeded during race condition)
        if (couponError || !couponResult?.[0]?.success) {
          // Rollback the order since coupon is no longer valid
          await supabase.from('orders').delete().eq('id', order.id);
          throw new Error(couponResult?.[0]?.message || 'Limite de uso do cupom foi excedido');
        }
      }

      // Create order items
      const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      const items = cart.map(item => ({
        order_id: order.id,
        product_id: isValidUUID(item.product.id) ? item.product.id : null,
        quantity: item.quantity,
        unit_price: item.product.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // For PIX payment, generate dynamic PIX key
      if (paymentMethod === 'pix') {
        const { data: session } = await supabase.auth.getSession();
        
        const { data: pixResult, error: pixError } = await supabase.functions.invoke('pix-payment', {
          body: {
            orderId: order.id,
            amount: getTotalWithShipping(),
            customerEmail: profile?.email || user?.email,
            customerName: shippingData.name,
            customerPhone: shippingData.phone,
          },
          headers: {
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
        });

        if (pixError) throw pixError;
        
        if (pixResult?.success && pixResult?.pixPayment) {
          setPixPaymentData(pixResult.pixPayment);
          sendAdminNotification(order.id, getTotalWithShipping());
          clearCart();
          setStep('awaiting_pix');
        } else {
          throw new Error('Erro ao gerar PIX');
        }
      } else if (paymentMethod === 'asaas' && asaasBillingType === 'CREDIT_CARD' && cardData) {
        // Credit card transparent checkout
        setStep('processing');
        
        const { data: session } = await supabase.auth.getSession();
        
        const { data: cardResult, error: cardError } = await supabase.functions.invoke('process-credit-card-payment', {
          body: {
            orderId: order.id,
            amount: getTotalWithShipping(),
            customerName: shippingData.name,
            customerEmail: profile?.email || user?.email,
            customerPhone: shippingData.phone,
            customerCpfCnpj: customerCpfCnpj,
            postalCode: shippingData.zip,
            address: shippingData.address,
            addressNumber: shippingData.number,
            complement: shippingData.complement || '',
            province: shippingData.neighborhood,
            city: shippingData.city,
            state: shippingData.state,
            cardHolderName: cardData.holderName,
            cardNumber: cardData.number,
            expiryMonth: cardData.expiryMonth,
            expiryYear: cardData.expiryYear,
            ccv: cardData.cvv,
            installments: 1,
          },
          headers: {
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
        });

        if (cardError) {
          throw new Error(cardError.message || 'Erro ao processar pagamento');
        }
        
        if (cardResult?.success) {
          clearCart();
          
          if (cardResult.status === 'APPROVED') {
            // Payment approved - redirect to thank you page
            toast({
              title: 'Pagamento aprovado!',
              description: 'Seu pedido foi confirmado com sucesso.',
            });
            navigate(`/obrigado?pedido=${order.id}`);
          } else if (cardResult.status === 'PENDING') {
            // Payment pending - start polling
            pollPaymentStatus(cardResult.payment?.id, order.id);
          } else {
            // Payment rejected
            throw new Error('Pagamento recusado. Tente outro cartão.');
          }
        } else {
          throw new Error(cardResult?.error || 'Erro ao processar pagamento');
        }
      } else {
        // For Asaas PIX/Boleto - create payment via API
        const { data: session } = await supabase.auth.getSession();
        
        const { data: asaasResult, error: asaasError } = await supabase.functions.invoke('asaas-payment', {
          body: {
            orderId: order.id,
            amount: getTotalWithShipping(),
            customerName: shippingData.name,
            customerEmail: profile?.email || user?.email,
            customerPhone: shippingData.phone,
            customerCpfCnpj: customerCpfCnpj.replace(/\D/g, ''),
            billingType: asaasBillingType,
          },
          headers: {
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
        });

        if (asaasError) throw asaasError;
        
        if (asaasResult?.success && asaasResult?.payment) {
          setAsaasPaymentData(asaasResult.payment);
          setCurrentOrderId(order.id);
          clearCart();
          
          // If PIX via Asaas, show waiting screen with QR code
          if (asaasBillingType === 'PIX' && asaasResult.payment.pixQrCode) {
            setStep('awaiting_asaas');
          } else {
            // For boleto, redirect to payment link
            setOrderResult({
              orderId: order.id,
              paymentLink: asaasResult.payment.invoiceUrl,
              paymentMethod: 'asaas',
            });
            setStep('confirmation');
          }
        } else {
          throw new Error('Erro ao criar cobrança');
        }
      }
      
    } catch (error: any) {
      console.error('Error creating order:', error);
      setStep('shipping');
      toast({
        title: 'Erro ao processar pedido',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentId: string, orderId: string) => {
    if (pollingCount >= MAX_POLLING) {
      toast({
        title: 'Tempo esgotado',
        description: 'Não foi possível confirmar o pagamento. Verifique seu pedido no dashboard.',
        variant: 'destructive',
      });
      setStep('confirmation');
      setOrderResult({
        orderId,
        paymentLink: '',
        paymentMethod: 'asaas',
      });
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-payment?action=status&paymentId=${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${session?.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.status === 'CONFIRMED' || result.status === 'RECEIVED') {
        toast({
          title: 'Pagamento confirmado!',
          description: 'Seu pedido foi processado com sucesso.',
        });
        navigate(`/obrigado?pedido=${orderId}`);
      } else if (result.status === 'PENDING') {
        setPollingCount(prev => prev + 1);
        setTimeout(() => pollPaymentStatus(paymentId, orderId), 2000);
      } else {
        // Payment failed
        toast({
          title: 'Pagamento não aprovado',
          description: 'Verifique os dados do cartão e tente novamente.',
          variant: 'destructive',
        });
        setStep('shipping');
      }
    } catch (error) {
      console.error('Error polling payment status:', error);
      setPollingCount(prev => prev + 1);
      setTimeout(() => pollPaymentStatus(paymentId, orderId), 2000);
    }
  };

  const handlePaymentConfirmed = () => {
    if (currentOrderId) {
      navigate(`/obrigado?pedido=${currentOrderId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/loja')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Checkout</h1>
            <p className="text-sm text-muted-foreground">
              {step === 'shipping' && 'Endereço e pagamento'}
              {step === 'processing' && 'Processando pagamento...'}
              {step === 'awaiting_pix' && 'Aguardando pagamento'}
              {step === 'awaiting_asaas' && 'Aguardando pagamento'}
              {step === 'confirmation' && 'Pedido confirmado'}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Processing state */}
            {step === 'processing' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <CreditCard className="absolute inset-0 m-auto w-8 h-8 text-primary" />
                </div>
                <h2 className="mt-6 text-xl font-semibold">Processando pagamento...</h2>
                <p className="text-muted-foreground mt-2 text-center">
                  Aguarde enquanto validamos os dados do seu cartão.
                  <br />
                  Não feche esta página.
                </p>
              </motion.div>
            )}

            {step === 'shipping' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Endereço de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                          id="name"
                          value={shippingData.name}
                          onChange={(e) => setShippingData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Seu nome"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={shippingData.phone}
                          onChange={(e) => setShippingData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="zip">CEP</Label>
                        <Input
                          id="zip"
                          value={shippingData.zip}
                          onChange={(e) => handleZipChange(e.target.value)}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">Endereço</Label>
                        <Input
                          id="address"
                          value={shippingData.address}
                          onChange={(e) => setShippingData(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Rua, Avenida..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="number">Número</Label>
                        <Input
                          id="number"
                          value={shippingData.number}
                          onChange={(e) => setShippingData(prev => ({ ...prev, number: e.target.value }))}
                          placeholder="123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="complement">Complemento</Label>
                        <Input
                          id="complement"
                          value={shippingData.complement}
                          onChange={(e) => setShippingData(prev => ({ ...prev, complement: e.target.value }))}
                          placeholder="Apto 101"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input
                          id="neighborhood"
                          value={shippingData.neighborhood}
                          onChange={(e) => setShippingData(prev => ({ ...prev, neighborhood: e.target.value }))}
                          placeholder="Bairro"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                          id="city"
                          value={shippingData.city}
                          onChange={(e) => setShippingData(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Cidade"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado</Label>
                        <Input
                          id="state"
                          value={shippingData.state}
                          onChange={(e) => setShippingData(prev => ({ ...prev, state: e.target.value }))}
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Options */}
                {shippingData.zip.replace(/\D/g, '').length === 8 && (
                  <Card className="glass-card mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Truck className="w-5 h-5" />
                        Opções de Entrega
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingShipping ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                      ) : (
                        <RadioGroup
                          value={selectedShipping?.service || ''}
                          onValueChange={(value) => {
                            const quote = shippingQuotes.find(q => q.service === value);
                            setSelectedShipping(quote || null);
                          }}
                        >
                          {shippingQuotes.map((quote) => (
                            <div
                              key={quote.service}
                              className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                                selectedShipping?.service === quote.service
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => setSelectedShipping(quote)}
                            >
                              <div className="flex items-center gap-3">
                                <RadioGroupItem value={quote.service} id={quote.service} />
                                <div>
                                  <p className="font-medium">{quote.carrier} {quote.service}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Entrega em até {quote.delivery_time} dias úteis
                                  </p>
                                </div>
                              </div>
                              <span className={`font-semibold ${quote.price === 0 ? 'text-primary' : ''}`}>
                                {quote.price === 0 ? 'Grátis' : formatCurrency(quote.price)}
                              </span>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Payment Method Selection */}
                {selectedShipping && (
                  <Card className="glass-card mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Forma de Pagamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup
                        value={paymentMethod}
                        onValueChange={(value) => setPaymentMethod(value as 'pix' | 'asaas')}
                      >
                        <div
                          className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                            paymentMethod === 'pix'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setPaymentMethod('pix')}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value="pix" id="pix" />
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                <QrCode className="w-4 h-4 text-primary" />
                                PIX
                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Recomendado</span>
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Pagamento instantâneo • Confirmação automática
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div
                          className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors mt-2 ${
                            paymentMethod === 'asaas'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setPaymentMethod('asaas')}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value="asaas" id="asaas" />
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                Cartão / Boleto / PIX Asaas
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Via plataforma de pagamento segura
                              </p>
                            </div>
                          </div>
                        </div>
                      </RadioGroup>

                      {/* Asaas Options */}
                      {paymentMethod === 'asaas' && (
                        <div className="mt-4 space-y-4 pt-4 border-t border-border">
                          {/* CPF Input with validation */}
                          <CPFInput
                            value={customerCpfCnpj}
                            onChange={setCustomerCpfCnpj}
                            onValidChange={setIsCpfValid}
                            required
                          />
                          
                          <div className="space-y-2">
                            <Label>Forma de pagamento</Label>
                            <RadioGroup
                              value={asaasBillingType}
                              onValueChange={(value) => setAsaasBillingType(value as 'PIX' | 'BOLETO' | 'CREDIT_CARD')}
                              className="grid grid-cols-3 gap-2"
                            >
                              <div
                                className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                  asaasBillingType === 'PIX'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                }`}
                                onClick={() => setAsaasBillingType('PIX')}
                              >
                                <RadioGroupItem value="PIX" id="asaas-pix" className="sr-only" />
                                <QrCode className="w-5 h-5 mb-1" />
                                <span className="text-xs">PIX</span>
                              </div>
                              <div
                                className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                  asaasBillingType === 'BOLETO'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                }`}
                                onClick={() => setAsaasBillingType('BOLETO')}
                              >
                                <RadioGroupItem value="BOLETO" id="asaas-boleto" className="sr-only" />
                                <Ticket className="w-5 h-5 mb-1" />
                                <span className="text-xs">Boleto</span>
                              </div>
                              <div
                                className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                  asaasBillingType === 'CREDIT_CARD'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                }`}
                                onClick={() => setAsaasBillingType('CREDIT_CARD')}
                              >
                                <RadioGroupItem value="CREDIT_CARD" id="asaas-card" className="sr-only" />
                                <CreditCard className="w-5 h-5 mb-1" />
                                <span className="text-xs">Cartão</span>
                              </div>
                            </RadioGroup>
                          </div>

                          {/* Credit Card Form - Transparent Checkout */}
                          {asaasBillingType === 'CREDIT_CARD' && (
                            <div className="mt-4">
                              <CreditCardForm
                                onCardDataChange={handleCardDataChange}
                                onValidChange={handleCardValidChange}
                                disabled={loading}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Button
                  className="w-full mt-6"
                  size="lg"
                  onClick={handleCreateOrder}
                  disabled={loading || !selectedShipping || (paymentMethod === 'asaas' && !isCpfValid) || (paymentMethod === 'asaas' && asaasBillingType === 'CREDIT_CARD' && !isCardValid)}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : paymentMethod === 'pix' ? (
                    <QrCode className="w-4 h-4 mr-2" />
                  ) : asaasBillingType === 'CREDIT_CARD' ? (
                    <CreditCard className="w-4 h-4 mr-2" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  {paymentMethod === 'pix' 
                    ? 'Gerar PIX e Pagar' 
                    : asaasBillingType === 'CREDIT_CARD'
                    ? 'Pagar com Cartão'
                    : 'Ir para Pagamento'
                  }
                </Button>
              </motion.div>
            )}

            {step === 'awaiting_pix' && pixPaymentData && currentOrderId && (
              <PixAwaitingPayment
                pixPayment={pixPaymentData}
                orderId={currentOrderId}
                adminWhatsapp={pixConfig.admin_whatsapp}
                onPaymentConfirmed={handlePaymentConfirmed}
              />
            )}

            {step === 'awaiting_asaas' && asaasPaymentData && currentOrderId && (
              <AsaasAwaitingPayment
                asaasPayment={asaasPaymentData}
                orderId={currentOrderId}
                onPaymentConfirmed={handlePaymentConfirmed}
              />
            )}

            {step === 'confirmation' && orderResult && (
              <PaymentSuccessOverlay
                orderId={orderResult.orderId}
                totalAmount={getTotalWithShipping()}
                paymentMethod={orderResult.paymentMethod}
                estimatedDelivery={selectedShipping?.delivery_time 
                  ? `${selectedShipping.delivery_time} dias úteis` 
                  : undefined}
                paymentLink={orderResult.paymentLink || undefined}
                onNavigateDashboard={() => navigate('/dashboard')}
                onNavigateHome={() => navigate('/')}
              />
            )}
          </div>

          {/* Order Summary */}
          {step === 'shipping' && (
            <div className="lg:col-span-1">
              <Card className="glass-card sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Resumo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        {item.product.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Qtd: {item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}

                  <div className="border-t border-border pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(getCartTotal())}</span>
                    </div>
                    
                    {/* Coupon Input */}
                    <div className="py-2">
                      <CouponInput
                        orderTotal={getCartTotal()}
                        appliedCoupon={appliedCoupon}
                        onApplyCoupon={handleApplyCoupon}
                      />
                    </div>
                    
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-primary">
                        <span className="flex items-center gap-1">
                          <Ticket className="w-3 h-3" />
                          Desconto
                        </span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    
                    {selectedShipping && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Frete ({selectedShipping.service})</span>
                        <span className={selectedShipping.price === 0 ? 'text-primary' : ''}>
                          {selectedShipping.price === 0 ? 'Grátis' : formatCurrency(selectedShipping.price)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                      <span>Total</span>
                      <span className="text-primary">{formatCurrency(getTotalWithShipping())}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
