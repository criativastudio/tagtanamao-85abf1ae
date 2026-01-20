import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Upload,
  Eye,
  Palette,
  Code,
  Image,
  Type,
  Save
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
import { ArtTemplate, EditableField } from '@/types/ecommerce';
import { Json } from '@/integrations/supabase/types';

export default function TemplatesManager() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState<ArtTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ArtTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<ArtTemplate | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    product_type: 'display',
    svg_content: '',
    is_active: true,
  });
  const [editableFields, setEditableFields] = useState<EditableField[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && profile && !profile.is_admin) {
      navigate('/dashboard');
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    
    const { data, error } = await supabase
      .from('art_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar templates',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      const mappedTemplates = (data || []).map(t => ({
        ...t,
        editable_fields: (Array.isArray(t.editable_fields) ? t.editable_fields : []) as EditableField[]
      }));
      setTemplates(mappedTemplates);
    }
    
    setLoadingTemplates(false);
  };

  const handleOpenEditor = (template?: ArtTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        product_type: template.product_type,
        svg_content: template.svg_content,
        is_active: template.is_active ?? true,
      });
      setEditableFields(template.editable_fields || []);
      setPreviewUrl(template.preview_url);
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        product_type: 'display',
        svg_content: '',
        is_active: true,
      });
      setEditableFields([]);
      setPreviewUrl(null);
    }
    setShowEditor(true);
  };

  const handleSaveTemplate = async () => {
    if (!formData.name || !formData.svg_content) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome e conteúdo SVG são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    const templateData = {
      name: formData.name,
      description: formData.description || null,
      product_type: formData.product_type,
      svg_content: formData.svg_content,
      editable_fields: editableFields as unknown as Json,
      is_active: formData.is_active,
      preview_url: previewUrl,
    };

    let error;

    if (editingTemplate) {
      const result = await supabase
        .from('art_templates')
        .update(templateData)
        .eq('id', editingTemplate.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('art_templates')
        .insert(templateData);
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
        title: editingTemplate ? 'Template atualizado' : 'Template criado',
        description: 'As alterações foram salvas com sucesso.',
      });
      setShowEditor(false);
      fetchTemplates();
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    const { error } = await supabase
      .from('art_templates')
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
        title: 'Template excluído',
        description: 'O template foi removido com sucesso.',
      });
      fetchTemplates();
    }
  };

  const handleSVGUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.svg')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo SVG.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFormData(prev => ({ ...prev, svg_content: content }));
      
      // Parse SVG to find editable elements
      parseSVGForEditableFields(content);
    };
    reader.readAsText(file);
  };

  const parseSVGForEditableFields = (svgContent: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    
    const fields: EditableField[] = [];
    
    // Find text elements with data-editable attribute
    const textElements = doc.querySelectorAll('text[data-editable], tspan[data-editable]');
    textElements.forEach((el, index) => {
      const id = el.getAttribute('data-editable') || `text-${index}`;
      fields.push({
        id,
        name: el.getAttribute('data-label') || `Texto ${index + 1}`,
        type: 'text',
        placeholder: el.textContent || '',
        defaultValue: el.textContent || '',
      });
    });
    
    // Find image elements with data-editable attribute
    const imageElements = doc.querySelectorAll('image[data-editable], rect[data-editable-image]');
    imageElements.forEach((el, index) => {
      const id = el.getAttribute('data-editable') || el.getAttribute('data-editable-image') || `image-${index}`;
      fields.push({
        id,
        name: el.getAttribute('data-label') || `Imagem ${index + 1}`,
        type: 'image',
        placeholder: 'Fazer upload de imagem',
      });
    });
    
    if (fields.length > 0) {
      setEditableFields(fields);
      toast({
        title: 'Campos detectados',
        description: `${fields.length} campo(s) editável(is) encontrado(s) no SVG.`,
      });
    }
  };

  const addEditableField = () => {
    setEditableFields(prev => [
      ...prev,
      {
        id: `field-${Date.now()}`,
        name: 'Novo Campo',
        type: 'text',
        placeholder: '',
      },
    ]);
  };

  const updateEditableField = (index: number, updates: Partial<EditableField>) => {
    setEditableFields(prev => prev.map((field, i) => 
      i === index ? { ...field, ...updates } : field
    ));
  };

  const removeEditableField = (index: number) => {
    setEditableFields(prev => prev.filter((_, i) => i !== index));
  };

  const handlePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = `template-previews/${Date.now()}-${file.name}`;
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
      
      setPreviewUrl(publicUrl);
      toast({ title: 'Preview atualizado' });
    }
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
              <h1 className="text-2xl font-bold text-foreground">Modelos de Arte</h1>
              <p className="text-muted-foreground">Gerencie templates SVG editáveis</p>
            </div>
          </div>
          <Button onClick={() => handleOpenEditor()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Template
          </Button>
        </div>

        {/* Templates Grid */}
        {loadingTemplates ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20">
            <Palette className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum template</h2>
            <p className="text-muted-foreground mb-6">
              Crie seu primeiro modelo de arte para os displays.
            </p>
            <Button onClick={() => handleOpenEditor()}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-card overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription>{template.description || 'Sem descrição'}</CardDescription>
                      </div>
                      <Switch
                        checked={template.is_active ?? true}
                        onCheckedChange={async (checked) => {
                          await supabase
                            .from('art_templates')
                            .update({ is_active: checked })
                            .eq('id', template.id);
                          fetchTemplates();
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {template.preview_url ? (
                      <img
                        src={template.preview_url}
                        alt={template.name}
                        className="w-full h-40 object-cover rounded-lg bg-muted"
                      />
                    ) : (
                      <div 
                        className="w-full h-40 rounded-lg bg-muted flex items-center justify-center"
                        dangerouslySetInnerHTML={{ 
                          __html: template.svg_content.replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, 'height="100%"')
                        }}
                      />
                    )}
                    <div className="flex items-center gap-2 mt-4">
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {template.product_type}
                      </span>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {template.editable_fields?.length || 0} campos
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setPreviewTemplate(template);
                        setShowPreview(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenEditor(template)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Template Editor Dialog */}
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Template</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Cardápio Premium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_type">Tipo de Produto</Label>
                  <Select
                    value={formData.product_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, product_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="display">Display</SelectItem>
                      <SelectItem value="pet_tag">Tag Pet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do template..."
                  rows={2}
                />
              </div>

              {/* SVG Upload */}
              <div className="space-y-2">
                <Label>Arquivo SVG</Label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="w-5 h-5" />
                      <span>Upload SVG</span>
                      <input
                        type="file"
                        accept=".svg"
                        onChange={handleSVGUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <Image className="w-5 h-5" />
                      <span>Upload Preview</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePreviewUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                {formData.svg_content && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Code className="w-4 h-4" />
                      <span className="text-sm font-medium">SVG Carregado</span>
                    </div>
                    <div 
                      className="w-full h-48 flex items-center justify-center bg-background rounded"
                      dangerouslySetInnerHTML={{ 
                        __html: formData.svg_content
                          .replace(/width="[^"]*"/, 'width="auto"')
                          .replace(/height="[^"]*"/, 'height="100%"')
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Campos Editáveis</Label>
                  <Button size="sm" variant="outline" onClick={addEditableField}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Campo
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Dica: Adicione atributos <code className="bg-muted px-1 rounded">data-editable="id"</code> e <code className="bg-muted px-1 rounded">data-label="Nome"</code> aos elementos do SVG para detecção automática.
                </p>

                <div className="space-y-3">
                  {editableFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Input
                        value={field.name}
                        onChange={(e) => updateEditableField(index, { name: e.target.value })}
                        placeholder="Nome do campo"
                        className="flex-1"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(value: 'text' | 'image' | 'color') => 
                          updateEditableField(index, { type: value })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">
                            <span className="flex items-center gap-1">
                              <Type className="w-3 h-3" /> Texto
                            </span>
                          </SelectItem>
                          <SelectItem value="image">
                            <span className="flex items-center gap-1">
                              <Image className="w-3 h-3" /> Imagem
                            </span>
                          </SelectItem>
                          <SelectItem value="color">
                            <span className="flex items-center gap-1">
                              <Palette className="w-3 h-3" /> Cor
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={field.id}
                        onChange={(e) => updateEditableField(index, { id: e.target.value })}
                        placeholder="ID no SVG"
                        className="w-32"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeEditableField(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Template Ativo</Label>
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
              <Button onClick={handleSaveTemplate}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{previewTemplate?.name}</DialogTitle>
            </DialogHeader>
            {previewTemplate && (
              <div 
                className="w-full aspect-square flex items-center justify-center bg-muted rounded-lg p-4"
                dangerouslySetInnerHTML={{ 
                  __html: previewTemplate.svg_content
                    .replace(/width="[^"]*"/, 'width="100%"')
                    .replace(/height="[^"]*"/, 'height="100%"')
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
