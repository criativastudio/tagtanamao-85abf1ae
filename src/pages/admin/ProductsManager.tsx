import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Package,
  DollarSign,
  Save,
  Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types/ecommerce';

export default function ProductsManager() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    type: 'pet_tag',
    is_active: true,
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && profile && !profile.is_admin) {
      navigate('/dashboard');
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar produtos',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setProducts(data || []);
    }
    
    setLoadingProducts(false);
  };

  const handleOpenEditor = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        type: product.type,
        is_active: product.is_active ?? true,
      });
      setImageUrl(product.image_url);
      setGalleryImages(product.gallery_images || []);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        type: 'pet_tag',
        is_active: true,
      });
      setImageUrl(null);
      setGalleryImages([]);
    }
    setShowEditor(true);
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome e preço são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    const productData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      type: formData.type,
      is_active: formData.is_active,
      image_url: imageUrl,
      gallery_images: galleryImages,
    };

    let error;

    if (editingProduct) {
      const result = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('products')
        .insert(productData);
      error = result.error;
    }

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: editingProduct ? 'Produto atualizado' : 'Produto criado',
        description: 'As alterações foram salvas com sucesso.',
      });
      setShowEditor(false);
      fetchProducts();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Produto excluído',
        description: 'O produto foi removido com sucesso.',
      });
      fetchProducts();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = `product-images/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from('bio-images')
      .upload(fileName, file);

    if (error) {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('bio-images')
        .getPublicUrl(fileName);
      
      setImageUrl(publicUrl);
      toast({ title: 'Imagem atualizada' });
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (galleryImages.length >= 5) {
      toast({ title: 'Máximo de 5 fotos adicionais', variant: 'destructive' });
      return;
    }

    const fileName = `product-images/gallery/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from('bio-images')
      .upload(fileName, file);

    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('bio-images')
        .getPublicUrl(fileName);
      setGalleryImages(prev => [...prev, publicUrl]);
      toast({ title: 'Foto adicionada à galeria' });
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
              <p className="text-muted-foreground">Gerencie produtos da loja</p>
            </div>
          </div>
          <Button onClick={() => handleOpenEditor()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>

        {/* Products Grid */}
        {loadingProducts ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum produto</h2>
            <p className="text-muted-foreground mb-6">
              Adicione seu primeiro produto à loja.
            </p>
            <Button onClick={() => handleOpenEditor()}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Produto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-card overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {product.description || 'Sem descrição'}
                        </CardDescription>
                      </div>
                      <Switch
                        checked={product.is_active ?? true}
                        onCheckedChange={async (checked) => {
                          await supabase
                            .from('products')
                            .update({ is_active: checked })
                            .eq('id', product.id);
                          fetchProducts();
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-56 object-cover rounded-lg bg-muted"
                      />
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
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {product.type === 'pet_tag' ? 'Tag Pet' : 
                         product.type === 'business_display' ? 'Display' :
                         product.type === 'nfc_card' ? 'NFC Card' : 'NFC Tag'}
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenEditor(product)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Product Editor Dialog */}
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Tag Pet Premium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do produto..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pet_tag">Tag Pet</SelectItem>
                      <SelectItem value="business_display">Display</SelectItem>
                      <SelectItem value="nfc_card">NFC Card</SelectItem>
                      <SelectItem value="nfc_tag">NFC Tag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Imagem Principal</Label>
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover rounded" />
                  ) : (
                    <>
                      <Image className="w-5 h-5" />
                      <span>Upload Imagem</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <Label>Fotos Adicionais ({galleryImages.length}/5)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {galleryImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img src={img} alt="" className="w-full h-20 object-cover rounded-lg bg-muted" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {galleryImages.length < 5 && (
                    <label className="w-full h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-center">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleGalleryUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Produto Ativo</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditor(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveProduct}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
