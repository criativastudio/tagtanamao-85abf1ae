import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Home, LayoutDashboard, Package, CreditCard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentSuccessOverlayProps {
  orderId: string;
  totalAmount: number;
  paymentMethod: 'pix' | 'asaas';
  estimatedDelivery?: string;
  paymentLink?: string;
  onNavigateDashboard: () => void;
  onNavigateHome: () => void;
}

// Floating particle component
const Particle = ({ delay, x, size }: { delay: number; x: number; size: number }) => (
  <motion.div
    className="absolute rounded-full bg-primary/40"
    style={{
      width: size,
      height: size,
      left: `${x}%`,
      bottom: -20,
    }}
    initial={{ y: 0, opacity: 0 }}
    animate={{
      y: -800,
      opacity: [0, 1, 1, 0],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      ease: 'easeOut',
    }}
  />
);

export default function PaymentSuccessOverlay({
  orderId,
  totalAmount,
  paymentMethod,
  estimatedDelivery,
  paymentLink,
  onNavigateDashboard,
  onNavigateHome,
}: PaymentSuccessOverlayProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => onNavigateDashboard(), 2500);
    return () => clearTimeout(timer);
  }, [onNavigateDashboard]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Generate random particles
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    delay: Math.random() * 3,
    x: Math.random() * 100,
    size: Math.random() * 8 + 4,
  }));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      >
        {/* Animated background */}
        <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" />
        
        {/* Radial gradient glow */}
        <div className="absolute inset-0 bg-radial-gradient opacity-50" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid opacity-20" />
        
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <Particle key={p.id} delay={p.delay} x={p.x} size={p.size} />
          ))}
        </div>

        {/* Main content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <div className="glass-strong rounded-2xl p-8 text-center border-primary/20">
            {/* Animated success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: 'spring', 
                stiffness: 200, 
                damping: 15,
                delay: 0.4 
              }}
              className="relative mx-auto mb-6"
            >
              {/* Outer glow ring */}
              <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full success-glow-pulse" />
              
              {/* Icon container */}
              <div className="relative w-24 h-24 mx-auto rounded-full gradient-border flex items-center justify-center bg-card">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 200, 
                    damping: 20,
                    delay: 0.6 
                  }}
                >
                  <Check className="w-12 h-12 text-primary" strokeWidth={3} />
                </motion.div>
              </div>
              
              {/* Sparkle effects */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-3xl font-bold mb-2 font-display"
            >
              <span className="text-gradient">
                {paymentMethod === 'pix' ? 'Pagamento Confirmado!' : 'Pedido Criado!'}
              </span>
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-muted-foreground mb-6"
            >
              Obrigado pela sua compra! 🎉
            </motion.p>

            {/* Order details card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="glass rounded-xl p-4 mb-6 text-left space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Pedido
                </span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  #{orderId.slice(0, 8).toUpperCase()}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Total
                </span>
                <span className="text-lg font-bold text-primary glow-text">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              
              {estimatedDelivery && (
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-sm text-muted-foreground">📦 Entrega estimada</span>
                  <span className="text-sm font-medium text-foreground">{estimatedDelivery}</span>
                </div>
              )}
            </motion.div>

            {/* Asaas payment link button */}
            {paymentMethod === 'asaas' && paymentLink && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mb-4"
              >
                <Button
                  size="lg"
                  variant="hero"
                  className="w-full glow-primary"
                  onClick={() => window.open(paymentLink, '_blank')}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pagar Agora
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Você será redirecionado para a página de pagamento seguro
                </p>
              </motion.div>
            )}

            {/* PIX success message */}
            {paymentMethod === 'pix' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mb-6 p-3 rounded-lg bg-primary/10 border border-primary/30"
              >
                <p className="text-sm text-primary flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  Pagamento PIX confirmado com sucesso!
                </p>
              </motion.div>
            )}

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="space-y-3"
            >
              <Button
                size="lg"
                variant="hero"
                className="w-full glow-primary"
                onClick={onNavigateDashboard}
              >
                <LayoutDashboard className="w-5 h-5 mr-2" />
                Minhas Compras
              </Button>
              
              <Button
                size="lg"
                variant="heroOutline"
                className="w-full"
                onClick={onNavigateHome}
              >
                <Home className="w-5 h-5 mr-2" />
                Voltar para Home
              </Button>
            </motion.div>

            {/* Footer message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="text-xs text-muted-foreground mt-6"
            >
              Redirecionando para <strong className="text-primary">Minhas Compras</strong>...
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
