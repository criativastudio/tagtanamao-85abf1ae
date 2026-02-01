import { motion } from "framer-motion";
import { QrCode, Smartphone, Shield, MapPin, Bell, Zap } from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "QR Code Único",
    description: "Cada tag possui um QR Code exclusivo que direciona para a página personalizada do seu pet.",
  },
  {
    icon: MapPin,
    title: "Geolocalização Automática",
    description:
      "Receba o telefone e a localização sempre que alguém escanear a tag do seu pet e autorizar o envio. Notificação instantânea.",
  },
  {
    icon: Bell,
    title: "Notificações em Tempo Real",
    description: "Você recebe avisos instantâneos no WhatsApp sempre que sua tag for escaneada.",
  },
  {
    icon: Shield,
    title: "Dados Protegidos",
    description: "Suas informações estão seguras. Você controla o que aparece na página pública.",
  },
  {
    icon: Smartphone,
    title: "Gestão Completa",
    description: "Painel intuitivo para gerenciar todas as suas tags em um único lugar.",
  },
  {
    icon: Zap,
    title: "Ativação Instantânea",
    description: "Ative suas tags em segundos. Personalize e comece a usar imediatamente.",
  },
];

const Features = () => {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Funcionalidades
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Tecnologia que <span className="text-gradient">protege</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Recursos avançados para manter seu pet seguro e sua empresa conectada
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="h-full p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.1)]">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
