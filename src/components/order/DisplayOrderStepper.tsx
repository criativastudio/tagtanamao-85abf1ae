import { useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  CreditCard,
  Paintbrush,
  Package,
  Truck,
  PackageCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderWithDisplayArts {
  id: string;
  status: string | null;
  asaas_payment_link: string | null;
  tracking_code: string | null;
  display_arts?: { id: string; locked: boolean }[];
}

const steps = [
  { label: 'Pendente', description: 'Aguardando pagamento', icon: Clock },
  { label: 'Pago', description: 'Pagamento aprovado', icon: CreditCard },
  { label: 'Personalizar Arte', description: 'Arte em aberto', icon: Paintbrush },
  { label: 'Arte Finalizada / Em Produção', description: 'Arte aprovada, em produção', icon: Package },
  { label: 'Enviado', description: 'Pedido despachado', icon: Truck },
  { label: 'Entregue', description: 'Pedido recebido', icon: PackageCheck },
];

function getStepIndex(order: OrderWithDisplayArts): number {
  const status = (order.status ?? '').toLowerCase();
  const hasOpenArt = Boolean(order.display_arts?.some((art) => !art.locked));

  // Se já estiver pago e houver arte aberta, avançar para a etapa de personalização
  if ((status === 'paid' || status === 'payment_confirmed' || status === 'confirmed') && hasOpenArt) return 2;

  switch (status) {
    case 'pending':
    case 'awaiting_payment':
    case 'created':
    case 'new':
      return 0;
    case 'paid':
    case 'payment_confirmed':
    case 'confirmed':
      return 1;
    case 'awaiting_customization':
    case 'customization_pending':
    case 'awaiting_art':
    case 'art_pending':
      return 2;
    case 'art_finalized':
    case 'processing':
    case 'in_production':
      return 3;
    case 'ready_to_ship':
    case 'shipped':
    case 'in_transit':
      return 4;
    case 'delivered':
    case 'completed':
      return 5;
    default:
      return 0;
  }
}

export default function DisplayOrderStepper({ order }: { order: OrderWithDisplayArts }) {
  const navigate = useNavigate();
  const currentStep = getStepIndex(order);
  const openArt = order.display_arts?.find((art) => !art.locked) ?? order.display_arts?.[0];

  return (
    <div className="py-4 space-y-0">
      <p className="text-xs text-muted-foreground mb-3">Status interno: {order.status ?? '—'}</p>
      {steps.map((step, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        const StepIcon = isCompleted ? CheckCircle : step.icon;
        const isLast = i === steps.length - 1;

        return (
          <div key={i} className="flex gap-3">
            {/* Circle + line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground animate-pulse ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                <StepIcon className="w-4 h-4" />
              </div>
              {!isLast && (
                <div className={`w-0.5 h-8 ${i < currentStep ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>

            {/* Label + action */}
            <div className="pt-1 pb-2">
              <p className={`text-sm ${isCurrent ? 'font-semibold text-foreground' : isCompleted ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>

              {/* Contextual actions */}
              {isCurrent && i === 0 && order.asaas_payment_link && (
                <Button size="sm" className="mt-2" onClick={() => window.open(order.asaas_payment_link!, '_blank')}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pagar Agora
                </Button>
              )}
              {isCurrent && (i === 1 || i === 2) && openArt && (
                <Button size="sm" className="mt-2" onClick={() => navigate(`/personalizar-display/${openArt.id}`)}>
                  <Paintbrush className="w-4 h-4 mr-2" />
                  Personalizar Meu Display
                </Button>
              )}
              {isCurrent && i === 4 && order.tracking_code && (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => window.open(`https://rastreamento.correios.com.br/app/index.php?objeto=${order.tracking_code}`, '_blank')}>
                  <Truck className="w-4 h-4 mr-2" />
                  Rastrear
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
