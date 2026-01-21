import { useState } from 'react';
import { Ticket, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number | null;
  max_discount: number | null;
}

interface CouponInputProps {
  orderTotal: number;
  appliedCoupon: Coupon | null;
  onApplyCoupon: (coupon: Coupon | null, discountAmount: number) => void;
}

export default function CouponInput({ orderTotal, appliedCoupon, onApplyCoupon }: CouponInputProps) {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const validateAndApplyCoupon = async () => {
    if (!code.trim()) {
      toast({
        title: 'Digite um código',
        description: 'Insira o código do cupom de desconto.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Use secure edge function for coupon validation
      const { data, error } = await supabase.functions.invoke('validate-coupon', {
        body: {
          code: code.toUpperCase().trim(),
          orderTotal,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao validar cupom');
      }

      if (!data?.success || !data?.coupon) {
        toast({
          title: 'Cupom inválido',
          description: data?.error || 'Este código de cupom não existe ou está inativo.',
          variant: 'destructive',
        });
        return;
      }

      const coupon = data.coupon;
      const discountAmount = coupon.discountAmount;

      onApplyCoupon(
        {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          min_order_value: coupon.min_order_value,
          max_discount: coupon.max_discount,
        },
        discountAmount
      );
      
      toast({
        title: 'Cupom aplicado!',
        description: `Desconto de R$ ${discountAmount.toFixed(2)} aplicado.`,
      });

    } catch (error: any) {
      console.error('Coupon validation error:', error);
      toast({
        title: 'Erro ao validar cupom',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeCoupon = () => {
    setCode('');
    onApplyCoupon(null, 0);
    toast({
      title: 'Cupom removido',
      description: 'O desconto foi removido do seu pedido.',
    });
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-primary" />
          <div>
            <span className="font-mono font-bold text-primary">{appliedCoupon.code}</span>
            {appliedCoupon.description && (
              <p className="text-xs text-muted-foreground">{appliedCoupon.description}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={removeCoupon}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Código do cupom"
          className="pl-10 uppercase"
          onKeyDown={(e) => e.key === 'Enter' && validateAndApplyCoupon()}
        />
      </div>
      <Button 
        variant="outline" 
        onClick={validateAndApplyCoupon}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          'Aplicar'
        )}
      </Button>
    </div>
  );
}