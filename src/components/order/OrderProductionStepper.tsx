import { motion } from "framer-motion";
import {
  Clock,
  CreditCard,
  Paintbrush,
  CheckCircle,
  Package,
  PackageOpen,
  Truck,
  PackageCheck,
} from "lucide-react";

interface StepDef {
  status: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const ALL_STEPS: StepDef[] = [
  {
    status: "pending",
    label: "Aguardando Pagamento",
    description: "Pedido criado, aguardando confirmação de pagamento.",
    icon: Clock,
  },
  {
    status: "paid",
    label: "Pagamento Aprovado",
    description: "Pagamento confirmado com sucesso.",
    icon: CreditCard,
  },
  {
    status: "awaiting_customization",
    label: "Personalizar Arte",
    description: "Personalize a arte do seu produto.",
    icon: Paintbrush,
  },
  {
    status: "art_finalized",
    label: "Arte Finalizada",
    description: "Arte aprovada e pronta para produção.",
    icon: CheckCircle,
  },
  {
    status: "processing",
    label: "Em Produção",
    description: "Seu pedido está sendo produzido.",
    icon: Package,
  },
  {
    status: "ready_to_ship",
    label: "Pronto para Envio",
    description: "Produto pronto, aguardando coleta.",
    icon: PackageOpen,
  },
  {
    status: "shipped",
    label: "Enviado",
    description: "Pedido despachado e a caminho.",
    icon: Truck,
  },
  {
    status: "delivered",
    label: "Entregue",
    description: "Pedido entregue com sucesso!",
    icon: PackageCheck,
  },
];

const CUSTOMIZATION_STATUSES = ["awaiting_customization", "art_finalized"];

export function getProductionFlow(hasDisplay: boolean): { flow: string[]; steps: StepDef[] } {
  const steps = hasDisplay
    ? ALL_STEPS
    : ALL_STEPS.filter((s) => !CUSTOMIZATION_STATUSES.includes(s.status));

  return {
    flow: steps.map((s) => s.status),
    steps,
  };
}

interface OrderProductionStepperProps {
  status: string;
  hasDisplay: boolean;
}

export default function OrderProductionStepper({ status, hasDisplay }: OrderProductionStepperProps) {
  const { flow, steps } = getProductionFlow(hasDisplay);
  const currentIndex = flow.indexOf(status.toLowerCase());

  return (
    <div className="py-2">
      {steps.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === steps.length - 1;

        const StepIcon = step.icon;

        return (
          <div key={step.status} className="flex gap-3">
            {/* Left column: circle + line */}
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div className="relative flex items-center justify-center">
                {isCurrent && (
                  <motion.div
                    className="absolute rounded-full border-2 border-primary"
                    style={{ width: 36, height: 36 }}
                    animate={{ scale: [1, 1.18, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <motion.div
                  className={`w-7 h-7 rounded-full flex items-center justify-center z-10 shrink-0 ${
                    isDone
                      ? "bg-primary"
                      : isCurrent
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  {isDone ? (
                    <CheckCircle className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <StepIcon
                      className={`w-3.5 h-3.5 ${
                        isCurrent ? "text-primary-foreground" : "text-muted-foreground"
                      }`}
                    />
                  )}
                </motion.div>
              </div>

              {/* Vertical line */}
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 min-h-[28px] mt-1 mb-1 rounded-full transition-colors duration-500 ${
                    index < currentIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>

            {/* Right column: label + description */}
            <div className={`pb-4 ${isLast ? "pb-0" : ""} pt-0.5`}>
              {isCurrent ? (
                <motion.p
                  className="text-sm font-semibold text-foreground leading-tight"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + 0.1, duration: 0.3 }}
                >
                  {step.label}
                </motion.p>
              ) : (
                <p
                  className={`text-sm leading-tight font-medium ${
                    isDone ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
