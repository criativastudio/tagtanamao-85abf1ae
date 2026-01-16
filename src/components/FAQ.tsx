import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Como funciona a Tag Pet QR Code?",
    answer: "A tag possui um QR Code único que, quando escaneado por qualquer smartphone, direciona para uma página personalizada do seu pet. Além disso, você recebe automaticamente a localização de quem escaneou via WhatsApp.",
  },
  {
    question: "Preciso de aplicativo para usar?",
    answer: "Não! A tag funciona com qualquer câmera de smartphone. Quem encontrar seu pet não precisa baixar nada. Você gerencia tudo pelo nosso painel web.",
  },
  {
    question: "A localização é precisa?",
    answer: "A localização capturada é a posição aproximada de quem escaneou o QR Code, baseada no GPS do dispositivo. A precisão varia de acordo com as configurações do aparelho de quem escaneou.",
  },
  {
    question: "Posso ter múltiplas tags na mesma conta?",
    answer: "Sim! Você pode adicionar quantas tags quiser na sua conta e gerenciar todas em um único painel. Cada tag tem sua própria página personalizada.",
  },
  {
    question: "A tag é resistente à água?",
    answer: "Sim! Nossas tags são fabricadas em material resistente à água e condições climáticas adversas. Perfeitas para pets ativos.",
  },
  {
    question: "Como funciona o Display QR para empresas?",
    answer: "O Display é uma placa de acrílico elegante com QR Code que direciona para uma landing page personalizada da sua empresa, com botões para WhatsApp, redes sociais, pagamento Pix, agendamentos e mais.",
  },
  {
    question: "Qual o prazo de entrega?",
    answer: "Trabalhamos com frete grátis para todo Brasil. O prazo médio é de 5-10 dias úteis dependendo da sua região.",
  },
  {
    question: "Existe garantia?",
    answer: "Sim! Todos os nossos produtos possuem garantia de 1 ano contra defeitos de fabricação.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="relative py-24 overflow-hidden">
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Dúvidas Frequentes
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Perguntas <span className="text-gradient">frequentes</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tudo que você precisa saber sobre nossos produtos
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl px-6 data-[state=open]:border-primary/30 transition-colors duration-300"
              >
                <AccordionTrigger className="text-left font-display font-semibold hover:text-primary transition-colors py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
