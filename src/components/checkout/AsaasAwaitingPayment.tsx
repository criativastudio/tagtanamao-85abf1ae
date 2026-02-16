import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ExternalLink, Loader2, Clock, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

interface AsaasAwaitingPaymentProps {
  asaasPayment: AsaasPaymentData;
  orderId: string;
  onPaymentConfirmed: () => void;
}

export default function AsaasAwaitingPayment({
  asaasPayment,
  orderId,
  onPaymentConfirmed,
}: AsaasAwaitingPaymentProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'expired'>('pending');
  const [pixCopied, setPixCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Calculate time left if PIX
  useEffect(() => {
    if (asaasPayment.pixQrCode?.expirationDate) {
      const expirationTime = new Date(asaasPayment.pixQrCode.expirationDate).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((expirationTime - now) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          setStatus('expired');
        }
      };
      updateTimer();
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    }
  }, [asaasPayment.pixQrCode?.expirationDate]);

  const handlePaymentConfirmed = useCallback(() => {
    if (status === 'confirmed') return;
    setStatus('confirmed');
    toast({
      title: '🎉 Pagamento Confirmado!',
      description: 'Seu pagamento foi confirmado com sucesso.',
    });
    setTimeout(onPaymentConfirmed, 2000);
  }, [status, toast, onPaymentConfirmed]);

  // Real-time subscription for payment confirmation via order updates
  useEffect(() => {
    console.log('Setting up realtime subscriptions for Asaas payment, order:', orderId);

    const channel = supabase
      .channel(`asaas-order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Order updated:', payload);
          const newData = payload.new as any;
          if (newData?.payment_status === 'confirmed' || newData?.status === 'paid') {
            handlePaymentConfirmed();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Payment updated:', payload);
          const newData = payload.new as any;
          if (newData?.status === 'confirmed' || newData?.status === 'paid') {
            handlePaymentConfirmed();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, handlePaymentConfirmed]);

  // Polling fallback every 5 seconds
  useEffect(() => {
    if (status !== 'pending') return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('payment_status, status')
        .eq('id', orderId)
        .maybeSingle();

      if (data?.payment_status === 'confirmed' || data?.status === 'paid') {
        handlePaymentConfirmed();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId, status, handlePaymentConfirmed]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyPixCode = async () => {
    if (!asaasPayment.pixQrCode?.payload) return;
    
    try {
      await navigator.clipboard.writeText(asaasPayment.pixQrCode.payload);
      setPixCopied(true);
      toast({
        title: 'Código copiado!',
        description: 'Cole no app do seu banco para pagar.',
      });
      setTimeout(() => setPixCopied(false), 3000);
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Tente selecionar e copiar manualmente.',
        variant: 'destructive',
      });
    }
  };

  // Confirmed state
  if (status === 'confirmed') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Pagamento Confirmado!</h2>
        <p className="text-muted-foreground mb-6">Redirecionando...</p>
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
      </motion.div>
    );
  }

  // Expired state
  if (status === 'expired') {
    return (
      <Card className="glass-card">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Pagamento Expirado</h2>
          <p className="text-muted-foreground mb-6">
            O tempo para pagamento expirou. Você pode acessar seu pedido para gerar uma nova cobrança.
          </p>
          <Button onClick={() => window.location.reload()}>
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Main waiting UI with QR Code
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="glass-card overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-2xl font-mono font-bold text-primary">
              {formatTime(timeLeft)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Tempo restante para pagamento</p>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* QR Code */}
          {asaasPayment.pixQrCode && (
            <div className="text-center">
              <h3 className="font-semibold mb-4 flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5" />
                Escaneie o QR Code
              </h3>
              <div className="bg-white p-4 rounded-xl inline-block mb-4">
                <img
                  src={`data:image/png;base64,${asaasPayment.pixQrCode.encodedImage}`}
                  alt="QR Code PIX"
                  className="w-48 h-48"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Abra o app do seu banco e escaneie o código acima
              </p>
            </div>
          )}

          {/* Copy PIX Code */}
          {asaasPayment.pixQrCode?.payload && (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Ou copie o código PIX Copia e Cola:
              </p>
              <div className="bg-muted/50 rounded-lg p-3 break-all text-sm font-mono max-h-24 overflow-y-auto">
                {asaasPayment.pixQrCode.payload}
              </div>
              <Button
                className="w-full"
                variant={pixCopied ? 'outline' : 'default'}
                onClick={copyPixCode}
              >
                {pixCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Código Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Código PIX
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Link to invoice */}
          <div className="pt-4 border-t border-border">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(asaasPayment.invoiceUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Página de Pagamento
            </Button>
          </div>

          {/* Loading indicator */}
          <div className="flex items-center justify-center gap-3 text-muted-foreground pt-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Aguardando confirmação do pagamento...</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
