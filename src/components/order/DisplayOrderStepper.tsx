import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  CreditCard,
  Paintbrush,
  Package,
  Truck,
  PackageCheck,
  Building2,
  ImagePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  const hasApprovedArt = Boolean(order.display_arts?.length && !hasOpenArt);

  // Se já estiver pago e houver arte aberta, avançar para a etapa de personalização
  if ((status === 'paid' || status === 'payment_confirmed' || status === 'confirmed') && hasOpenArt) return 2;

  // Se a arte foi salva (travada), avançar para arte finalizada
  if ((status === 'paid' || status === 'payment_confirmed' || status === 'confirmed') && hasApprovedArt) return 3;

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

function getInternalStatus(order: OrderWithDisplayArts): string {
  const hasOpenArt = Boolean(order.display_arts?.some((art) => !art.locked));
  const hasApprovedArt = Boolean(order.display_arts?.length && !hasOpenArt);

  if (hasOpenArt) return 'aguardando_arte';
  if (hasApprovedArt) return 'arte_aprovada_enviada';
  return order.status ?? '—';
}

export default function DisplayOrderStepper({ order }: { order: OrderWithDisplayArts }) {
  const navigate = useNavigate();
  const currentStep = getStepIndex(order);
  const openArt = order.display_arts?.find((art) => !art.locked) ?? order.display_arts?.[0];
  const [companyName, setCompanyName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [internalStatus, setInternalStatus] = useState<string | null>(null);

  useEffect(() => {
    setInternalStatus(null);
  }, [order.id]);

  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview(null);
    }
  };

  const handleInternalStatus = () => {
    setInternalStatus(getInternalStatus(order));
  };

  return (
    <div className="py-4 space-y-0">
      <p
        className="text-xs text-muted-foreground mb-3 cursor-pointer"
        onClick={handleInternalStatus}
        title="Clique para gerar o status interno"
      >
        Status interno: {internalStatus ?? 'clique para gerar'}
      </p>

      <div className="flex justify-end mb-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Building2 className="w-4 h-4 mr-2" />
              Painel da Empresa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Painel da Empresa</DialogTitle>
              <DialogDescription>Adicione a logo e o nome para visualizar o preview.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="companyName">Nome da empresa</Label>
                <Input
                  id="companyName"
                  placeholder="Digite o nome da empresa"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="companyLogo">Logo da empresa</Label>
                <Input id="companyLogo" type="file" accept="image/*" onChange={handleLogoChange} />
              </div>

              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-base">Preview</CardTitle>
                  <CardDescription>Veja como ficará no display.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-background">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo preview" className="h-14 w-14 rounded-full object-contain" />
                      ) : (
                        <ImagePlus className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{companyName || 'Nome da empresa'}</p>
                      <p className="text-xs text-muted-foreground">Pré-visualização do display</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                  Personalizar Arte Display
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
