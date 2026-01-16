import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Building2, QrCode, Star, Instagram, MessageCircle, CreditCard, Calendar, MapPin } from "lucide-react";
import petTagProduct from "@/assets/pet-tag-product.png";
import displayQrProduct from "@/assets/display-qr-product.png";

const Products = () => {
  return (
    <section id="produtos" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-grid opacity-20" />
      
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Nossos Produtos
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Soluções <span className="text-gradient">inteligentes</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Para pets e empresas. Tecnologia QR Code que conecta.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Pet Tag Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="group"
          >
            <div className="relative h-full p-8 rounded-3xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-[0_0_60px_hsl(var(--primary)/0.15)] overflow-hidden">
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-glow-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                {/* Product Image */}
                <div className="w-32 h-32 mb-4 mx-auto">
                  <img 
                    src={petTagProduct} 
                    alt="Tag Pet QR Code" 
                    className="w-full h-full object-contain drop-shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                  />
                </div>
                
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                  <Star className="w-3 h-3 fill-current" />
                  Mais Vendido
                </div>
                
                <h3 className="text-2xl font-display font-bold mb-2">Tag Pet QR Code</h3>
                <p className="text-muted-foreground mb-6">
                  Tag premium para coleira do seu pet com QR Code exclusivo. Receba a localização 
                  instantaneamente quando alguém escanear.
                </p>
                
                {/* Features list */}
                <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Página personalizada do pet
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Geolocalização automática
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Notificações WhatsApp
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Material resistente à água
                  </li>
                </ul>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground text-sm line-through">R$ 79,90</span>
                    <p className="text-3xl font-display font-bold text-gradient">R$ 59,90</p>
                  </div>
                  <Button variant="hero">Comprar</Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Display QR Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="group"
          >
            <div className="relative h-full p-8 rounded-3xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-[0_0_60px_hsl(var(--primary)/0.15)] overflow-hidden">
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-glow-secondary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                {/* Product Image */}
                <div className="w-32 h-32 mb-4 mx-auto">
                  <img 
                    src={displayQrProduct} 
                    alt="Display QR Code para Empresas" 
                    className="w-full h-full object-contain drop-shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                  />
                </div>
                
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-glow-secondary/10 text-glow-secondary text-xs font-medium mb-4">
                  Para Empresas
                </div>
                
                <h3 className="text-2xl font-display font-bold mb-2">Display QR Code</h3>
                <p className="text-muted-foreground mb-6">
                  Display de acrílico elegante para balcão. Landing page completa da sua empresa 
                  com todos os links e ações importantes.
                </p>
                
                {/* Action buttons preview */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs">
                    <Instagram className="w-3 h-3" />
                    Redes Sociais
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs">
                    <MessageCircle className="w-3 h-3" />
                    WhatsApp
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs">
                    <CreditCard className="w-3 h-3" />
                    Pagar Pix
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs">
                    <Calendar className="w-3 h-3" />
                    Agendar
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs">
                    <Star className="w-3 h-3" />
                    Avaliações
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs">
                    <MapPin className="w-3 h-3" />
                    Localização
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground text-sm line-through">R$ 149,90</span>
                    <p className="text-3xl font-display font-bold text-gradient">R$ 99,90</p>
                  </div>
                  <Button variant="hero">Comprar</Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Coming soon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-muted-foreground text-sm">
            <span className="w-2 h-2 rounded-full bg-glow-secondary animate-pulse" />
            Em breve: NFC Cards & NFC Tags para Celular
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Products;
