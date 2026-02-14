import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Instagram, Facebook, MessageCircle, Music } from "lucide-react";
import logoHorizontal from "@/assets/logo-horizontal.png";

const Footer = () => {
  return (
    <footer className="relative py-16 border-t border-border/50">
      <div className="absolute inset-0 bg-secondary/20" />

      <div className="container relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4">
              <img src={logoHorizontal} alt="Tag Tá Na Mão" className="h-8" />
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Tecnologia que protege quem você ama. Tags e Displays inteligentes com QR Code.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/tagtanamao"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>

              <a
                href="https://www.facebook.com/tagtanamao"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>

              <a
                href="https://wa.me/556993248849"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
              </a>

              <a
                href="https://www.tiktok.com/@tagtanamao"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Music className="w-4 h-4" />
              </a>
            </div>
          </motion.div>

          {/* Products */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h4 className="font-display font-semibold mb-4">Produtos</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Tag Pet QR Code
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Display Empresas (Em breve)
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  NFC Cards (Em breve)
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  NFC Tags (Em breve)
                </a>
              </li>
            </ul>
          </motion.div>

          {/* Company */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h4 className="font-display font-semibold mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Sobre Nós
                </a>
              </li>
              <li>
                <a href="#como-funciona" className="hover:text-primary transition-colors">
                  Como Funciona
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-primary transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="https://docs.google.com/document/d/1bzHRh9K4rfDSOAvJJY4gU5YCcOL3o__7zjswGjFIdEs/edit?usp=sharing"
                  className="hover:text-primary transition-colors"
                >
                  Termos de Uso
                </a>
              </li>
              <li>
                <a
                  href="https://docs.google.com/document/d/1NL4yi0EuPbdHbhW24OsFqYFQ-Ahza8ILJKhtJMQrVfk/edit?usp=sharing"
                  className="hover:text-primary transition-colors"
                >
                  Política de Privacidade
                </a>
              </li>
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h4 className="font-display font-semibold mb-4">Contato</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <a href="mailto:contato@tagtanamao.com.br" className="hover:text-primary transition-colors">
                  contato@tagtanamao.com.br
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <a href="tel:+5569993248849" className="hover:text-primary transition-colors">
                  (69) 69 99324-8849
                </a>
                <a
                  href="https://wa.me/5569993248849"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors text-sm"
                ></a>
              </li>

              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span>Porto Velho, RO - Brasil</span>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2026 Tag Tá Na Mão. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">
              Termos
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Privacidade
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
