import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Edit2, Save, X,
  Video, Youtube, Eye, EyeOff, Upload, Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SiteSection {
  id: string;
  title: string;
  description: string | null;
  section_type: string;
  is_active: boolean;
  position: number;
  config: Record<string, any>;
  media_url: string | null;
  created_at: string;
}

const extractYoutubeId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
};

export default function SiteSectionsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [sections, setSections] = useState<SiteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('video');
  const [newMediaMode, setNewMediaMode] = useState<'youtube' | 'upload'>('youtube');
  const [newYoutubeUrl, setNewYoutubeUrl] = useState('');
  const [newAutoplay, setNewAutoplay] = useState(true);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState('');
  const [editMediaMode, setEditMediaMode] = useState<'youtube' | 'upload'>('youtube');
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('');
  const [editAutoplay, setEditAutoplay] = useState(true);
  const [editMediaUrl, setEditMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    const { data, error } = await supabase
      .from('site_sections')
      .select('*')
      .order('position', { ascending: true });

    if (data) setSections(data as unknown as SiteSection[]);
    if (error) toast({ title: 'Erro ao carregar seções', description: error.message, variant: 'destructive' });
    setLoading(false);
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewType('video');
    setNewMediaMode('youtube');
    setNewYoutubeUrl('');
    setNewAutoplay(true);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;

    const config: Record<string, any> = { autoplay: newAutoplay };
    let mediaUrl: string | null = null;

    if (newType === 'video' && newMediaMode === 'youtube' && newYoutubeUrl) {
      const videoId = extractYoutubeId(newYoutubeUrl);
      if (!videoId) {
        toast({ title: 'URL do YouTube inválida', variant: 'destructive' });
        return;
      }
      config.youtubeUrl = newYoutubeUrl;
      config.youtubeId = videoId;
    }

    const maxPos = sections.length > 0 ? Math.max(...sections.map(s => s.position)) + 1 : 0;

    const { data, error } = await supabase
      .from('site_sections')
      .insert({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        section_type: newType,
        config,
        media_url: mediaUrl,
        position: maxPos,
        is_active: true,
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao criar seção', description: error.message, variant: 'destructive' });
      return;
    }

    setSections(prev => [...prev, data as unknown as SiteSection]);
    setShowCreateDialog(false);
    resetCreateForm();
    toast({ title: 'Seção criada com sucesso!' });
  };

  const handleUploadVideo = async (file: File, sectionId?: string) => {
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Limite de 50MB.', variant: 'destructive' });
      return null;
    }
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Formato inválido', description: 'Use MP4, WebM ou MOV.', variant: 'destructive' });
      return null;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from('site-videos').upload(path, file);
    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
      setUploading(false);
      return null;
    }

    const { data: urlData } = supabase.storage.from('site-videos').getPublicUrl(path);
    setUploading(false);
    return urlData.publicUrl;
  };

  const handleCreateWithUpload = async (file: File) => {
    const url = await handleUploadVideo(file);
    if (!url) return;

    const config: Record<string, any> = { autoplay: newAutoplay, videoUrl: url };
    const maxPos = sections.length > 0 ? Math.max(...sections.map(s => s.position)) + 1 : 0;

    const { data, error } = await supabase
      .from('site_sections')
      .insert({
        title: newTitle.trim() || 'Nova Seção',
        description: newDescription.trim() || null,
        section_type: newType,
        config,
        media_url: url,
        position: maxPos,
        is_active: true,
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao criar seção', description: error.message, variant: 'destructive' });
      return;
    }

    setSections(prev => [...prev, data as unknown as SiteSection]);
    setShowCreateDialog(false);
    resetCreateForm();
    toast({ title: 'Seção criada com vídeo!' });
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('site_sections').update({ is_active: !current } as any).eq('id', id);
    setSections(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s));
  };

  const moveSection = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...sections].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex(s => s.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const tempPos = sorted[idx].position;
    sorted[idx].position = sorted[swapIdx].position;
    sorted[swapIdx].position = tempPos;

    await Promise.all([
      supabase.from('site_sections').update({ position: sorted[idx].position } as any).eq('id', sorted[idx].id),
      supabase.from('site_sections').update({ position: sorted[swapIdx].position } as any).eq('id', sorted[swapIdx].id),
    ]);

    setSections([...sorted].sort((a, b) => a.position - b.position));
  };

  const deleteSection = async (id: string) => {
    const section = sections.find(s => s.id === id);
    // Delete uploaded video if exists
    if (section?.media_url?.includes('site-videos')) {
      const path = section.media_url.split('/site-videos/')[1];
      if (path) await supabase.storage.from('site-videos').remove([path]);
    }

    await supabase.from('site_sections').delete().eq('id', id);
    setSections(prev => prev.filter(s => s.id !== id));
    toast({ title: 'Seção excluída' });
  };

  const startEditing = (section: SiteSection) => {
    setEditingId(section.id);
    setEditTitle(section.title);
    setEditDescription(section.description || '');
    setEditType(section.section_type);
    setEditAutoplay(section.config?.autoplay ?? true);
    setEditMediaUrl(section.media_url);
    if (section.config?.youtubeUrl) {
      setEditMediaMode('youtube');
      setEditYoutubeUrl(section.config.youtubeUrl);
    } else if (section.media_url) {
      setEditMediaMode('upload');
      setEditYoutubeUrl('');
    } else {
      setEditMediaMode('youtube');
      setEditYoutubeUrl('');
    }
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;

    const config: Record<string, any> = { autoplay: editAutoplay };
    let mediaUrl = editMediaUrl;

    if (editType === 'video') {
      if (editMediaMode === 'youtube' && editYoutubeUrl) {
        const videoId = extractYoutubeId(editYoutubeUrl);
        if (!videoId) {
          toast({ title: 'URL do YouTube inválida', variant: 'destructive' });
          return;
        }
        config.youtubeUrl = editYoutubeUrl;
        config.youtubeId = videoId;
      } else if (editMediaUrl) {
        config.videoUrl = editMediaUrl;
      }
    }

    const { error } = await supabase
      .from('site_sections')
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        section_type: editType,
        config,
        media_url: mediaUrl,
      } as any)
      .eq('id', editingId);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }

    setSections(prev =>
      prev.map(s =>
        s.id === editingId
          ? { ...s, title: editTitle.trim(), description: editDescription.trim() || null, section_type: editType, config, media_url: mediaUrl }
          : s
      )
    );
    setEditingId(null);
    toast({ title: 'Seção atualizada!' });
  };

  const handleEditUpload = async (file: File) => {
    const url = await handleUploadVideo(file, editingId!);
    if (url) {
      setEditMediaUrl(url);
      setEditMediaMode('upload');
      setEditYoutubeUrl('');
    }
  };

  const renderMediaPreview = (section: SiteSection) => {
    const config = section.config || {};
    if (config.youtubeId) {
      return (
        <iframe
          className="w-full aspect-video rounded-lg"
          src={`https://www.youtube.com/embed/${config.youtubeId}?autoplay=0`}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={section.title}
        />
      );
    }
    if (section.media_url || config.videoUrl) {
      return (
        <video className="w-full aspect-video rounded-lg object-cover" controls>
          <source src={section.media_url || config.videoUrl} />
        </video>
      );
    }
    return (
      <div className="w-full aspect-video rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
        <Video className="w-8 h-8" />
      </div>
    );
  };

  return (
<motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4">
              <img src={logoHorizontal} alt="Tag Tá Na Mão" className="h-8" />
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Tecnologia que protege quem você ama. Tags e Displays inteligentes com QR Code.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/tagtanamao"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>

              <a
                href="https://www.facebook.com/tagtanamao"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>

              <a
                href="https://wa.me/556993248849"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
              </a>

              <a
                href="https://www.tiktok.com/@tagtanamao"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Music className="w-4 h-4" />
              </a>
            </div>
          </motion.div>

      {/* Section List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : sections.length === 0 ? (
        <Card className="p-12 text-center">
          <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma seção criada</h3>
          <p className="text-muted-foreground mb-4">Adicione seções dinâmicas à sua landing page.</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Criar primeira seção
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {sections.map((section, index) => (
              <motion.div
                key={section.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className={`overflow-hidden ${!section.is_active ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4 md:p-6">
                    {editingId === section.id ? (
                      /* Edit Mode */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-foreground">Editando seção</h3>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                            <Button size="sm" onClick={saveEdit}>
                              <Save className="w-4 h-4 mr-1" /> Salvar
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Título</Label>
                            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={editType} onValueChange={setEditType}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="video">Vídeo</SelectItem>
                                <SelectItem value="pet_slides">Pet Slides</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} />
                        </div>

                        {editType === 'video' && (
                          <>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={editMediaMode === 'youtube' ? 'default' : 'outline'}
                                onClick={() => setEditMediaMode('youtube')}
                              >
                                <Youtube className="w-4 h-4 mr-1" /> YouTube
                              </Button>
                              <Button
                                size="sm"
                                variant={editMediaMode === 'upload' ? 'default' : 'outline'}
                                onClick={() => setEditMediaMode('upload')}
                              >
                                <Upload className="w-4 h-4 mr-1" /> Upload
                              </Button>
                            </div>

                            {editMediaMode === 'youtube' ? (
                              <div className="space-y-2">
                                <Label>URL do YouTube</Label>
                                <Input
                                  value={editYoutubeUrl}
                                  onChange={e => setEditYoutubeUrl(e.target.value)}
                                  placeholder="https://youtube.com/watch?v=..."
                                />
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Label>Vídeo</Label>
                                {editMediaUrl && (
                                  <video className="w-full max-w-xs aspect-video rounded-lg" controls>
                                    <source src={editMediaUrl} />
                                  </video>
                                )}
                                <input
                                  ref={editFileInputRef}
                                  type="file"
                                  accept="video/mp4,video/webm,video/quicktime"
                                  className="hidden"
                                  onChange={e => {
                                    const f = e.target.files?.[0];
                                    if (f) handleEditUpload(f);
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => editFileInputRef.current?.click()}
                                  disabled={uploading}
                                >
                                  <Upload className="w-4 h-4 mr-1" />
                                  {uploading ? 'Enviando...' : 'Enviar vídeo'}
                                </Button>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <Switch checked={editAutoplay} onCheckedChange={setEditAutoplay} />
                              <Label>Autoplay</Label>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="w-full md:w-64 shrink-0">
                          {renderMediaPreview(section)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-foreground text-lg">{section.title}</h3>
                              {section.description && (
                                <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                                  {section.section_type === 'pet_slides' ? 'Pet Slides' : 'Vídeo'}
                                </span>
                                {section.config?.autoplay && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Autoplay</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex md:flex-col items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" onClick={() => moveSection(section.id, 'up')} disabled={index === 0}>
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => moveSection(section.id, 'down')} disabled={index === sections.length - 1}>
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => toggleActive(section.id, section.is_active)}>
                            {section.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => startEditing(section)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteSection(section.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={v => { setShowCreateDialog(v); if (!v) resetCreateForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Seção</DialogTitle>
            <DialogDescription>Adicione uma seção dinâmica à landing page.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Vídeo de apresentação" />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} rows={2} placeholder="Descrição opcional da seção" />
            </div>

            <div className="space-y-2">
              <Label>Tipo de seção</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="pet_slides">Pet Slides</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newType === 'video' && (
              <>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={newMediaMode === 'youtube' ? 'default' : 'outline'}
                    onClick={() => setNewMediaMode('youtube')}
                  >
                    <Youtube className="w-4 h-4 mr-1" /> YouTube
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={newMediaMode === 'upload' ? 'default' : 'outline'}
                    onClick={() => setNewMediaMode('upload')}
                  >
                    <Upload className="w-4 h-4 mr-1" /> Upload
                  </Button>
                </div>

                {newMediaMode === 'youtube' ? (
                  <div className="space-y-2">
                    <Label>URL do YouTube</Label>
                    <Input
                      value={newYoutubeUrl}
                      onChange={e => setNewYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                    {newYoutubeUrl && extractYoutubeId(newYoutubeUrl) && (
                      <iframe
                        className="w-full aspect-video rounded-lg mt-2"
                        src={`https://www.youtube.com/embed/${extractYoutubeId(newYoutubeUrl)}`}
                        allowFullScreen
                        title="Preview"
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Arquivo de vídeo (max 50MB)</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleCreateWithUpload(f);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Enviando...' : 'Selecionar vídeo'}
                    </Button>
                    <p className="text-xs text-muted-foreground">Formatos: MP4, WebM, MOV</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Switch checked={newAutoplay} onCheckedChange={setNewAutoplay} />
                  <Label>Autoplay ao abrir o site</Label>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            {(newMediaMode === 'youtube' || newType !== 'video') && (
              <Button onClick={handleCreate} disabled={!newTitle.trim() || uploading}>Criar Seção</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
