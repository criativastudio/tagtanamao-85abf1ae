import { motion } from "framer-motion";
import { useState } from "react";
import { Menu, X, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Produtos", href: "#produtos" },
    { name: "Preços", href: "#precos" },
    { name: "Como Funciona", href: "#como-funciona" },
    { name: "FAQ", href: "#faq" },
  ];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-4 mt-4">
        <div className="glass-strong rounded-2xl">
          <div className="container flex items-center justify-between h-16 px-4">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-glow-secondary flex items-center justify-center">
                <QrCode className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">QRPet</span>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {link.name}
                </a>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
              <Button variant="glow" size="sm">
                Começar Agora
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-foreground"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border/50"
            >
              <div className="container py-4 px-4 space-y-4">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </a>
                ))}
                <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                  <Button variant="outline" className="w-full">
                    Entrar
                  </Button>
                  <Button variant="glow" className="w-full">
                    Começar Agora
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
