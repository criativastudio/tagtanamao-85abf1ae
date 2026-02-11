import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Plus, Minus, ArrowRight, Package, Truck, CreditCard, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Product } from "@/types/ecommerce";

interface CartItem {
  product: Product;
  quantity: number;
}

export default function Shop() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [lightboxData, setLightboxData] = useState<{ images: string[]; index: number; name: string } | null>(null);

  useEffect(() => {
    fetchProducts();
    loadCartFromStorage();
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProducts(data || []);
    }

    setLoadingProducts(false);
  };

  const loadCartFromStorage = () => {
    const saved = localStorage.getItem("qrpet-cart");
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch {
        // Invalid cart data
      }
    }
  };

  const saveCartToStorage = (newCart: CartItem[]) => {
    localStorage.setItem("qrpet-cart", JSON.stringify(newCart));
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      let newCart;

      if (existing) {
        newCart = prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      } else {
        newCart = [...prev, { product, quantity: 1 }];
      }

      saveCartToStorage(newCart);
      return newCart;
    });

    toast({
      title: "Adicionado ao carrinho",
      description: product.name,
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const newCart = prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);

      saveCartToStorage(newCart);
      return newCart;
    });
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const handleCheckout = () => {
    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para finalizar a compra.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    navigate("/loja/checkout");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">QRPet Shop</span>
          </div>

          <Button variant="outline" className="relative" onClick={() => setShowCart(!showCart)}>
            <ShoppingCart className="w-5 h-5" />
            {getCartCount() > 0 && (
              <Badge className="absolute -top-2 -right-2 px-2 py-0.5 text-xs">{getCartCount()}</Badge>
            )}
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Tags QR Premium para seu <span className="text-gradient">Pet</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Proteja seu melhor amigo com tecnologia de ponta. QR Codes dinâmicos com localização em tempo real.
          </p>
        </motion.div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Truck, title: "Frete Grátis", desc: "Em todo o Brasil" },
            { icon: CreditCard, title: "Pagamento Seguro", desc: "PIX, Boleto ou Cartão" },
            { icon: Check, title: "Garantia 1 Ano", desc: "Material Premium" },
          ].map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6 rounded-xl text-center"
            >
              <benefit.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold text-foreground">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">{benefit.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Products Grid */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6">Nossos Produtos</h2>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Em breve!</h2>
                <p className="text-muted-foreground">Novos produtos sendo adicionados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="glass-card overflow-hidden h-full flex flex-col">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {product.description || "Produto premium QRPet"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        {product.image_url ? (
                          <div
                            className="cursor-pointer"
                            onClick={() => {
                              const allImages = [product.image_url!, ...(product.gallery_images || [])];
                              setLightboxData({ images: allImages, index: 0, name: product.name });
                            }}
                          >
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-48 object-cover rounded-lg bg-muted hover:opacity-90 transition-opacity"
                            />
                            {product.gallery_images && product.gallery_images.length > 0 && (
                              <p className="text-xs text-muted-foreground text-center mt-1">
                                +{product.gallery_images.length} fotos
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-48 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <Package className="w-16 h-16 text-primary/50" />
                          </div>
                        )}
                        <div className="mt-4">
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {product.type === "pet_tag" ? "Tag Pet" : "Display"}
                          </span>
                        </div>
                      </CardContent>
                      <CardFooter className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">{formatCurrency(product.price)}</span>
                        <Button onClick={() => addToCart(product)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Sidebar */}
          {showCart && cart.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:w-80">
              <div className="glass-card rounded-xl p-6 sticky top-24">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Carrinho
                </h3>

                <div className="space-y-4 mb-6">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        {item.product.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.product.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(getCartTotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frete</span>
                    <span className="text-primary">Grátis</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(getCartTotal())}</span>
                  </div>
                </div>

                <Button className="w-full mt-6" size="lg" onClick={handleCheckout}>
                  Finalizar Compra
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
            onClick={() => setLightboxData(null)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxData(null); }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            {lightboxData.images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxData(prev => prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null); }}
                  className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxData(prev => prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null); }}
                  className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </>
            )}
            <motion.img
              key={lightboxData.index}
              src={lightboxData.images[lightboxData.index]}
              alt={lightboxData.name}
              className="max-w-full max-h-[85vh] rounded-xl object-contain"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            />
            {lightboxData.images.length > 1 && (
              <div className="absolute bottom-6 flex gap-2">
                {lightboxData.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setLightboxData(prev => prev ? { ...prev, index: i } : null); }}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${i === lightboxData.index ? 'bg-white' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
