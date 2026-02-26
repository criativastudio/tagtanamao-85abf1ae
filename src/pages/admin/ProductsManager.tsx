import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, DollarSign, Save, Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types/ecommerce';
import ProductTabContent from '@/components/admin/ProductTabContent';
import TemplatesTabContent from '@/components/admin/TemplatesTabContent';

const PRODUCT_TABS = [
  { value: 'pet_tag', label: 'Tag Pet' },
  { value: 'business_display', label: 'Display Empresarial' },
  { value: 'templates', label: 'Templates' },
  { value: 'nfc_tag', label: 'Tag Celular' },
  { value: 'nfc_card', label: 'Card NFC' },
] as const;

export default function ProductsManager() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<string>('pet_tag');

  const [formData, setFormData] = useState({ name: '', description: '', price: '', type: 'pet_tag', is_active: true });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && profile && !profile.is_admin) navigate('/dashboard');
  }, [profile, loading, navigate]);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Erro ao carregar produtos', description: error.message, variant: 'destructive' });
    else setProducts(data || []);
    setLoadingProducts(false);
  };

  const handleOpenEditor = (product?: Product, forceType?: string) => {
    const type = forceType || activeTab;
    if (product) {
      setEditingProduct(product);
      setFormData({ name: product.name, description: product.description || '', price: product.price.toString(), type: product.type, is_active: product.is_active ?? true });
      setImageUrl(product.image_url);
      setGalleryImages(product.gallery_images || []);
    } else {
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', type, is_active: true });
      setImageUrl(null);
      setGalleryImages([]);
    }
    setShowEditor(true);
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price) {
      toast({ title: 'Campos obrigatórios', description: 'Nome e preço são obrigatórios.', variant: 'destructive' });
      return;
    }
    const productData = {
      name: formData.name, description: formData.description || null, price: parseFloat(formData.price),
      type: formData.type, is_active: formData.is_active, image_url: imageUrl, gallery_images: galleryImages,
    };
    const { error } = editingProduct
      ? await supabase.from('products').update(productData).eq('id', editingProduct.id)
      : await supabase.from('products').insert(productData);
    if (error) toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    else { toast({ title: editingProduct ? 'Produto atualizado' : 'Produto criado' }); setShowEditor(false); fetchProducts(); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = `product-images/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('bio-images').upload(fileName, file);
    if (error) toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    else { const { data: { publicUrl } } = supabase.storage.from('bio-images').getPublicUrl(fileName); setImageUrl(publicUrl); }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (galleryImages.length >= 5) { toast({ title: 'Máximo de 5 fotos', variant: 'destructive' }); return; }
    const fileName = `product-images/gallery/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('bio-images').upload(fileName, file);
    if (error) toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    else { const { data: { publicUrl } } = supabase.storage.from('bio-images').getPublicUrl(fileName); setGalleryImages(prev => [...prev, publicUrl]); }
  };

  const removeGalleryImage = (index: number) => setGalleryImages(prev => prev.filter((_, i) => i !== index));

  const isTemplatesTab = activeTab === 'templates';
  const filteredProducts = products.filter(p => p.type === activeTab);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
              <p className="text-muted-foreground">Gerencie produtos e templates da loja</p>
            </div>
          </div>
          {!isTemplatesTab && (
            <Button onClick={() => handleOpenEditor()}>
              <Plus className="w-4 h-4 mr-2" /> Novo Produto
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            {PRODUCT_TABS.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>

          {/* Product tabs */}
          {PRODUCT_TABS.filter(t => t.value !== 'templates').map(tab => (
            <TabsContent key={tab.value} value={tab.value}>
              {loadingProducts ? (
                <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <ProductTabContent
                  products={filteredProducts}
                  onRefresh={fetchProducts}
                  onEdit={(p) => handleOpenEditor(p)}
                  onCreate={() => handleOpenEditor()}
                  emptyLabel={tab.label}
                />
              )}
            </TabsContent>
          ))}

          {/* Templates tab */}
          <TabsContent value="templates">
            <TemplatesTabContent />
          </TabsContent>
        </Tabs>

        {/* Product Editor Dialog */}
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Ex: Tag Pet Premium" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Descrição do produto..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))} placeholder="0.00" className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Imagem Principal</Label>
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover rounded" />
                  ) : (
                    <><Image className="w-5 h-5" /><span>Upload Imagem</span></>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              <div className="space-y-2">
                <Label>Fotos Adicionais ({galleryImages.length}/5)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {galleryImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img src={img} alt="" className="w-full h-20 object-cover rounded-lg bg-muted" />
                      <button type="button" onClick={() => removeGalleryImage(index)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    </div>
                  ))}
                  {galleryImages.length < 5 && (
                    <label className="w-full h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-center">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                      <input type="file" accept="image/*" onChange={handleGalleryUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Produto Ativo</Label>
                <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditor(false)}>Cancelar</Button>
              <Button onClick={handleSaveProduct}><Save className="w-4 h-4 mr-2" /> Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
