import { useState } from 'react';
import { Ticket, Loader2, Check, X } from 'lucide-react';
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
  max_uses: number | null;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
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
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (error || !coupon) {
        toast({
          title: 'Cupom inválido',
          description: 'Este código de cupom não existe ou está inativo.',
          variant: 'destructive',
        });
        return;
      }

      // Check validity dates
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        toast({
          title: 'Cupom ainda não válido',
          description: 'Este cupom ainda não está disponível para uso.',
          variant: 'destructive',
        });
        return;
      }

      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        toast({
          title: 'Cupom expirado',
          description: 'Este cupom já não é mais válido.',
          variant: 'destructive',
        });
        return;
      }

      // Check usage limit
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        toast({
          title: 'Cupom esgotado',
          description: 'Este cupom atingiu o limite máximo de usos.',
          variant: 'destructive',
        });
        return;
      }

      // Check minimum order value
      if (coupon.min_order_value && orderTotal < coupon.min_order_value) {
        toast({
          title: 'Valor mínimo não atingido',
          description: `Pedido mínimo de R$ ${coupon.min_order_value.toFixed(2)} para usar este cupom.`,
          variant: 'destructive',
        });
        return;
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = orderTotal * (coupon.discount_value / 100);
      } else {
        discountAmount = coupon.discount_value;
      }

      // Apply max discount cap
      if (coupon.max_discount && discountAmount > coupon.max_discount) {
        discountAmount = coupon.max_discount;
      }

      // Can't discount more than order total
      if (discountAmount > orderTotal) {
        discountAmount = orderTotal;
      }

      onApplyCoupon(coupon as Coupon, discountAmount);
      
      toast({
        title: 'Cupom aplicado!',
        description: `Desconto de R$ ${discountAmount.toFixed(2)} aplicado.`,
      });

    } catch (error: any) {
      toast({
        title: 'Erro ao validar cupom',
        description: error.message,
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