import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/types/ecommerce";

const pricingPlans = [
  {
    name: "1 Tag Pet",
    price: "59,90",
    originalPrice: "79,90",
    description: "Perfeito para quem tem um pet",
    features: [
      "1 Tag Pet QR Code Premium",
      "Página personalizada do pet",
      "Geolocalização (enviada mediante autorização de quem escaneia o QR Code)",
      "Notificações via WhatsApp",
      "Gestão via painel",
      "Suporte prioritário",
    ],
    popular: false,
  },
  {
    name: "2 Tags Pet",
    price: "99,90",
    originalPrice: "159,80",
    description: "Ideal para famílias com 2 pets",
    features: [
      "2 Tags Pet QR Code Premium",
      "Páginas personalizadas",
      "Geolocalização (enviada mediante autorização de quem escaneia o QR Code)",
      "Notificação via WhatsApp",
      "Gestão centralizada",
      "Suporte",
      "37% de economia",
    ],
    popular: true,
  },
  {
    name: "3 Tags Pet",
    price: "109,90",
    originalPrice: "179,70",
    description: "Melhor custo-benefício",
    features: [
      "3 Tags Pet QR Code Premium",
      "Páginas personalizadas",
      "Geolocalização (enviada mediante autorização de quem escaneia o QR Code)",
      "Notificações via WhatsApp",
      "Gestão centralizada",
      "Suporte",
      "39% de economia",
    ],
    popular: false,
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleBuyNow = (plan: (typeof pricingPlans)[0]) => {
    // Create product based on plan
    const quantity = plan.name.includes("3") ? 3 : plan.name.includes("2") ? 2 : 1;
    const product: Product = {
      id: `pet-tag-pack-${quantity}`,
      name: plan.name,
      description: plan.description,
      price: parseFloat(plan.price.replace(",", ".")),
      type: "pet_tag",
      image_url: null,
      is_active: true,
      created_at: null,
    };

    addToCart(product);

    if (!user) {
      toast({
        title: "Faça login para continuar",
        description: "Você precisa estar logado para finalizar a compra.",
      });
      navigate("/auth?redirect=/loja/checkout");
      return;
    }

    toast({
      title: "Adicionado ao carrinho!",
      description: (
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-primary" />
          <span>{plan.name}</span>
        </div>
      ),
    });
    navigate("/loja/checkout");
  };

  return (
    <section id="precos" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-radial-gradient" />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Preços Especiais
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Proteja seu pet <span className="text-gradient">hoje</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Escolha o plano ideal para sua família. Quanto mais tags, maior a economia.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-glow-secondary text-primary-foreground text-sm font-semibold">
                    <Star className="w-4 h-4 fill-current" />
                    Mais Popular
                  </div>
                </div>
              )}

              <div
                className={`h-full p-6 rounded-2xl border transition-all duration-300 ${
                  plan.popular
                    ? "bg-card border-primary/50 shadow-[0_0_40px_hsl(var(--primary)/0.2)]"
                    : "bg-card/50 border-border/50 hover:border-primary/30"
                }`}
              >
                <div className="text-center mb-6">
                  <h3 className="text-xl font-display font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-muted-foreground line-through text-lg">R$ {plan.originalPrice}</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <span className="text-5xl font-display font-bold text-gradient">{plan.price}</span>
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">pagamento único</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm text-foreground/90">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? "hero" : "outline"}
                  size="lg"
                  className="w-full"
                  onClick={() => handleBuyNow(plan)}
                >
                  {plan.popular && <Sparkles className="w-4 h-4" />}
                  Comprar Agora
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-6 mt-12 text-muted-foreground text-sm"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span>Compra 100% Segura</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span>Garantia 90 Dias</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span>Pagamento Seguro</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
