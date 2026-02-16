import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Copy, CheckCircle2, Loader2, Clock, AlertCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PixPaymentData {
  id: string;
  pixKey: string;
  transactionId: string;
  amount: number;
  expiresAt: string;
}

interface PixAwaitingPaymentProps {
  pixPayment: PixPaymentData;
  orderId: string;
  adminWhatsapp: string;
  onPaymentConfirmed: () => void;
}

export default function PixAwaitingPayment({
  pixPayment,
  orderId,
  adminWhatsapp,
  onPaymentConfirmed,
}: PixAwaitingPaymentProps) {
  const { toast } = useToast();
  const [pixCopied, setPixCopied] = useState(false);
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'expired'>('pending');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const isConfirmedStatus = (value?: string | null) =>
    ['confirmed', 'paid', 'payment_confirmed'].includes((value ?? '').toLowerCase());

  const handlePaymentConfirmed = useCallback(() => {
    if (status === 'confirmed') return;
    setStatus('confirmed');
    toast({
      title: '🎉 Pagamento Confirmado!',
      description: 'Seu pagamento PIX foi confirmado com sucesso.',
    });
    setTimeout(onPaymentConfirmed, 2000);
  }, [status, toast, onPaymentConfirmed]);

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

  const orderCode = orderId ? orderId.slice(0, 8) : '---';

  // Countdown timer
  useEffect(() => {
    const expiresAt = new Date(pixPayment.expiresAt).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        setStatus('expired');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [pixPayment.expiresAt]);

  // Real-time subscription for payment confirmation
  useEffect(() => {
    console.log('Setting up realtime subscription for PIX payment:', pixPayment.id);
    
    const channel = supabase
      .channel(`pix-payment-${pixPayment.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pix_payments',
          filter: `id=eq.${pixPayment.id}`,
        },
        (payload) => {
          console.log('PIX payment updated:', payload);
          if (payload.new && isConfirmedStatus((payload.new as any).status)) {
            handlePaymentConfirmed();
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Unsubscribing from PIX payment channel');
      supabase.removeChannel(channel);
    };
  }, [pixPayment.id, handlePaymentConfirmed]);

  // Polling fallback every 5 seconds
  useEffect(() => {
    if (status !== 'pending') return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('payment_status, status')
        .eq('id', orderId)
        .maybeSingle();

      if (isConfirmedStatus(data?.payment_status) || isConfirmedStatus(data?.status)) {
        handlePaymentConfirmed();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId, status, handlePaymentConfirmed]);

  const copyPixKey = () => {
    navigator.clipboard.writeText(pixPayment.pixKey);
    setPixCopied(true);
    toast({
      title: 'Chave PIX copiada!',
      description: 'Cole no app do seu banco para pagar.',
    });
    setTimeout(() => setPixCopied(false), 3000);
  };

  const sendWhatsAppReceipt = () => {
    const message = `Olá! Acabei de fazer o pagamento PIX do pedido #${orderCode}.

💰 Valor: ${formatCurrency(pixPayment.amount)}
🔑 ID da Transação: ${pixPayment.transactionId}

Segue o comprovante em anexo.`;
    
    window.open(`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (status === 'confirmed') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-primary">Pagamento Confirmado!</h2>
        <p className="text-muted-foreground mb-6">
          Seu pagamento foi processado com sucesso. Redirecionando...
        </p>
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
      </motion.div>
    );
  }

  if (status === 'expired') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-12 h-12 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-destructive">PIX Expirado</h2>
        <p className="text-muted-foreground mb-6">
          O tempo para pagamento expirou. Por favor, tente novamente.
        </p>
        <Button onClick={() => window.location.reload()}>
          Gerar Novo PIX
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <QrCode className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Aguardando Pagamento PIX</h2>
        <p className="text-muted-foreground">
          Pedido #{orderCode}
        </p>
      </div>

      {/* Timer */}
      <Card className="glass-card border-primary/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-3 text-center">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Tempo restante</p>
              <p className={`text-3xl font-mono font-bold ${timeLeft < 300 ? 'text-destructive' : 'text-primary'}`}>
                {formatTime(timeLeft)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amount */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Valor a pagar:</p>
            <p className="text-4xl font-bold text-primary">{formatCurrency(pixPayment.amount)}</p>
          </div>
        </CardContent>
      </Card>

      {/* PIX Key */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <QrCode className="w-5 h-5 text-primary" />
            Chave PIX (Copia e Cola)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Chave Aleatória</Label>
            <div className="flex gap-2">
              <Input
                value={pixPayment.pixKey}
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

          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground">
              <strong>ID da Transação:</strong> {pixPayment.transactionId}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="glass-card border-yellow-500/30">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">1</span>
              Copie a chave PIX acima
            </h3>
            <h3 className="font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">2</span>
              Abra o app do seu banco
            </h3>
            <h3 className="font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">3</span>
              Escolha a opção PIX Copia e Cola
            </h3>
            <h3 className="font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">4</span>
              Cole a chave e confirme o pagamento
            </h3>
          </div>
        </CardContent>
      </Card>

      {/* Loading indicator */}
      <div className="flex items-center justify-center gap-3 py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Monitorando confirmação do pagamento...
        </p>
      </div>

      {/* WhatsApp button */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Após pagar, envie o comprovante para agilizar a confirmação:
          </p>
          <Button
            className="w-full"
            variant="hero"
            onClick={sendWhatsAppReceipt}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Enviar Comprovante por WhatsApp
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
