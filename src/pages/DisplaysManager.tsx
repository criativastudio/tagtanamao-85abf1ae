import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  ArrowLeft, 
  Eye, 
  Edit2, 
  Save,
  X,
  ExternalLink,
  QrCode,
  Clock,
  Palette,
  Link2,
  Plus,
  Trash2,
  Search,
  User,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from '@/components/bio/ImageUpload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Simple button type for displays (different from BioButton)
interface DisplayButton {
  id: string;
  label: string;
  url: string;
  icon: string;
}

interface BusinessDisplay {
  id: string;
  qr_code: string;
  slug: string | null;
  is_activated: boolean;
  business_name: string | null;
  logo_url: string | null;
  description: string | null;
  buttons: DisplayButton[];
  theme_color: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ScanInfo {
  count: number;
  lastScan: string | null;
  lastLocation: string | null;
}

const ICON_OPTIONS = [
  { id: 'link', label: 'Link' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'phone', label: 'Telefone' },
  { id: 'email', label: 'Email' },
  { id: 'website', label: 'Website' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'youtube', label: 'YouTube' },
];

const ADMIN_PASSWORD = 'admin123'; // Em produção, use verificação via backend

export default function DisplaysManager() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [displays, setDisplays] = useState<BusinessDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDisplay, setSelectedDisplay] = useState<BusinessDisplay | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanStats, setScanStats] = useState<Record<string, ScanInfo>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [deletingBulk, setDeletingBulk] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    business_name: '',
    logo_url: '',
    description: '',
    theme_color: '#10b981',
    buttons: [] as DisplayButton[]
  });

  useEffect(() => {
    if (user) {
      fetchDisplays();
    }
  }, [user]);

  const fetchDisplays = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('business_displays')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({
        title: 'Erro ao carregar displays',
        description: error.message,
        variant: 'destructive'
      });
    } else if (data) {
      // Parse buttons JSONB field safely
      const parsedDisplays = data.map(d => {
        let parsedButtons: DisplayButton[] = [];
        if (Array.isArray(d.buttons)) {
          parsedButtons = (d.buttons as unknown[]).map((btn: unknown) => {
            const b = btn as Record<string, unknown>;
            return {
              id: String(b.id || crypto.randomUUID()),
              label: String(b.label || ''),
              url: String(b.url || ''),
              icon: String(b.icon || 'link')
            };
          });
        }
        return {
          ...d,
          buttons: parsedButtons
        };
      });
      setDisplays(parsedDisplays);
      
      // Fetch scan stats for each display
      const stats: Record<string, ScanInfo> = {};
      for (const display of parsedDisplays) {
        const { data: scans, count } = await supabase
          .from('qr_scans')
          .select('*', { count: 'exact' })
          .eq('display_id', display.id)
          .order('scanned_at', { ascending: false })
          .limit(1);
        
        stats[display.id] = {
          count: count || 0,
          lastScan: scans?.[0]?.scanned_at || null,
          lastLocation: scans?.[0]?.city ? `${scans[0].city}, ${scans[0].country}` : null
        };
      }
      setScanStats(stats);
    }
    
    setLoading(false);
  };

  const handleSelectDisplay = (display: BusinessDisplay) => {
    setSelectedDisplay(display);
    setFormData({
      business_name: display.business_name || '',
      logo_url: display.logo_url || '',
      description: display.description || '',
      theme_color: display.theme_color || '#10b981',
      buttons: display.buttons || []
    });
    setEditMode(false);
  };

  const handleSave = async () => {
    if (!selectedDisplay) return;
    
    setSaving(true);
    
    const { error } = await supabase
      .from('business_displays')
      .update({
        business_name: formData.business_name || null,
        logo_url: formData.logo_url || null,
        description: formData.description || null,
        theme_color: formData.theme_color,
        buttons: JSON.parse(JSON.stringify(formData.buttons)),
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedDisplay.id);
    
    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Display atualizado!',
        description: 'As informações foram salvas com sucesso.'
      });
      setEditMode(false);
      fetchDisplays();
      setSelectedDisplay({ ...selectedDisplay, ...formData });
    }
    
    setSaving(false);
  };

  const handleLogoUpload = (url: string) => {
    setFormData(prev => ({ ...prev, logo_url: url }));
  };

  const handleLogoRemove = () => {
    setFormData(prev => ({ ...prev, logo_url: '' }));
  };

  const handleAddButton = () => {
    const newButton: DisplayButton = {
      id: crypto.randomUUID(),
      label: 'Novo Botão',
      url: '',
      icon: 'link'
    };
    setFormData(prev => ({ ...prev, buttons: [...prev.buttons, newButton] }));
  };

  const handleUpdateButton = (id: string, updates: Partial<DisplayButton>) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.map(btn => btn.id === id ? { ...btn, ...updates } : btn)
    }));
  };

  const handleRemoveButton = (id: string) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons.filter(btn => btn.id !== id)
    }));
  };

  const handleDelete = async (displayId: string) => {
    const { error } = await supabase
      .from('business_displays')
      .delete()
      .eq('id', displayId);

    if (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Display excluído',
        description: 'O display foi removido com sucesso.'
      });
      if (selectedDisplay?.id === displayId) {
        setSelectedDisplay(null);
      }
      fetchDisplays();
    }
    setDeleteConfirm(null);
  };

  // Toggle selection for bulk delete
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select/deselect all filtered items
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDisplays.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDisplays.map(d => d.id)));
    }
  };

  // Bulk delete with password confirmation
  const handleBulkDelete = async () => {
    if (passwordInput !== ADMIN_PASSWORD) {
      toast({
        title: 'Senha incorreta',
        description: 'A senha de confirmação está incorreta.',
        variant: 'destructive'
      });
      return;
    }

    setDeletingBulk(true);
    const idsToDelete = Array.from(selectedIds);
    
    const { error } = await supabase
      .from('business_displays')
      .delete()
      .in('id', idsToDelete);

    if (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Displays excluídos',
        description: `${idsToDelete.length} displays foram removidos com sucesso.`
      });
      if (selectedDisplay && selectedIds.has(selectedDisplay.id)) {
        setSelectedDisplay(null);
      }
      setSelectedIds(new Set());
      fetchDisplays();
    }
    
    setDeletingBulk(false);
    setBulkDeleteOpen(false);
    setPasswordInput('');
  };

  // Filter displays based on search term
  const filteredDisplays = displays.filter(display => {
    const term = searchTerm.toLowerCase();
    return (
      display.qr_code.toLowerCase().includes(term) ||
      display.id.toLowerCase().includes(term) ||
      (display.business_name || '').toLowerCase().includes(term) ||
      (display.description || '').toLowerCase().includes(term)
    );
  });

  const themeColors = [
    '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', 
    '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Displays Empresariais</h1>
                <p className="text-xs text-muted-foreground">{displays.length} displays cadastrados</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Displays List */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground">SEUS DISPLAYS</h2>
                {profile?.is_admin && selectedIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir ({selectedIds.size})
                  </Button>
                )}
              </div>
              
              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, nome, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Select All (Admin only) */}
              {profile?.is_admin && filteredDisplays.length > 0 && (
                <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/30">
                  <Checkbox
                    id="select-all-displays"
                    checked={selectedIds.size === filteredDisplays.length && filteredDisplays.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <Label htmlFor="select-all-displays" className="text-sm cursor-pointer">
                    Selecionar todos ({filteredDisplays.length})
                  </Label>
                </div>
              )}
              
              {displays.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">Nenhum display cadastrado</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => navigate('/dashboard/activate')}
                  >
                    Ativar Display
                  </Button>
                </div>
              ) : filteredDisplays.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">Nenhum display encontrado</p>
                  <p className="text-xs text-muted-foreground mt-1">Tente outro termo de busca</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {filteredDisplays.map((display) => (
                    <motion.div
                      key={display.id}
                      whileHover={{ scale: 1.02 }}
                      className={`relative flex items-center gap-2 p-3 rounded-lg transition-colors ${
                        selectedDisplay?.id === display.id 
                          ? 'bg-blue-500/20 border border-blue-500/30' 
                          : selectedIds.has(display.id)
                            ? 'bg-destructive/10 border border-destructive/30'
                            : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      {/* Checkbox for bulk selection (Admin only) */}
                      {profile?.is_admin && (
                        <Checkbox
                          checked={selectedIds.has(display.id)}
                          onCheckedChange={() => toggleSelection(display.id)}
                          className="shrink-0"
                        />
                      )}
                      
                      <button
                        onClick={() => handleSelectDisplay(display)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        {display.logo_url ? (
                          <img 
                            src={display.logo_url} 
                            alt={display.business_name || 'Logo'}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${display.theme_color}20` }}
                          >
                            <Building2 className="w-6 h-6" style={{ color: display.theme_color || '#3b82f6' }} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {display.business_name || 'Empresa sem nome'}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">{display.qr_code}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Eye className="w-3 h-3" />
                            <span>{scanStats[display.id]?.count || 0} leituras</span>
                          </div>
                        </div>
                      </button>
                      
                      {/* Delete button */}
                      {deleteConfirm === display.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDelete(display.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-50 hover:opacity-100"
                          onClick={() => setDeleteConfirm(display.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                      
                      <div className={`w-2 h-2 rounded-full ${display.is_activated ? 'bg-blue-400' : 'bg-muted'}`} />
                    </motion.div>
                  ))}
                </div>
              )}
              
              {/* Results count */}
              {searchTerm && filteredDisplays.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  {filteredDisplays.length} de {displays.length} displays encontrados
                </p>
              )}
            </div>
          </div>

          {/* Display Details / Editor */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedDisplay ? (
                <motion.div
                  key={selectedDisplay.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass-card rounded-xl overflow-hidden"
                >
                  {/* Display Header */}
                  <div 
                    className="relative h-48"
                    style={{ 
                      background: `linear-gradient(135deg, ${formData.theme_color}40, ${formData.theme_color}10)` 
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      {formData.logo_url ? (
                        <img 
                          src={formData.logo_url} 
                          alt={formData.business_name || 'Logo'}
                          className="w-28 h-28 rounded-xl object-cover border-4 border-background shadow-xl"
                        />
                      ) : (
                        <div 
                          className="w-28 h-28 rounded-xl flex items-center justify-center border-4 border-background shadow-xl"
                          style={{ backgroundColor: `${formData.theme_color}30` }}
                        >
                          <Building2 className="w-14 h-14" style={{ color: formData.theme_color }} />
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          window.open(`/display/${selectedDisplay.qr_code}`, '_blank');
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver Página
                      </Button>
                      {editMode ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                            <X className="w-4 h-4" />
                          </Button>
                          <Button variant="hero" size="sm" onClick={handleSave} disabled={saving}>
                            <Save className="w-4 h-4 mr-2" />
                            Salvar
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <Eye className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                        <p className="text-2xl font-bold text-foreground">{scanStats[selectedDisplay.id]?.count || 0}</p>
                        <p className="text-xs text-muted-foreground">Leituras</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <Clock className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                        <p className="text-sm font-medium text-foreground">
                          {scanStats[selectedDisplay.id]?.lastScan 
                            ? new Date(scanStats[selectedDisplay.id].lastScan!).toLocaleDateString('pt-BR')
                            : '-'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">Última leitura</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <Link2 className="w-5 h-5 mx-auto mb-1 text-orange-400" />
                        <p className="text-2xl font-bold text-foreground">{formData.buttons.length}</p>
                        <p className="text-xs text-muted-foreground">Botões</p>
                      </div>
                    </div>

                    {/* QR Code Info */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 mb-6">
                      <QrCode className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Código do Produto</p>
                        <p className="font-mono text-sm text-foreground">{selectedDisplay.qr_code}</p>
                      </div>
                    </div>

                    {/* Form */}
                    <div className="space-y-4">
                      {editMode && user && (
                        <div>
                          <Label>Logo da Empresa</Label>
                          <ImageUpload
                            userId={user.id}
                            currentUrl={formData.logo_url || null}
                            onUpload={handleLogoUpload}
                            onRemove={handleLogoRemove}
                            type="profile"
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="business_name">Nome da Empresa</Label>
                        <Input
                          id="business_name"
                          value={formData.business_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                          disabled={!editMode}
                          placeholder="Ex: Minha Empresa"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          disabled={!editMode}
                          placeholder="Breve descrição da empresa"
                          rows={3}
                        />
                      </div>

                      {/* Theme Color */}
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Palette className="w-4 h-4" />
                          Cor do Tema
                        </Label>
                        {editMode ? (
                          <div className="flex gap-2 flex-wrap">
                            {themeColors.map(color => (
                              <button
                                key={color}
                                onClick={() => setFormData(prev => ({ ...prev, theme_color: color }))}
                                className={`w-8 h-8 rounded-full transition-transform ${
                                  formData.theme_color === color ? 'ring-2 ring-offset-2 ring-offset-background scale-110' : ''
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div 
                            className="w-8 h-8 rounded-full" 
                            style={{ backgroundColor: formData.theme_color }}
                          />
                        )}
                      </div>

                      {/* Buttons Section */}
                      <div className="p-4 rounded-lg border border-border bg-muted/20">
                        <div className="flex items-center justify-between mb-4">
                          <Label className="flex items-center gap-2">
                            <Link2 className="w-4 h-4" />
                            Botões / Links
                          </Label>
                          {editMode && (
                            <Button variant="outline" size="sm" onClick={handleAddButton}>
                              <Plus className="w-4 h-4 mr-1" />
                              Adicionar
                            </Button>
                          )}
                        </div>
                        
                        {formData.buttons.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhum botão configurado
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {formData.buttons.map((button) => (
                              <div 
                                key={button.id}
                                className="flex items-center gap-3 p-3 rounded-lg bg-background/50"
                              >
                                <select
                                  value={button.icon}
                                  onChange={(e) => handleUpdateButton(button.id, { icon: e.target.value })}
                                  disabled={!editMode}
                                  className="w-24 p-2 rounded bg-muted/50 text-sm"
                                >
                                  {ICON_OPTIONS.map(icon => (
                                    <option key={icon.id} value={icon.id}>{icon.label}</option>
                                  ))}
                                </select>
                                <Input
                                  value={button.label}
                                  onChange={(e) => handleUpdateButton(button.id, { label: e.target.value })}
                                  disabled={!editMode}
                                  placeholder="Label"
                                  className="flex-1"
                                />
                                <Input
                                  value={button.url}
                                  onChange={(e) => handleUpdateButton(button.id, { url: e.target.value })}
                                  disabled={!editMode}
                                  placeholder="URL"
                                  className="flex-1"
                                />
                                {editMode && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleRemoveButton(button.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Link to Bio Editor */}
                      <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                        <p className="text-sm text-muted-foreground mb-2">
                          Para uma página mais completa com galeria e temas personalizados:
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate('/dashboard/bio')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Criar Bio Page Avançada
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card rounded-xl p-12 text-center"
                >
                  <Building2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Selecione um Display</h3>
                  <p className="text-muted-foreground">
                    Escolha um display na lista ao lado para ver e editar as informações
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Excluir {selectedIds.size} displays
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Digite a senha de administrador para confirmar a exclusão.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="password-displays">Senha de confirmação</Label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password-displays"
                type="password"
                placeholder="Digite a senha..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBulkDeleteOpen(false);
              setPasswordInput('');
            }}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={deletingBulk || !passwordInput}
            >
              {deletingBulk ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Confirmar Exclusão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
