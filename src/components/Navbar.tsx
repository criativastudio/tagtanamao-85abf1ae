import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import logoHorizontal from "@/assets/logo-horizontal.png";
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    user,
    signOut,
    loading
  } = useAuth();
  const navLinks = [{
    name: "Produtos",
    href: "#produtos"
  }, {
    name: "Preços",
    href: "#precos"
  }, {
    name: "Como Funciona",
    href: "#como-funciona"
  }, {
    name: "FAQ",
    href: "#faq"
  }];
  return <motion.nav initial={{
    y: -100,
    opacity: 0
  }} animate={{
    y: 0,
    opacity: 1
  }} transition={{
    duration: 0.5
  }} className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-4 mt-4">
        <div className="glass-strong rounded-2xl">
          <div className="container flex items-center justify-between h-16 px-4">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img alt="Tag Tá Na Mão" className="h-8" src="/lovable-uploads/41ae8473-f8c8-4d65-bc07-a5d50110414b.png" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map(link => <a key={link.name} href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                  {link.name}
                </a>)}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              {loading ? <div className="w-20 h-10 bg-muted/50 animate-pulse rounded-lg" /> : user ? <>
                  <Link to="/dashboard">
                    <Button variant="ghost" size="sm">
                      <User className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => signOut()}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                </> : <>
                  <Link to="/auth">
                    <Button variant="ghost" size="sm">
                      Entrar
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button variant="glow" size="sm">
                      Começar Agora
                    </Button>
                  </Link>
                </>}
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-foreground">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isOpen && <motion.div initial={{
          opacity: 0,
          height: 0
        }} animate={{
          opacity: 1,
          height: "auto"
        }} exit={{
          opacity: 0,
          height: 0
        }} className="md:hidden border-t border-border/50">
              <div className="container py-4 px-4 space-y-4">
                {navLinks.map(link => <a key={link.name} href={link.href} onClick={() => setIsOpen(false)} className="block py-2 text-muted-foreground hover:text-foreground transition-colors">
                    {link.name}
                  </a>)}
                <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                  {user ? <>
                      <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full">
                          <User className="w-4 h-4 mr-2" />
                          Dashboard
                        </Button>
                      </Link>
                      <Button variant="ghost" className="w-full" onClick={() => {
                  signOut();
                  setIsOpen(false);
                }}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair
                      </Button>
                    </> : <>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full">
                          Entrar
                        </Button>
                      </Link>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>
                        <Button variant="glow" className="w-full">
                          Começar Agora
                        </Button>
                      </Link>
                    </>}
                </div>
              </div>
            </motion.div>}
        </div>
      </div>
    </motion.nav>;
};
export default Navbar;