import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dog, 
  ArrowLeft, 
  Eye, 
  Edit2, 
  MapPin, 
  Gift,
  Save,
  X,
  ExternalLink,
  QrCode,
  Clock,
  Search,
  Trash2,
  AlertTriangle,
  User,
  CheckSquare,
  Square,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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

interface PetTag {
  id: string;
  qr_code: string;
  slug: string | null;
  is_activated: boolean;
  pet_name: string | null;
  pet_photo_url: string | null;
  owner_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  reward_enabled: boolean | null;
  reward_text: string | null;
  lost_mode: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ScanInfo {
  count: number;
  lastScan: string | null;
  lastLocation: string | null;
}

// Password validation is now done via backend edge function

export default function PetTagsManager() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [petTags, setPetTags] = useState<PetTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<PetTag | null>(null);
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
    pet_name: '',
    lost_mode: false,
    pet_photo_url: '',
    owner_name: '',
    phone: '',
    whatsapp: '',
    address: '',
    reward_enabled: false,
    reward_text: ''
  });

  useEffect(() => {
    if (user) {
      fetchPetTags();
    }
  }, [user]);

  const fetchPetTags = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('pet_tags')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching pet tags:', error);
        toast({
          title: 'Erro ao carregar tags',
          description: error.message,
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }
      
      if (data) {
        setPetTags(data);
        
        // Fetch all scan stats in one query for better performance
        const tagIds = data.map(tag => tag.id);
        if (tagIds.length > 0) {
          const { data: scans, error: scansError } = await supabase
            .from('qr_scans')
            .select('pet_tag_id, scanned_at, city, country')
            .in('pet_tag_id', tagIds)
            .order('scanned_at', { ascending: false });
          
          if (scansError) {
            console.error('Error fetching scans:', scansError);
          }
          
          // Process scans into stats
          const stats: Record<string, ScanInfo> = {};
          const countMap: Record<string, number> = {};
          const lastScanMap: Record<string, { scanned_at: string; city: string | null; country: string | null }> = {};
          
          (scans || []).forEach(scan => {
            if (!scan.pet_tag_id) return;
            countMap[scan.pet_tag_id] = (countMap[scan.pet_tag_id] || 0) + 1;
            if (!lastScanMap[scan.pet_tag_id]) {
              lastScanMap[scan.pet_tag_id] = scan;
            }
          });
          
          data.forEach(tag => {
            const lastScan = lastScanMap[tag.id];
            stats[tag.id] = {
              count: countMap[tag.id] || 0,
              lastScan: lastScan?.scanned_at || null,
              lastLocation: lastScan?.city ? `${lastScan.city}, ${lastScan.country}` : null
            };
          });
          
          setScanStats(stats);
        }
      }
    } catch (err) {
      console.error('Error in fetchPetTags:', err);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar as tags.',
        variant: 'destructive'
      });
    }
    
    setLoading(false);
  };

  const handleSelectTag = (tag: PetTag) => {
    setSelectedTag(tag);
    setFormData({
      pet_name: tag.pet_name || '',
      pet_photo_url: tag.pet_photo_url || '',
      owner_name: tag.owner_name || '',
      phone: tag.phone || '',
      whatsapp: tag.whatsapp || '',
      address: tag.address || '',
      reward_enabled: tag.reward_enabled || false,
      reward_text: tag.reward_text || '',
      lost_mode: tag.lost_mode || false
    });
    setEditMode(false);
  };

  const handleSave = async () => {
    if (!selectedTag) return;
    
    setSaving(true);
    
    const { error } = await supabase
      .from('pet_tags')
      .update({
        pet_name: formData.pet_name || null,
        pet_photo_url: formData.pet_photo_url || null,
        owner_name: formData.owner_name || null,
        phone: formData.phone || null,
        whatsapp: formData.whatsapp || null,
        address: formData.address || null,
        reward_enabled: formData.reward_enabled,
        reward_text: formData.reward_text || null,
        lost_mode: formData.lost_mode,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedTag.id);
    
    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Tag atualizada!',
        description: 'As informações foram salvas com sucesso.'
      });
      setEditMode(false);
      fetchPetTags();
      setSelectedTag({ ...selectedTag, ...formData });
    }
    
    setSaving(false);
  };

  const handlePhotoUpload = (url: string) => {
    setFormData(prev => ({ ...prev, pet_photo_url: url }));
  };

  const handlePhotoRemove = () => {
    setFormData(prev => ({ ...prev, pet_photo_url: '' }));
  };

  const handleDelete = async (tagId: string) => {
    const { error } = await supabase
      .from('pet_tags')
      .delete()
      .eq('id', tagId);

    if (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Tag excluída',
        description: 'A tag foi removida com sucesso.'
      });
      if (selectedTag?.id === tagId) {
        setSelectedTag(null);
      }
      fetchPetTags();
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
    if (selectedIds.size === filteredTags.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTags.map(t => t.id)));
    }
  };

  // Bulk delete with password confirmation via backend
  const handleBulkDelete = async () => {
    if (!passwordInput) {
      toast({
        title: 'Senha obrigatória',
        description: 'Digite a senha de confirmação.',
        variant: 'destructive'
      });
      return;
    }

    setDeletingBulk(true);
    
    try {
      // Validate password via backend
      const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-admin-password', {
        body: { password: passwordInput }
      });

      if (validationError) {
        throw new Error('Erro ao validar senha');
      }

      if (!validationResult?.valid) {
        toast({
          title: 'Senha incorreta',
          description: validationResult?.error || 'A senha de confirmação está incorreta.',
          variant: 'destructive'
        });
        setDeletingBulk(false);
        return;
      }

      // Password is valid, proceed with deletion
      const idsToDelete = Array.from(selectedIds);
      
      const { error } = await supabase
        .from('pet_tags')
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
          title: 'Tags excluídas',
          description: `${idsToDelete.length} tags foram removidas com sucesso.`
        });
        if (selectedTag && selectedIds.has(selectedTag.id)) {
          setSelectedTag(null);
        }
        setSelectedIds(new Set());
        fetchPetTags();
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao processar exclusão.',
        variant: 'destructive'
      });
    }
    
    setDeletingBulk(false);
    setBulkDeleteOpen(false);
    setPasswordInput('');
  };

  // Filter tags based on search term
  const filteredTags = petTags.filter(tag => {
    const term = searchTerm.toLowerCase();
    return (
      tag.qr_code.toLowerCase().includes(term) ||
      tag.id.toLowerCase().includes(term) ||
      (tag.pet_name || '').toLowerCase().includes(term) ||
      (tag.owner_name || '').toLowerCase().includes(term) ||
      (tag.phone || '').toLowerCase().includes(term) ||
      (tag.whatsapp || '').toLowerCase().includes(term)
    );
  });

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
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Dog className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Tags Pet</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{petTags.length} tags</span>
                  <span className="text-primary">• {petTags.filter(t => t.is_activated).length} ativas</span>
                  <span className="text-muted-foreground">• {petTags.filter(t => !t.is_activated).length} inativas</span>
                </div>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => fetchPetTags()}
            disabled={loading}
            title="Atualizar lista"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tags List */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground">SUAS TAGS</h2>
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
              {profile?.is_admin && filteredTags.length > 0 && (
                <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/30">
                  <Checkbox
                    id="select-all"
                    checked={selectedIds.size === filteredTags.length && filteredTags.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm cursor-pointer">
                    Selecionar todos ({filteredTags.length})
                  </Label>
                </div>
              )}
              
              {petTags.length === 0 ? (
                <div className="text-center py-8">
                  <Dog className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">Nenhuma tag cadastrada</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => navigate('/dashboard/activate')}
                  >
                    Ativar Tag
                  </Button>
                </div>
              ) : filteredTags.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">Nenhuma tag encontrada</p>
                  <p className="text-xs text-muted-foreground mt-1">Tente outro termo de busca</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {filteredTags.map((tag) => (
                    <motion.div
                      key={tag.id}
                      whileHover={{ scale: 1.02 }}
                      className={`relative flex items-center gap-2 p-3 rounded-lg transition-colors ${
                        selectedTag?.id === tag.id 
                          ? 'bg-primary/20 border border-primary/30' 
                          : selectedIds.has(tag.id)
                            ? 'bg-destructive/10 border border-destructive/30'
                            : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      {/* Checkbox for bulk selection (Admin only) */}
                      {profile?.is_admin && (
                        <Checkbox
                          checked={selectedIds.has(tag.id)}
                          onCheckedChange={() => toggleSelection(tag.id)}
                          className="shrink-0"
                        />
                      )}
                      
                      <button
                        onClick={() => handleSelectTag(tag)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        {tag.pet_photo_url ? (
                          <img 
                            src={tag.pet_photo_url}
                            alt={tag.pet_name || 'Pet'}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <Dog className="w-6 h-6 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {tag.pet_name || 'Pet sem nome'}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">{tag.qr_code}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Eye className="w-3 h-3" />
                            <span>{scanStats[tag.id]?.count || 0} leituras</span>
                          </div>
                        </div>
                      </button>
                      
                      {/* Delete button */}
                      {deleteConfirm === tag.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDelete(tag.id)}
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
                          onClick={() => setDeleteConfirm(tag.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                      
                      <div className={`w-2 h-2 rounded-full ${tag.is_activated ? 'bg-primary' : 'bg-muted'}`} />
                    </motion.div>
                  ))}
                </div>
              )}
              
              {/* Results count */}
              {searchTerm && filteredTags.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  {filteredTags.length} de {petTags.length} tags encontradas
                </p>
              )}
            </div>
          </div>

          {/* Tag Details / Editor */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedTag ? (
                <motion.div
                  key={selectedTag.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass-card rounded-xl overflow-hidden"
                >
                  {/* Tag Header */}
                  <div className="relative h-48 bg-gradient-to-br from-primary/30 to-primary/10">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {formData.pet_photo_url ? (
                        <img 
                          src={formData.pet_photo_url} 
                          alt={formData.pet_name || 'Pet'}
                          className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-xl"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-background/80 flex items-center justify-center border-4 border-background shadow-xl">
                          <Dog className="w-16 h-16 text-primary" />
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => navigate(`/dashboard/tags/${selectedTag.id}`)}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Personalizar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(`/pet/${selectedTag.qr_code}`, '_blank')}
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
                        <Eye className="w-5 h-5 mx-auto mb-1 text-primary" />
                        <p className="text-2xl font-bold text-foreground">{scanStats[selectedTag.id]?.count || 0}</p>
                        <p className="text-xs text-muted-foreground">Leituras</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <Clock className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                        <p className="text-sm font-medium text-foreground">
                          {scanStats[selectedTag.id]?.lastScan 
                            ? new Date(scanStats[selectedTag.id].lastScan!).toLocaleDateString('pt-BR')
                            : '-'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">Última leitura</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <MapPin className="w-5 h-5 mx-auto mb-1 text-orange-400" />
                        <p className="text-sm font-medium text-foreground truncate">
                          {scanStats[selectedTag.id]?.lastLocation || '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">Local</p>
                      </div>
                    </div>

                    {/* QR Code Info */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 mb-6">
                      <QrCode className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Código do Produto</p>
                        <p className="font-mono text-sm text-foreground">{selectedTag.qr_code}</p>
                      </div>
                    </div>

                    {/* Form */}
                    <div className="space-y-4">
                      {editMode && user && (
                        <div>
                          <Label>Foto do Pet</Label>
                          <ImageUpload
                            userId={user.id}
                            currentUrl={formData.pet_photo_url || null}
                            onUpload={handlePhotoUpload}
                            onRemove={handlePhotoRemove}
                            type="profile"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="pet_name">Nome do Pet</Label>
                          <Input
                            id="pet_name"
                            value={formData.pet_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, pet_name: e.target.value }))}
                            disabled={!editMode}
                            placeholder="Ex: Rex"
                          />
                        </div>
                        <div>
                          <Label htmlFor="owner_name">Nome do Dono</Label>
                          <Input
                            id="owner_name"
                            value={formData.owner_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                            disabled={!editMode}
                            placeholder="Ex: João Silva"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="phone">Telefone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            disabled={!editMode}
                            placeholder="Ex: (11) 99999-9999"
                          />
                        </div>
                        <div>
                          <Label htmlFor="whatsapp">WhatsApp</Label>
                          <Input
                            id="whatsapp"
                            value={formData.whatsapp}
                            onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                            disabled={!editMode}
                            placeholder="Ex: 5511999999999"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="address">Endereço</Label>
                        <Textarea
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          disabled={!editMode}
                          placeholder="Endereço para localização no mapa"
                          rows={2}
                        />
                      </div>

                      {/* Lost Mode Section - Important privacy control */}
                      <div className={`p-4 rounded-lg border-2 ${formData.lost_mode ? 'border-red-500 bg-red-500/10' : 'border-primary/30 bg-primary/5'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {formData.lost_mode ? (
                              <ShieldAlert className="w-5 h-5 text-red-500" />
                            ) : (
                              <ShieldCheck className="w-5 h-5 text-primary" />
                            )}
                            <Label htmlFor="lost_mode" className={formData.lost_mode ? 'text-red-500 font-semibold' : 'font-semibold'}>
                              {formData.lost_mode ? 'Pet Perdido!' : 'Pet Seguro em Casa'}
                            </Label>
                          </div>
                          <Switch
                            id="lost_mode"
                            checked={formData.lost_mode}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, lost_mode: checked }))}
                            disabled={!editMode}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formData.lost_mode 
                            ? 'Seus dados de contato (telefone, WhatsApp, endereço) estão VISÍVEIS para quem escanear o QR code.'
                            : 'Seus dados de contato estão PROTEGIDOS. Ative o modo "Pet Perdido" para permitir que quem encontrar seu pet entre em contato.'}
                        </p>
                      </div>

                      {/* Reward Section */}
                      <div className="p-4 rounded-lg border border-border bg-muted/20">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Gift className="w-5 h-5 text-primary" />
                            <Label htmlFor="reward">Recompensa</Label>
                          </div>
                          <Switch
                            id="reward"
                            checked={formData.reward_enabled}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reward_enabled: checked }))}
                            disabled={!editMode}
                          />
                        </div>
                        {formData.reward_enabled && (
                          <Textarea
                            value={formData.reward_text}
                            onChange={(e) => setFormData(prev => ({ ...prev, reward_text: e.target.value }))}
                            disabled={!editMode}
                            placeholder="Ex: Ofereço R$ 100 de recompensa para quem encontrar meu pet!"
                            rows={2}
                          />
                        )}
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
                  <Dog className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Selecione uma Tag</h3>
                  <p className="text-muted-foreground">
                    Escolha uma tag na lista ao lado para ver e editar as informações
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
              Excluir {selectedIds.size} tags
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Digite a senha de administrador para confirmar a exclusão.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="password">Senha de confirmação</Label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
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
