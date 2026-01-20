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
  Loader2
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

export default function Checkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { cart, getCartTotal, clearCart } = useCart();
  
  const [step, setStep] = useState<'shipping' | 'payment' | 'confirmation'>('shipping');
  const [loading, setLoading] = useState(false);
  const [loadingShipping, setLoadingShipping] = useState(false);
  
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
  
  // Order result
  const [orderResult, setOrderResult] = useState<{
    orderId: string;
    paymentLink: string;
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

  const getTotalWithShipping = () => {
    return getCartTotal() + (selectedShipping?.price || 0);
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

  const handleCreateOrder = async () => {
    if (!validateShipping()) return;
    
    setLoading(true);
    
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          total_amount: getTotalWithShipping(),
          status: 'pending',
          payment_status: 'pending',
          shipping_name: shippingData.name,
          shipping_phone: shippingData.phone,
          shipping_address: `${shippingData.address}, ${shippingData.number}${shippingData.complement ? ` - ${shippingData.complement}` : ''} - ${shippingData.neighborhood}`,
          shipping_city: shippingData.city,
          shipping_state: shippingData.state,
          shipping_zip: shippingData.zip,
          shipping_cost: selectedShipping?.price || 0,
          shipping_method: selectedShipping?.service,
        })
        .select()
        .single();

      if (orderError) throw orderError;

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

      // Generate payment link (placeholder - would integrate with Asaas)
      const paymentLink = `https://sandbox.asaas.com/c/${order.id.slice(0, 8)}`;
      
      // Update order with payment link
      await supabase
        .from('orders')
        .update({ asaas_payment_link: paymentLink })
        .eq('id', order.id);

      // Clear cart
      clearCart();

      setOrderResult({
        orderId: order.id,
        paymentLink,
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

                <Button
                  className="w-full mt-6"
                  size="lg"
                  onClick={handleCreateOrder}
                  disabled={loading || !selectedShipping}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Ir para Pagamento
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

                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Ir para Meus Pedidos
                </Button>
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
