import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/ecommerce";

const Products = () => {
  const navigate = useNavigate();
  const { addToCart, getCartCount } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery({
    queryKey: ["landing-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
  });

  const handleAddToCart = (product: Product) => {
    if (!user) {
      toast({
        title: "Faça login para continuar",
        description: "Você precisa estar logado para adicionar produtos ao carrinho.",
      });
      navigate("/auth?redirect=/loja/checkout");
      return;
    }
    addToCart(product);
    toast({
      title: "Adicionado ao carrinho!",
      description: (
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-primary" />
          <span>{product.name}</span>
        </div>
      ),
    });
  };

  const handleBuyNow = (product: Product) => {
    if (!user) {
      // Save product to cart for after login
      addToCart(product);
      toast({
        title: "Faça login para continuar",
        description: "Você precisa estar logado para finalizar a compra.",
      });
      navigate("/auth?redirect=/loja/checkout");
      return;
    }
    addToCart(product);
    navigate("/loja/checkout");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

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

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <div className="relative h-full p-6 rounded-3xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-[0_0_60px_hsl(var(--primary)/0.15)] overflow-hidden flex flex-col">
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-glow-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10 flex flex-col h-full">
                    {/* Product Image */}
                    {product.image_url && (
                      <div className="w-50 h-50 mb-4 mx-auto">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover drop-shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                        />
                      </div>
                    )}

                    {/* Badge based on type */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4 w-fit ${
                        product.type === "pet_tag"
                          ? "bg-primary/10 text-primary"
                          : "bg-glow-secondary/10 text-glow-secondary"
                      }`}
                    >
                      {product.type === "pet_tag" ? "Para Pets" : "Para Empresas"}
                    </div>

                    <h3 className="text-xl font-display font-bold mb-2">{product.name}</h3>
                    <p className="text-muted-foreground text-sm mb-6 flex-grow">{product.description}</p>

                    <div className="flex items-center justify-between mt-auto">
                      <div>
                        <p className="text-2xl font-display font-bold text-gradient">{formatCurrency(product.price)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleAddToCart(product)}>
                          <ShoppingCart className="w-4 h-4" />
                        </Button>
                        <Button variant="hero" onClick={() => handleBuyNow(product)}>
                          Comprar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
          </div>
        )}

        {/* Cart indicator */}
        {getCartCount() > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-7 right-16 z-50"
          >
            <Button
              size="lg"
              className="rounded-full shadow-lg glow-primary"
              onClick={() => navigate("/loja/checkout")}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Carrinho ({getCartCount()})
            </Button>
          </motion.div>
        )}

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
