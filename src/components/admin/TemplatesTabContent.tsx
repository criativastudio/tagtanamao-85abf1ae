import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Pencil, Power, PowerOff, Monitor, UserPlus, X, Search, Loader2, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DisplayTemplate {
  id: string;
  name: string;
  description: string | null;
  template_key: string;
  price: number;
  preview_url: string | null;
  is_active: boolean | null;
  features: string[] | null;
  gallery_images: string[] | null;
}

interface BusinessDisplay {
  id: string;
  qr_code: string;
  business_name: string | null;
  active_template_id: string | null;
}

interface UserTemplate {
  id: string;
  user_id: string;
  template_id: string;
  order_id: string | null;
  purchased_at: string;
  user_email?: string;
  template_name?: string;
}

const emptyForm = {
  name: '', description: '', template_key: '', price: 0, preview_url: '', is_active: true, features: [] as string[], gallery_images: [] as string[],
};

export default function TemplatesTabContent() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<DisplayTemplate[]>([]);
  const [displays, setDisplays] = useState<BusinessDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [featureInput, setFeatureInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedDisplayId, setSelectedDisplayId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [activating, setActivating] = useState(false);

  // User template release state
  const [emailSearch, setEmailSearch] = useState('');
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<{ id: string; email: string; full_name: string | null } | null>(null);
  const [releaseTemplateId, setReleaseTemplateId] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [loadingUserTemplates, setLoadingUserTemplates] = useState(false);

  useEffect(() => { fetchData(); fetchUserTemplates(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [tRes, dRes] = await Promise.all([
      supabase.from('display_templates').select('*').order('created_at', { ascending: false }),
      supabase.from('business_displays').select('id, qr_code, business_name, active_template_id'),
    ]);
    if (tRes.data) setTemplates(tRes.data.map(t => ({ ...t, features: Array.isArray(t.features) ? t.features as string[] : [] })));
    if (dRes.data) setDisplays(dRes.data);
    setLoading(false);
  };

  const fetchUserTemplates = async () => {
    setLoadingUserTemplates(true);
    const { data } = await supabase
      .from('user_templates')
      .select('*')
      .order('purchased_at', { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      // Fetch user emails and template names
      const userIds = [...new Set(data.map(ut => ut.user_id))];
      const templateIds = [...new Set(data.map(ut => ut.template_id))];

      const [profilesRes, templatesRes] = await Promise.all([
        supabase.from('profiles').select('id, email').in('id', userIds),
        supabase.from('display_templates').select('id, name').in('id', templateIds),
      ]);

      const emailMap = new Map(profilesRes.data?.map(p => [p.id, p.email]) || []);
      const nameMap = new Map(templatesRes.data?.map(t => [t.id, t.name]) || []);

      setUserTemplates(data.map(ut => ({
        ...ut,
        user_email: emailMap.get(ut.user_id) || 'Desconhecido',
        template_name: nameMap.get(ut.template_id) || 'Desconhecido',
      })));
    } else {
      setUserTemplates([]);
    }
    setLoadingUserTemplates(false);
  };

  const searchUser = async () => {
    if (!emailSearch.trim()) return;
    setSearchingUser(true);
    setFoundUser(null);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .ilike('email', `%${emailSearch.trim()}%`)
      .limit(1)
      .single();

    if (error || !data) {
      toast({ title: 'Usuário não encontrado', description: 'Verifique o email digitado.', variant: 'destructive' });
    } else {
      setFoundUser(data);
    }
    setSearchingUser(false);
  };

  const releaseTemplate = async () => {
    if (!foundUser || !releaseTemplateId) return;
    setReleasing(true);

    // Check if already exists
    const { data: existing } = await supabase
      .from('user_templates')
      .select('id')
      .eq('user_id', foundUser.id)
      .eq('template_id', releaseTemplateId)
      .maybeSingle();

    if (existing) {
      toast({ title: 'Template já liberado', description: 'Este usuário já possui este template.', variant: 'destructive' });
      setReleasing(false);
      return;
    }

    const { error } = await supabase
      .from('user_templates')
      .insert({ user_id: foundUser.id, template_id: releaseTemplateId });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Template liberado!', description: `Template liberado para ${foundUser.email}` });
      setReleaseTemplateId('');
      fetchUserTemplates();
    }
    setReleasing(false);
  };

  const revokeTemplate = async (utId: string) => {
    const { error } = await supabase.from('user_templates').delete().eq('id', utId);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Template revogado' });
      fetchUserTemplates();
    }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFeatureInput(''); setDialogOpen(true); };
  const openEdit = (t: DisplayTemplate) => {
    setEditingId(t.id);
    setForm({ name: t.name, description: t.description || '', template_key: t.template_key, price: t.price, preview_url: t.preview_url || '', is_active: t.is_active ?? true, features: t.features || [], gallery_images: t.gallery_images || [] });
    setFeatureInput(''); setDialogOpen(true);
  };

  const addFeature = () => { if (!featureInput.trim()) return; setForm(f => ({ ...f, features: [...f.features, featureInput.trim()] })); setFeatureInput(''); };
  const removeFeature = (idx: number) => setForm(f => ({ ...f, features: f.features.filter((_, i) => i !== idx) }));

  const saveTemplate = async () => {
    if (!form.name || !form.template_key) { toast({ title: 'Preencha nome e template_key', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { name: form.name, description: form.description || null, template_key: form.template_key, price: form.price, preview_url: form.preview_url || null, is_active: form.is_active, features: form.features, gallery_images: form.gallery_images };
    const { error } = editingId
      ? await supabase.from('display_templates').update(payload).eq('id', editingId)
      : await supabase.from('display_templates').insert(payload);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else toast({ title: editingId ? 'Template atualizado!' : 'Template criado!' });
    setSaving(false); setDialogOpen(false); fetchData();
  };

  const toggleActive = async (id: string, current: boolean | null) => {
    await supabase.from('display_templates').update({ is_active: !(current ?? true) }).eq('id', id);
    fetchData();
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('display_templates').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Template excluído' }); fetchData(); }
  };

  const activateOnDisplay = async () => {
    if (!selectedDisplayId || !selectedTemplateId) { toast({ title: 'Selecione display e template', variant: 'destructive' }); return; }
    setActivating(true);
    const { error } = await supabase.from('business_displays').update({ active_template_id: selectedTemplateId }).eq('id', selectedDisplayId);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Template ativado no display!' }); setSelectedDisplayId(''); setSelectedTemplateId(''); fetchData(); }
    setActivating(false);
  };

  const deactivateDisplay = async (displayId: string) => {
    const { error } = await supabase.from('business_displays').update({ active_template_id: null }).eq('id', displayId);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Template desativado' }); fetchData(); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const displaysWithTemplate = displays.filter(d => d.active_template_id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Templates disponíveis</h2>
        <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Template</Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <Card key={t.id} className={`relative ${!(t.is_active ?? true) ? 'opacity-60' : ''}`}>
            {t.preview_url && <img src={t.preview_url} alt={t.name} className="w-full h-32 object-cover rounded-t-lg" />}
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <Switch checked={t.is_active ?? true} onCheckedChange={() => toggleActive(t.id, t.is_active)} />
              </div>
              <p className="text-xs text-muted-foreground">Key: {t.template_key} · R$ {t.price.toFixed(2)}</p>
            </CardHeader>
            <CardContent className="pt-0">
              {t.description && <p className="text-sm text-muted-foreground mb-2">{t.description}</p>}
              {t.features && t.features.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-0.5 mb-3">
                  {t.features.map((f, i) => <li key={i}>• {f}</li>)}
                </ul>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(t)}><Pencil className="w-3 h-3 mr-1" /> Editar</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive"><Trash2 className="w-3 h-3 mr-1" /> Excluir</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                      <AlertDialogDescription>O template "{t.name}" será removido permanentemente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteTemplate(t.id)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Nenhum template cadastrado.</p>}
      </div>

      {/* Release Template to User */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Liberar Template para Usuário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search user by email */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <Label>Buscar usuário por email</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={emailSearch}
                  onChange={e => setEmailSearch(e.target.value)}
                  placeholder="email@exemplo.com"
                  onKeyDown={e => e.key === 'Enter' && searchUser()}
                />
                <Button onClick={searchUser} disabled={searchingUser || !emailSearch.trim()} size="sm">
                  {searchingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {foundUser && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{foundUser.full_name || 'Sem nome'}</p>
                  <p className="text-xs text-muted-foreground">{foundUser.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setFoundUser(null); setEmailSearch(''); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                <div>
                  <Label>Template</Label>
                  <Select value={releaseTemplateId} onValueChange={setReleaseTemplateId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                    <SelectContent>
                      {templates.filter(t => t.is_active).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name} (R$ {t.price.toFixed(2)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={releaseTemplate} disabled={releasing || !releaseTemplateId}>
                  {releasing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserPlus className="w-4 h-4 mr-1" />}
                  Liberar
                </Button>
              </div>
            </div>
          )}

          {/* List of released templates */}
          {loadingUserTemplates ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : userTemplates.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Templates liberados ({userTemplates.length})</h4>
              {userTemplates.map(ut => (
                <div key={ut.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{ut.user_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {ut.template_name}
                        {ut.order_id && <Badge variant="outline" className="ml-2 text-[10px]">Via compra</Badge>}
                        {!ut.order_id && <Badge variant="secondary" className="ml-2 text-[10px]">Manual</Badge>}
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-3 h-3 mr-1" /> Revogar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revogar template?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Remover o template "{ut.template_name}" do usuário {ut.user_email}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => revokeTemplate(ut.id)}>Revogar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">Nenhum template liberado ainda.</p>
          )}
        </CardContent>
      </Card>

      {/* Activate on Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Power className="w-5 h-5 text-primary" /> Ativar template em um display</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label>Display</Label>
              <Select value={selectedDisplayId} onValueChange={setSelectedDisplayId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um display" /></SelectTrigger>
                <SelectContent>
                  {displays.map(d => <SelectItem key={d.id} value={d.id}>{d.business_name || 'Sem nome'} ({d.qr_code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.is_active).map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.template_key})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={activateOnDisplay} disabled={activating || !selectedDisplayId || !selectedTemplateId}>
              <Power className="w-4 h-4 mr-1" /> Ativar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Displays with active templates */}
      {displaysWithTemplate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Monitor className="w-5 h-5 text-primary" /> Displays com template ativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {displaysWithTemplate.map(d => {
                const tmpl = templates.find(t => t.id === d.active_template_id);
                return (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <span className="font-medium text-foreground">{d.business_name || 'Sem nome'}</span>
                      <span className="text-muted-foreground text-sm ml-2">({d.qr_code})</span>
                      {tmpl && <span className="text-primary text-sm ml-2">→ {tmpl.name}</span>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => deactivateDisplay(d.id)}>
                      <PowerOff className="w-3 h-3 mr-1" /> Desativar
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Template' : 'Novo Template'}</DialogTitle>
            <DialogDescription>{editingId ? 'Atualize os dados do template.' : 'Preencha os dados para criar um novo template.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" /></div>
            <div><Label>Template Key *</Label><Input value={form.template_key} onChange={e => setForm(f => ({ ...f, template_key: e.target.value }))} className="mt-1" placeholder="ex: netflix" /></div>
            <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" /></div>
            <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} className="mt-1" /></div>

            {/* Cover Image Upload */}
            <div>
              <Label>Foto de Capa</Label>
              <div className="mt-1 space-y-2">
                {form.preview_url && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                    <img src={form.preview_url} alt="Capa" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, preview_url: '' }))}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >✕</button>
                  </div>
                )}
                <TemplateImageUploader
                  onUploaded={(url) => setForm(f => ({ ...f, preview_url: url }))}
                  label="Enviar capa"
                />
              </div>
            </div>

            {/* Gallery Images Upload */}
            <div>
              <Label>Galeria de Fotos ({form.gallery_images.length}/5)</Label>
              <div className="mt-1 space-y-2">
                {form.gallery_images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {form.gallery_images.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                        <img src={url} alt={`Galeria ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, gallery_images: f.gallery_images.filter((_, i) => i !== idx) }))}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {form.gallery_images.length < 5 && (
                  <TemplateImageUploader
                    onUploaded={(url) => setForm(f => ({ ...f, gallery_images: [...f.gallery_images, url] }))}
                    label="Adicionar foto"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Ativo</Label></div>
            <div>
              <Label>Features</Label>
              <div className="flex gap-2 mt-1">
                <Input value={featureInput} onChange={e => setFeatureInput(e.target.value)} placeholder="Adicionar feature" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())} />
                <Button type="button" size="sm" onClick={addFeature}>+</Button>
              </div>
              <ul className="mt-2 space-y-1">
                {form.features.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-sm bg-muted/50 px-2 py-1 rounded">
                    <span>{f}</span>
                    <button onClick={() => removeFeature(i)} className="text-destructive hover:text-destructive/80 text-xs">✕</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveTemplate} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Image Uploader Sub-component ---------- */
function TemplateImageUploader({ onUploaded, label }: { onUploaded: (url: string) => void; label: string }) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Selecione uma imagem', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande (máx 5MB)', variant: 'destructive' });
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `templates/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('display-media')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } else {
      const { data: urlData } = supabase.storage.from('display-media').getPublicUrl(path);
      onUploaded(urlData.publicUrl);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
        {label}
      </Button>
    </div>
  );
}
