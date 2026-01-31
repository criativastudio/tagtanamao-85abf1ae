import { motion } from "framer-motion";
import { Scan, Smartphone, Bell, Check } from "lucide-react";

const steps = [
  {
    icon: Scan,
    step: "01",
    title: "Escaneie o QR Code",
    description: "Qualquer pessoa pode escanear a tag do seu pet usando a câmera do celular.",
  },
  {
    icon: Smartphone,
    step: "02",
    title: "Página do Pet",
    description: "Acessa a página personalizada com foto, nome e botão de contato direto.",
  },
  {
    icon: Bell,
    step: "03",
    title: "Você é Notificado",
    description:
      "Recebe a localização e numero de Whatsapp de quem leu o QR Code, mediante autorização do envio da geolocalização de quem encontrou o pet.",
  },
  {
    icon: Check,
    step: "04",
    title: "Pet Seguro",
    description: "Entre em contato com quem encontrou e traga seu amigo de volta.",
  },
];

const HowItWorks = () => {
  return (
    <section id="como-funciona" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-secondary/30" />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Simples e Rápido
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Como <span className="text-gradient">funciona</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Em 4 passos simples, seu pet está protegido</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-full h-px bg-gradient-to-r from-primary/50 to-transparent" />
              )}

              <div className="relative p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 group">
                {/* Step number */}
                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-gradient-to-r from-primary to-glow-secondary flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
                  {item.step}
                </div>

                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>

                <h3 className="text-xl font-display font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
