import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCode, Dog, Building2, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type ProductType = 'pet_tag' | 'business_display' | null;

export default function ActivateProduct() {
  const [step, setStep] = useState(1);
  const [productType, setProductType] = useState<ProductType>(null);
  const [qrCode, setQrCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSelectType = (type: ProductType) => {
    setProductType(type);
    setStep(2);
  };

  const handleActivate = async () => {
    if (!qrCode.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite o código do produto.',
        variant: 'destructive'
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para ativar um produto.',
        variant: 'destructive'
      });
      navigate('/auth');
      return;
    }

    setIsLoading(true);

    try {
      // Use the edge function to activate the product (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('activate-product', {
        body: {
          qrCode: qrCode.trim(),
          productType,
          userId: user.id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erro ao ativar produto');
      }

      if (!data?.success) {
        toast({
          title: 'Erro',
          description: data?.error || 'Não foi possível ativar o produto.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      setIsActivated(true);
      toast({
        title: 'Produto ativado!',
        description: 'Seu produto foi ativado com sucesso.'
      });

    } catch (error: any) {
      console.error('Activation error:', error);
      toast({
        title: 'Erro ao ativar',
        description: error?.message || 'Ocorreu um erro ao ativar o produto. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isActivated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-8 rounded-2xl text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center"
          >
            <CheckCircle className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Produto Ativado!</h1>
          <p className="text-muted-foreground mb-6">
            Seu {productType === 'pet_tag' ? 'Tag Pet' : 'Display'} foi ativado com sucesso.
            Agora você pode personalizá-lo.
          </p>
          <div className="space-y-3">
            <Button 
              variant="hero" 
              className="w-full"
              onClick={() => navigate(productType === 'pet_tag' ? '/dashboard/tags' : '/dashboard/displays')}
            >
              Personalizar Agora
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/dashboard')}
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => step > 1 ? setStep(step - 1) : navigate('/dashboard')}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>

        {/* Step 1: Select Product Type */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl font-bold text-foreground mb-2">Ativar Produto</h1>
            <p className="text-muted-foreground mb-8">Selecione o tipo de produto que deseja ativar</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectType('pet_tag')}
                className="glass-card p-8 rounded-xl text-left hover:border-primary/50 transition-colors"
              >
                <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <Dog className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Tag Pet</h3>
                <p className="text-sm text-muted-foreground">
                  Tag inteligente para coleira do seu pet com QR Code único
                </p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectType('business_display')}
                className="glass-card p-8 rounded-xl text-left hover:border-primary/50 transition-colors"
              >
                <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Display Empresarial</h3>
                <p className="text-sm text-muted-foreground">
                  Display de acrílico com QR Code para sua empresa
                </p>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Enter QR Code */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                productType === 'pet_tag' ? 'bg-primary/20' : 'bg-blue-500/20'
              }`}>
                {productType === 'pet_tag' 
                  ? <Dog className="w-6 h-6 text-primary" />
                  : <Building2 className="w-6 h-6 text-blue-400" />
                }
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Ativar {productType === 'pet_tag' ? 'Tag Pet' : 'Display'}
                </h1>
                <p className="text-muted-foreground">Digite o código do produto</p>
              </div>
            </div>

            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center gap-4 mb-6">
                <QrCode className="w-12 h-12 text-muted-foreground" />
                <div className="flex-1">
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Código do Produto
                  </label>
                  <Input
                    placeholder="Ex: 123456"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    className="bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O código de 6 dígitos está impresso no seu produto
                  </p>
                </div>
              </div>

              <Button
                variant="hero"
                className="w-full"
                onClick={handleActivate}
                disabled={isLoading || !qrCode.trim()}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Ativar Produto'
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
