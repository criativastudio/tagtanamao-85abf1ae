import { motion } from 'framer-motion';
import { Edit, Trash2, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types/ecommerce';

interface ProductTabContentProps {
  products: Product[];
  onRefresh: () => void;
  onEdit: (product: Product) => void;
  onCreate: () => void;
  emptyLabel: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const typeLabels: Record<string, string> = {
  pet_tag: 'Tag Pet',
  business_display: 'Display',
  nfc_card: 'NFC Card',
  nfc_tag: 'NFC Tag',
};

export default function ProductTabContent({ products, onRefresh, onEdit, onCreate, emptyLabel }: ProductTabContentProps) {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Produto excluído' });
      onRefresh();
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum {emptyLabel}</h2>
        <p className="text-muted-foreground mb-6">Adicione seu primeiro produto.</p>
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4 mr-2" /> Criar Produto
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product, index) => (
        <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{product.description || 'Sem descrição'}</CardDescription>
                </div>
                <Switch
                  checked={product.is_active ?? true}
                  onCheckedChange={async (checked) => {
                    await supabase.from('products').update({ is_active: checked }).eq('id', product.id);
                    onRefresh();
                  }}
                />
              </div>
            </CardHeader>
            <CardContent>
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-56 object-cover rounded-lg bg-muted" />
              ) : (
                <div className="w-full h-56 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="w-12 h-12 text-muted-foreground/50" />
                </div>
              )}
              {product.gallery_images && product.gallery_images.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {product.gallery_images.slice(0, 4).map((img, i) => (
                    <img key={i} src={img} alt="" className="w-10 h-10 object-cover rounded bg-muted" />
                  ))}
                  {product.gallery_images.length > 4 && (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      +{product.gallery_images.length - 4}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs bg-muted px-2 py-1 rounded">{typeLabels[product.type] || product.type}</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(product.price)}</span>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(product)}>
                <Edit className="w-4 h-4 mr-1" /> Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
