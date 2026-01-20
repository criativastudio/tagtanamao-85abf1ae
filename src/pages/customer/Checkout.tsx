import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Truck,
  Check,
  Loader2,
  Ticket,
  QrCode,
  Copy,
  CheckCircle2
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

export default function Checkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { cart, getCartTotal, clearCart } = useCart();
  
  const [step, setStep] = useState<'shipping' | 'payment' | 'confirmation'>('shipping');
  const [loading, setLoading] = useState(false);
  const [loadingShipping, setLoadingShipping] = useState(false);
  
  // PIX config from database
  const [pixConfig, setPixConfig] = useState<PixConfig>({
    pix_key: '',
    pix_key_type: 'email',
    admin_whatsapp: '5511999999999',
    admin_notification_enabled: true,
  });
  
  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'asaas'>('pix');
  const [pixCopied, setPixCopied] = useState(false);
  
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
  
  // Order result
  const [orderResult, setOrderResult] = useState<{
    orderId: string;
    paymentLink: string;
    paymentMethod: 'pix' | 'asaas';
  } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (cart.length === 0) {
      navigate('/');
    }
  }, [user, cart]);

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
    // For now, using static quotes
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
    return true;
  };

  const generatePixPayload = (amount: number) => {
    // Gera payload PIX simplificado (em produção, usar biblioteca pix-payload)
    const payload = `${pixConfig.pix_key}`;
    return payload;
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText(pixConfig.pix_key);
    setPixCopied(true);
    toast({
      title: 'Chave PIX copiada!',
      description: 'Cole no app do seu banco para pagar.',
    });
    setTimeout(() => setPixCopied(false), 3000);
  };

  const getPixKeyTypeLabel = () => {
    const labels: Record<string, string> = {
      phone: 'Telefone',
      email: 'E-mail',
      cpf: 'CPF',
      cnpj: 'CNPJ',
      random: 'Chave Aleatória',
    };
    return labels[pixConfig.pix_key_type] || 'Chave';
  };

  const sendAdminNotification = (orderId: string, total: number) => {
    if (!pixConfig.admin_notification_enabled || !pixConfig.admin_whatsapp) return;
    
    const message = `🛒 *NOVO PEDIDO PIX!*

📦 Pedido: #${orderId.slice(0, 8)}
💰 Valor: ${formatCurrency(total)}
👤 Cliente: ${shippingData.name}
📱 Telefone: ${shippingData.phone}
📍 Cidade: ${shippingData.city}/${shippingData.state}

⏳ Aguardando confirmação do comprovante PIX.`;
    
    window.open(`https://wa.me/${pixConfig.admin_whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
  };

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
          payment_method: paymentMethod,
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
          notes: paymentMethod === 'pix' ? `Pagamento PIX - Aguardando confirmação manual` : null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Increment coupon usage if applied
      if (appliedCoupon) {
        await supabase
          .from('coupons')
          .update({ current_uses: appliedCoupon.current_uses + 1 })
          .eq('id', appliedCoupon.id);
      }

      // Create order items - only include product_id if it's a valid UUID
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

      // Generate payment link based on method
      let paymentLink = '';
      if (paymentMethod === 'asaas') {
        paymentLink = `https://sandbox.asaas.com/c/${order.id.slice(0, 8)}`;
        
        // Update order with payment link
        await supabase
          .from('orders')
          .update({ asaas_payment_link: paymentLink })
          .eq('id', order.id);
      }

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-order-confirmation', {
          body: {
            customerEmail: profile?.email || user?.email,
            customerName: shippingData.name,
            orderId: order.id,
            orderItems: cart.map(item => ({
              name: item.product.name,
              quantity: item.quantity,
              price: item.product.price * item.quantity,
            })),
            subtotal: getCartTotal(),
            discount: discountAmount,
            shipping: selectedShipping?.price || 0,
            total: getTotalWithShipping(),
            shippingAddress: `${shippingData.address}, ${shippingData.number}${shippingData.complement ? ` - ${shippingData.complement}` : ''} - ${shippingData.neighborhood}`,
            shippingCity: shippingData.city,
            shippingState: shippingData.state,
            shippingZip: shippingData.zip,
            paymentLink: paymentMethod === 'pix' ? 'PIX Manual' : paymentLink,
            paymentMethod,
            pixKey: paymentMethod === 'pix' ? pixConfig.pix_key : undefined,
          },
        });
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the order if email fails
      }

      // Send WhatsApp notification to admin for PIX orders
      if (paymentMethod === 'pix') {
        sendAdminNotification(order.id, getTotalWithShipping());
      }

      // Clear cart
      clearCart();

      setOrderResult({
        orderId: order.id,
        paymentLink,
        paymentMethod,
      });
      
      setStep('confirmation');
      
    } catch (error: any) {
      toast({
        title: 'Erro ao criar pedido',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
              {step === 'shipping' && 'Endereço de entrega'}
              {step === 'payment' && 'Pagamento'}
              {step === 'confirmation' && 'Pedido confirmado'}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
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
                                Pagamento instantâneo • Liberação imediata
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
                                Cartão / Boleto
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Via plataforma de pagamento
                              </p>
                            </div>
                          </div>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>
                )}

                <Button
                  className="w-full mt-6"
                  size="lg"
                  onClick={handleCreateOrder}
                  disabled={loading || !selectedShipping}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : paymentMethod === 'pix' ? (
                    <QrCode className="w-4 h-4 mr-2" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  {paymentMethod === 'pix' ? 'Finalizar e Ver PIX' : 'Ir para Pagamento'}
                </Button>
              </motion.div>
            )}

            {step === 'confirmation' && orderResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Pedido Criado!</h2>
                <p className="text-muted-foreground mb-6">
                  Pedido #{orderResult.orderId.slice(0, 8)}
                </p>
                
                {/* PIX Payment Instructions */}
                {orderResult.paymentMethod === 'pix' && (
                  <Card className="glass-card mb-6 text-left">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-primary">
                        <QrCode className="w-5 h-5" />
                        Pagamento via PIX
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted/30 border border-primary/20">
                        <p className="text-sm text-muted-foreground mb-2">Valor a pagar:</p>
                        <p className="text-3xl font-bold text-primary">{formatCurrency(getTotalWithShipping())}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Chave PIX ({getPixKeyTypeLabel()})</Label>
                        <div className="flex gap-2">
                          <Input 
                            value={pixConfig.pix_key} 
                            readOnly 
                            className="font-mono text-sm"
                          />
                          <Button
                            variant={pixCopied ? 'default' : 'outline'}
                            onClick={copyPixKey}
                            className="shrink-0"
                          >
                            {pixCopied ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">
                          <strong>Importante:</strong> Após o pagamento, envie o comprovante por WhatsApp para agilizar a liberação do seu pedido.
                        </p>
                      </div>
                      
                      <Button
                        className="w-full"
                        variant="hero"
                        onClick={() => {
                          const message = `Olá! Acabei de fazer o pedido #${orderResult.orderId.slice(0, 8)} e paguei via PIX. Segue comprovante:`;
                          window.open(`https://wa.me/${pixConfig.admin_whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
                        }}
                      >
                        Enviar Comprovante por WhatsApp
                      </Button>
                    </CardContent>
                  </Card>
                )}
                
                {/* Asaas Payment */}
                {orderResult.paymentMethod === 'asaas' && (
                  <Card className="glass-card mb-6">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground mb-4">
                        Clique no botão abaixo para efetuar o pagamento:
                      </p>
                      <Button
                        size="lg"
                        className="w-full"
                        onClick={() => window.open(orderResult.paymentLink, '_blank')}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pagar Agora
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Info about tracking */}
                <Card className="glass-card mb-6 text-left">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Acompanhe seu pedido</h3>
                        <p className="text-sm text-muted-foreground">
                          Todos os detalhes do seu pedido, incluindo status de pagamento, 
                          produção e código de rastreio, estão disponíveis no menu{' '}
                          <strong className="text-primary">Meus Pedidos</strong> do seu painel.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline" onClick={() => navigate('/meus-pedidos')}>
                    <Package className="w-4 h-4 mr-2" />
                    Ver Meus Pedidos
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/')}>
                    Voltar à Loja
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Order Summary */}
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
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frete</span>
                    <span className={selectedShipping?.price === 0 ? 'text-primary' : ''}>
                      {selectedShipping
                        ? selectedShipping.price === 0
                          ? 'Grátis'
                          : formatCurrency(selectedShipping.price)
                        : '-'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(getTotalWithShipping())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
