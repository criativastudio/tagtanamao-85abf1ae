import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Package, MapPin, CreditCard, Truck, Loader2, Ticket, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { ShippingQuote } from "@/types/ecommerce";
import { Skeleton } from "@/components/ui/skeleton";
import CouponInput from "@/components/checkout/CouponInput";
import CPFInput from "@/components/checkout/CPFInput";
import CreditCardForm, { CardData } from "@/components/checkout/CreditCardForm";

import AsaasAwaitingPayment from "@/components/checkout/AsaasAwaitingPayment";
import PaymentSuccessOverlay from "@/components/checkout/PaymentSuccessOverlay";

interface AppliedCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_value: number | null;
  max_discount: number | null;
  max_uses: number | null;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
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

  const [step, setStep] = useState<"shipping" | "processing" | "awaiting_asaas" | "confirmation">(
    "shipping",
  );
  const [loading, setLoading] = useState(false);
  const [loadingShipping, setLoadingShipping] = useState(false);

  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  // Asaas payment data
  const [asaasPaymentData, setAsaasPaymentData] = useState<AsaasPaymentData | null>(null);
  const [asaasBillingType, setAsaasBillingType] = useState<"PIX" | "BOLETO" | "CREDIT_CARD">("PIX");
  const [customerCpfCnpj, setCustomerCpfCnpj] = useState("");
  const [isCpfValid, setIsCpfValid] = useState(false);

  // Credit card data
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [isCardValid, setIsCardValid] = useState(false);

  // Payment method
  const [paymentMethod] = useState<"asaas">("asaas");

  // Shipping form
  const [shippingData, setShippingData] = useState({
    name: profile?.full_name || "",
    phone: profile?.phone || "",
    zip: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  // Shipping quotes
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingQuote | null>(null);
  const [lastZipFetched, setLastZipFetched] = useState("");

  // Coupon
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Order result for non-PIX payments
  const [orderResult, setOrderResult] = useState<{
    orderId: string;
    paymentLink: string;
    paymentMethod: "pix" | "asaas";
  } | null>(null);

  // Polling state
  const [pollingCount, setPollingCount] = useState(0);
  const MAX_POLLING = 30;

  useEffect(() => {
    if (!user) {
      navigate("/auth?from=shop&redirect=/loja/checkout");
      return;
    }
    if (cart.length === 0 && step === "shipping") {
      navigate("/");
    }
  }, [user, cart, step]);

  useEffect(() => {
    if (profile) {
      setShippingData((prev) => ({
        ...prev,
        name: profile.full_name || prev.name,
        phone: profile.phone || prev.phone,
      }));
    }
  }, [profile]);


  const getTotalWithShipping = () => {
    return getCartTotal() - discountAmount + (selectedShipping?.price || 0);
  };

  const handleApplyCoupon = (coupon: AppliedCoupon | null, discount: number) => {
    setAppliedCoupon(coupon);
    setDiscountAmount(discount);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleZipInput = (value: string) => {
    setShippingData((prev) => ({ ...prev, zip: value }));

    const digits = value.replace(/\D/g, "");

    // quando completar CEP, busca automaticamente
    if (digits.length === 8) {
      handleZipBlur();
    }
  };

  const handleZipBlur = async () => {
    const digits = shippingData.zip.replace(/\D/g, "");
    if (digits.length !== 8 || digits === lastZipFetched) return;
    setLastZipFetched(digits);

    let data: any = null;

    try {
      // 1️⃣ tenta ViaCEP primeiro
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      data = await response.json();

      // se não encontrou, tenta BrasilAPI
      if (data.erro) {
        const backup = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`);
        const backupData = await backup.json();

        data = {
          logradouro: backupData.street,
          bairro: backupData.neighborhood,
          localidade: backupData.city,
          uf: backupData.state,
        };
      }

      if (!data) return;

      setShippingData((prev) => ({
        ...prev,
        address: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      }));

      const city = (data.localidade || "").trim().toLowerCase();
      const state = (data.uf || "").trim().toUpperCase();

      // Frete local
      if (state === "RO" && (city === "porto velho" || city === "jaru")) {
        const isJaru = city === "jaru";
        const local: ShippingQuote = {
          service: isJaru ? `Frete Grátis - ${data.localidade}` : `Entrega Local - ${data.localidade}`,
          carrier: "Entrega Local",
          price: isJaru ? 0 : 5.0,
          delivery_time: 2,
        };

        setShippingQuotes([local]);
        setSelectedShipping(local);
        return;
      }

      fetchShippingQuotesWithAddress(digits, data.localidade, data.uf);
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  const fetchShippingQuotesWithAddress = async (zip: string, city: string, state: string) => {
    setLoadingShipping(true);
    setShippingQuotes([]);
    setSelectedShipping(null);

    try {
      // Build products payload from cart
      const products = cart.map((item) => ({
        weight: (item.product as any).weight || 0.2,
        width: (item.product as any).width || 15,
        height: (item.product as any).height || 15,
        length: (item.product as any).length || 5,
        quantity: item.quantity,
        unitPrice: item.product.price,
        name: item.product.name,
      }));

      const { data, error } = await supabase.functions.invoke("melhor-envio", {
        body: { action: "quote", postalCode: zip, products },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erro ao calcular frete");

      if (data?.success && data?.quotes?.length > 0) {
        const allQuotes: ShippingQuote[] = data.quotes.map((q: any) => ({
          service: q.service,
          carrier: q.carrier,
          price: q.price,
          delivery_time: q.delivery_time,
          serviceCode: q.serviceCode,
          carrierPicture: q.carrierPicture,
        }));

        // Filtrar exatamente 3 opções: PAC, SEDEX, mais barata de outra transportadora
        const pac = allQuotes.find((q) => /pac/i.test(q.service));
        const sedex = allQuotes.find((q) => /sedex/i.test(q.service));
        const others = allQuotes.filter((q) => q !== pac && q !== sedex);
        const cheapestOther = others.sort((a, b) => a.price - b.price)[0];
        const filtered = [pac, sedex, cheapestOther].filter(Boolean) as ShippingQuote[];

        const quotes = filtered.length > 0 ? filtered : allQuotes.slice(0, 3);

        setShippingQuotes(quotes);
        setSelectedShipping(quotes[0]);
      } else {
        toast({
          title: "Nenhum frete disponível",
          description: "Não encontramos opções de frete para o CEP informado.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching shipping quotes:", error);
      toast({
        title: "Erro ao calcular frete",
        description: "Tente novamente ou verifique o CEP.",
        variant: "destructive",
      });
    } finally {
      setLoadingShipping(false);
    }
  };

  const validateShipping = () => {
    const required = ["name", "phone", "zip", "address", "number", "city", "state"];
    for (const field of required) {
      if (!shippingData[field as keyof typeof shippingData]) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha todos os campos de endereço.",
          variant: "destructive",
        });
        return false;
      }
    }
    if (!selectedShipping) {
      toast({
        title: "Selecione o frete",
        description: "Escolha uma opção de entrega.",
        variant: "destructive",
      });
      return false;
    }
    // Validate CPF/CNPJ for Asaas payments
    if (paymentMethod === "asaas") {
      if (!isCpfValid) {
        toast({
          title: "CPF/CNPJ inválido",
          description: "Informe um CPF ou CNPJ válido para continuar.",
          variant: "destructive",
        });
        return false;
      }
      // Validate card for credit card payment
      if (asaasBillingType === "CREDIT_CARD" && !isCardValid) {
        toast({
          title: "Dados do cartão inválidos",
          description: "Preencha corretamente os dados do cartão de crédito.",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
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
        .from("orders")
        .insert({
          user_id: user?.id,
          total_amount: getTotalWithShipping(),
          status: "pending",
          payment_status: "pending",
          payment_method: asaasBillingType.toLowerCase(),
          shipping_name: shippingData.name,
          shipping_phone: shippingData.phone,
          shipping_address: `${shippingData.address}, ${shippingData.number}${shippingData.complement ? ` - ${shippingData.complement}` : ""} - ${shippingData.neighborhood}`,
          shipping_city: shippingData.city,
          shipping_state: shippingData.state,
          shipping_zip: shippingData.zip,
          shipping_cost: selectedShipping?.price || 0,
          shipping_method: selectedShipping?.service,
          shipping_carrier: (selectedShipping as any)?.carrier || null,
          shipping_service_name: selectedShipping?.service || null,
          shipping_delivery_time: selectedShipping?.delivery_time || null,
          coupon_id: appliedCoupon?.id || null,
          discount_amount: discountAmount,
          notes: null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      setCurrentOrderId(order.id);

      // Increment coupon usage atomically if applied
      if (appliedCoupon) {
        const { data: couponResult, error: couponError } = await supabase.rpc("increment_coupon_usage", {
          coupon_uuid: appliedCoupon.id,
        });

        // Check if coupon usage failed (e.g., limit exceeded during race condition)
        if (couponError || !couponResult?.[0]?.success) {
          // Rollback the order since coupon is no longer valid
          await supabase.from("orders").delete().eq("id", order.id);
          throw new Error(couponResult?.[0]?.message || "Limite de uso do cupom foi excedido");
        }
      }

      // Create order items
      const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      const items = cart.map((item) => ({
        order_id: order.id,
        product_id: isValidUUID(item.product.id) ? item.product.id : null,
        quantity: item.quantity,
        unit_price: item.product.price,
      }));

      const { data: insertedItems, error: itemsError } = await supabase.from("order_items").insert(items).select();

      if (itemsError) throw itemsError;

      // Check if any item is a business_display product and create display_arts
      const displayItems = cart.filter(
        (item) => (item.product as any).type === "business_display" || (item.product as any).type === "display",
      );

      if (displayItems.length > 0 && insertedItems) {
        for (const dItem of displayItems) {
          const matchingOrderItem = insertedItems.find(
            (oi: any) => oi.product_id === dItem.product.id || (!oi.product_id && !isValidUUID(dItem.product.id)),
          );
          await supabase.from("display_arts").insert({
            order_id: order.id,
            order_item_id: matchingOrderItem?.id || null,
            user_id: user?.id,
          });
        }

        // Update order status to awaiting_customization
        await supabase.from("orders").update({ status: "awaiting_customization" }).eq("id", order.id);
      }

      if (asaasBillingType === "CREDIT_CARD" && cardData) {
        // Credit card transparent checkout
        setStep("processing");

        const { data: session } = await supabase.auth.getSession();

        const { data: cardResult, error: cardError } = await supabase.functions.invoke("process-credit-card-payment", {
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
            complement: shippingData.complement || "",
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
          throw new Error(cardError.message || "Erro ao processar pagamento");
        }

        if (cardResult?.success) {
          clearCart();

          const payStatus = String(cardResult.payment?.status || cardResult.status || "").toUpperCase();
          const mapped = String(cardResult.mappedPaymentStatus || "").toLowerCase();
          const isApproved = ["CONFIRMED", "RECEIVED"].includes(payStatus) || mapped === "confirmed";
          const isPending = payStatus === "PENDING" || mapped === "pending";

          if (isApproved) {
            toast({
              title: "Pagamento aprovado!",
              description: "Seu pedido foi confirmado com sucesso.",
            });
            navigate('/meus-pedidos');
          } else if (isPending) {
            pollPaymentStatus(cardResult.payment?.id, order.id);
          } else {
            throw new Error("Pagamento recusado. Tente outro cartão.");
          }
        } else {
          throw new Error(cardResult?.error || "Erro ao processar pagamento");
        }
      } else {
        // For Asaas PIX/Boleto - create payment via API
        const { data: session } = await supabase.auth.getSession();

        const { data: asaasResult, error: asaasError } = await supabase.functions.invoke("asaas-payment", {
          body: {
            orderId: order.id,
            amount: getTotalWithShipping(),
            customerName: shippingData.name,
            customerEmail: profile?.email || user?.email,
            customerPhone: shippingData.phone,
            customerCpfCnpj: customerCpfCnpj.replace(/\D/g, ""),
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
          if (asaasBillingType === "PIX" && asaasResult.payment.pixQrCode) {
            setStep("awaiting_asaas");
          } else {
            // For boleto, redirect to payment link
            setOrderResult({
              orderId: order.id,
              paymentLink: asaasResult.payment.invoiceUrl,
              paymentMethod: "asaas",
            });
            setStep("confirmation");
          }
        } else {
          throw new Error("Erro ao criar cobrança");
        }
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      setStep("shipping");
      toast({
        title: "Erro ao processar pedido",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentId: string, orderId: string) => {
    if (pollingCount >= MAX_POLLING) {
      toast({
        title: "Tempo esgotado",
        description: "Não foi possível confirmar o pagamento. Verifique seu pedido no dashboard.",
        variant: "destructive",
      });
      setStep("confirmation");
      setOrderResult({
        orderId,
        paymentLink: "",
        paymentMethod: "asaas",
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
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      if (result.status === "CONFIRMED" || result.status === "RECEIVED") {
        toast({
          title: "Pagamento confirmado!",
          description: "Seu pedido foi processado com sucesso.",
        });
        navigate('/meus-pedidos');
      } else if (result.status === "PENDING") {
        setPollingCount((prev) => prev + 1);
        setTimeout(() => pollPaymentStatus(paymentId, orderId), 2000);
      } else {
        // Payment failed
        toast({
          title: "Pagamento não aprovado",
          description: "Verifique os dados do cartão e tente novamente.",
          variant: "destructive",
        });
        setStep("shipping");
      }
    } catch (error) {
      console.error("Error polling payment status:", error);
      setPollingCount((prev) => prev + 1);
      setTimeout(() => pollPaymentStatus(paymentId, orderId), 2000);
    }
  };

  const handlePaymentConfirmed = () => {
    navigate('/meus-pedidos');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/loja")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Checkout</h1>
            <p className="text-sm text-muted-foreground">
              {step === "shipping" && "Endereço e pagamento"}
              {step === "processing" && "Processando pagamento..."}
              
              {step === "awaiting_asaas" && "Aguardando pagamento"}
              {step === "confirmation" && "Pedido confirmado"}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Processing state */}
            {step === "processing" && (
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

            {step === "shipping" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                          onChange={(e) => setShippingData((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Seu nome"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={shippingData.phone}
                          onChange={(e) => setShippingData((prev) => ({ ...prev, phone: e.target.value }))}
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
                          onChange={(e) => handleZipInput(e.target.value)}
                          onBlur={handleZipBlur}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">Endereço</Label>
                        <Input
                          id="address"
                          value={shippingData.address}
                          onChange={(e) => setShippingData((prev) => ({ ...prev, address: e.target.value }))}
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
                          onChange={(e) => setShippingData((prev) => ({ ...prev, number: e.target.value }))}
                          placeholder="123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="complement">Complemento</Label>
                        <Input
                          id="complement"
                          value={shippingData.complement}
                          onChange={(e) => setShippingData((prev) => ({ ...prev, complement: e.target.value }))}
                          placeholder="Apto 101"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input
                          id="neighborhood"
                          value={shippingData.neighborhood}
                          onChange={(e) => setShippingData((prev) => ({ ...prev, neighborhood: e.target.value }))}
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
                          onChange={(e) => setShippingData((prev) => ({ ...prev, city: e.target.value }))}
                          placeholder="Cidade"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado</Label>
                        <Input
                          id="state"
                          value={shippingData.state}
                          onChange={(e) => setShippingData((prev) => ({ ...prev, state: e.target.value }))}
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Options */}
                {shippingData.zip.replace(/\D/g, "").length === 8 && (
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
                          value={selectedShipping?.service || ""}
                          onValueChange={(value) => {
                            const quote = shippingQuotes.find((q) => q.service === value);
                            setSelectedShipping(quote || null);
                          }}
                        >
                          {shippingQuotes.map((quote) => (
                            <div
                              key={quote.service}
                              className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                                selectedShipping?.service === quote.service
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              }`}
                              onClick={() => setSelectedShipping(quote)}
                            >
                              <div className="flex items-center gap-3">
                                <RadioGroupItem value={quote.service} id={quote.service} />
                                <div>
                                  <p className="font-medium">
                                    {quote.carrier === "Entrega Local" ? quote.service : `${quote.service}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground/70">{quote.carrier}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Entrega em até {quote.delivery_time} dias úteis
                                  </p>
                                </div>
                              </div>
                              <span className={`font-semibold ${quote.price === 0 ? "text-primary" : ""}`}>
                                {quote.price === 0 ? "Grátis" : formatCurrency(quote.price)}
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
                      {/* Asaas payment - single option, no radio needed */}

                      {/* Asaas Options */}
                      {(
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
                              onValueChange={(value) => setAsaasBillingType(value as "PIX" | "BOLETO" | "CREDIT_CARD")}
                              className="grid grid-cols-3 gap-2"
                            >
                              <div
                                className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                  asaasBillingType === "PIX"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => setAsaasBillingType("PIX")}
                              >
                                <RadioGroupItem value="PIX" id="asaas-pix" className="sr-only" />
                                <QrCode className="w-5 h-5 mb-1" />
                                <span className="text-xs">PIX</span>
                              </div>
                              <div
                                className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                  asaasBillingType === "BOLETO"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => setAsaasBillingType("BOLETO")}
                              >
                                <RadioGroupItem value="BOLETO" id="asaas-boleto" className="sr-only" />
                                <Ticket className="w-5 h-5 mb-1" />
                                <span className="text-xs">Boleto</span>
                              </div>
                              <div
                                className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                  asaasBillingType === "CREDIT_CARD"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => setAsaasBillingType("CREDIT_CARD")}
                              >
                                <RadioGroupItem value="CREDIT_CARD" id="asaas-card" className="sr-only" />
                                <CreditCard className="w-5 h-5 mb-1" />
                                <span className="text-xs">Cartão</span>
                              </div>
                            </RadioGroup>
                          </div>

                          {/* Credit Card Form - Transparent Checkout */}
                          {asaasBillingType === "CREDIT_CARD" && (
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
                  disabled={
                    loading ||
                    !selectedShipping ||
                    !isCpfValid ||
                    (asaasBillingType === "CREDIT_CARD" && !isCardValid)
                  }
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : asaasBillingType === "CREDIT_CARD" ? (
                    <CreditCard className="w-4 h-4 mr-2" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  {asaasBillingType === "CREDIT_CARD"
                    ? "Pagar com Cartão"
                    : "Ir para Pagamento"}
                </Button>
              </motion.div>
            )}


            {step === "awaiting_asaas" && asaasPaymentData && currentOrderId && (
              <AsaasAwaitingPayment
                asaasPayment={asaasPaymentData}
                orderId={currentOrderId}
                onPaymentConfirmed={handlePaymentConfirmed}
              />
            )}

            {step === "confirmation" && orderResult && (
              <PaymentSuccessOverlay
                orderId={orderResult.orderId}
                totalAmount={getTotalWithShipping()}
                paymentMethod={orderResult.paymentMethod}
                estimatedDelivery={
                  selectedShipping?.delivery_time ? `${selectedShipping.delivery_time} dias úteis` : undefined
                }
                paymentLink={orderResult.paymentLink || undefined}
                onNavigateDashboard={() => navigate("/meus-pedidos")}
                onNavigateHome={() => navigate("/")}
              />
            )}
          </div>

          {/* Order Summary */}
          {step === "shipping" && (
            <div className="lg:col-span-1">
              <Card className="glass-card sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Resumo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart.map((item) => (
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
                        <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(item.product.price * item.quantity)}</span>
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
                        <span className={selectedShipping.price === 0 ? "text-primary" : ""}>
                          {selectedShipping.price === 0 ? "Grátis" : formatCurrency(selectedShipping.price)}
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
