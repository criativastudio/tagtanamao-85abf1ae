import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const CTA = () => {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px]" />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Oferta por tempo limitado
          </div>

          <h2 className="text-4xl md:text-6xl font-display font-bold mb-6">
            Proteja seu pet <span className="text-gradient">agora</span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Não espere acontecer o pior. Com a Tag Pet QR Code, você tem a tranquilidade de saber que seu amigo pode
            voltar para casa.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button variant="hero" size="xl">
              Comprar com Desconto
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="heroOutline" size="xl">
              Falar no WhatsApp
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            ✓ Compra 100% Segura &nbsp;•&nbsp; ✓ Garantia 90 Dias &nbsp;•&nbsp; ✓ Suporte 24h
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
