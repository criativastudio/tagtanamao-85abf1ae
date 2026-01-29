import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Package, ArrowRight, Home, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThankYou() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("pedido");

  useEffect(() => {
    // Confetti effect on mount
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-radial-gradient" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-glow-secondary/10 rounded-full blur-[120px] animate-pulse" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/30 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
              y: (typeof window !== "undefined" ? window.innerHeight : 800) + 20,
            }}
            animate={{
              y: -20,
              x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-lg w-full"
      >
        <div className="glass-card p-8 md:p-12 rounded-3xl text-center space-y-6">
          {/* Success icon with glow */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="relative mx-auto w-24 h-24"
          >
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary to-glow-secondary flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-primary-foreground" />
            </div>
            <motion.div
              className="absolute -top-2 -right-2"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <Sparkles className="w-6 h-6 text-glow-secondary" />
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Obrigado pela compra!</h1>
            <p className="text-muted-foreground">Seu pedido foi recebido com sucesso.</p>
          </motion.div>

          {orderId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 rounded-xl bg-primary/10 border border-primary/20"
            >
              <p className="text-sm text-muted-foreground mb-1">Número do pedido</p>
              <p className="font-mono font-bold text-lg text-primary">#{orderId.slice(0, 8).toUpperCase()}</p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4 pt-4"
          >
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 text-left">
              <Package className="w-10 h-10 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium">Próximos passos</p>
                <p className="text-sm text-muted-foreground">
                  Você receberá um e-mail com a confirmação e os detalhes da entrega.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 pt-4"
          >
            <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>
              <Home className="w-4 h-4 mr-2" />
              Voltar ao início
            </Button>
            <Button className="flex-1" onClick={() => navigate("/dashboard")}>
              Ver meus produtos
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center gap-6 mt-8 text-muted-foreground text-sm"
        >
          <span>✓ Pagamento Seguro</span>
          <span>✓ Compra 100% Segura</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
