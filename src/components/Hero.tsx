import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, MapPin, Smartphone } from "lucide-react";
import petTagProduct from "@/assets/pet-tag-product.png";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-radial-gradient" />
      <div className="absolute inset-0 bg-noise" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-glow-secondary/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="container relative z-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Tecnologia que salva vidas
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-tight mb-6"
          >
            Seu pet sempre{" "}
            <span className="text-gradient">seguro</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            Tags inteligentes com QR Code que enviam a localização do seu pet 
            diretamente para você. Porque cada segundo importa.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Button variant="hero" size="xl">
              Proteger Meu Pet
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="heroOutline" size="xl">
              Ver Como Funciona
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-8 md:gap-12"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-display font-bold">10k+</p>
                <p className="text-sm text-muted-foreground">Pets protegidos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-display font-bold">500+</p>
                <p className="text-sm text-muted-foreground">Pets encontrados</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-display font-bold">2s</p>
                <p className="text-sm text-muted-foreground">Tempo de alerta</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Floating product mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5, type: "spring" }}
          className="mt-16 relative"
        >
          <div className="relative max-w-lg mx-auto">
            {/* Glow effect behind product */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-glow-secondary/30 to-primary/30 blur-[60px] rounded-full" />
            
            {/* Product card */}
            <div className="relative glass rounded-3xl p-8 text-center float">
              <div className="w-48 h-48 mx-auto mb-4 flex items-center justify-center">
                <img 
                  src={petTagProduct} 
                  alt="Tag Pet Premium com QR Code" 
                  className="w-full h-full object-contain drop-shadow-[0_0_30px_hsl(var(--primary)/0.5)]"
                />
              </div>
              <h3 className="font-display font-bold text-lg mb-1">Tag Pet Premium</h3>
              <p className="text-muted-foreground text-sm mb-3">QR Code + Geolocalização</p>
              <div className="text-gradient text-2xl font-bold">R$ 59,90</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
