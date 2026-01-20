import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import QRCodeLib from 'qrcode';
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  QrCode,
  ShieldCheck,
  Layout,
  Settings,
  LayoutDashboard,
  FileDown,
  FolderPlus,
  Grid3X3,
  X,
  Download,
  Plus,
  Lock,
  Eye,
  EyeOff,
  Bell,
  MessageSquare,
  Phone,
  Mail,
  Key,
  Hash,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Types
interface PixSettings {
  pix_key: string;
  pix_key_type: 'phone' | 'email' | 'cpf' | 'cnpj' | 'random';
  admin_whatsapp: string;
  admin_notification_enabled: boolean;
}

interface QRCode {
  id: string;
  qr_code: string;
  type: 'pet_tag' | 'business_display';
}

interface Category {
  id: string;
  name: string;
  codes: QRCode[];
}

const MM_TO_PIXELS = 11.811;
const QR_DIAMETER_MM = 23;
const QR_DIAMETER_PX = Math.round(QR_DIAMETER_MM * MM_TO_PIXELS);
const SHEET_SIZE_MM = 1000;

const keyTypeLabels = {
  phone: { label: 'Telefone', icon: Phone, placeholder: '11999999999' },
  email: { label: 'E-mail', icon: Mail, placeholder: 'email@exemplo.com' },
  cpf: { label: 'CPF', icon: Key, placeholder: '00000000000' },
  cnpj: { label: 'CNPJ', icon: Key, placeholder: '00000000000000' },
  random: { label: 'Chave Aleatória', icon: Hash, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
};

const createQRCodeCanvas = async (code: QRCode): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  
  canvas.width = QR_DIAMETER_PX;
  canvas.height = QR_DIAMETER_PX;
  
  const centerX = QR_DIAMETER_PX / 2;
  const centerY = QR_DIAMETER_PX / 2;
  const radius = QR_DIAMETER_PX / 2;
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
  ctx.strokeStyle = '#FF00FF';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  
  const qrSize = Math.round(QR_DIAMETER_PX * 0.68);
  const url = `${window.location.origin}/pet/${code.qr_code}`;
  
  const qrDataUrl = await QRCodeLib.toDataURL(url, {
    width: qrSize,
    margin: 0,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'H'
  });
  
  const img = new Image();
  img.src = qrDataUrl;
  
  await new Promise<void>((resolve) => {
    img.onload = () => {
      const qrX = (QR_DIAMETER_PX - qrSize) / 2;
      const qrY = Math.round(QR_DIAMETER_PX * 0.12);
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      resolve();
    };
  });
  
  ctx.fillStyle = '#000000';
  ctx.font = `${Math.round(QR_DIAMETER_PX * 0.08)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(code.qr_code, centerX, QR_DIAMETER_PX * 0.90);
  
  return canvas;
};

export default function SettingsPage() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // PIX Settings
  const [pixSettings, setPixSettings] = useState<PixSettings>({
    pix_key: '',
    pix_key_type: 'phone',
    admin_whatsapp: '',
    admin_notification_enabled: true,
  });
  
  // Security Settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // QR Export Settings
  const [petTags, setPetTags] = useState<QRCode[]>([]);
  const [displays, setDisplays] = useState<QRCode[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportCategory, setExportCategory] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  
  // Landing Page Settings
  const [heroSettings, setHeroSettings] = useState({
    title: 'Proteja Quem Você Ama',
    subtitle: 'Com Tecnologia Inteligente',
    description: 'Tags QR inteligentes que conectam seus pets e negócios ao mundo digital.',
    ctaText: 'Comprar Agora',
  });

  useEffect(() => {
    if (!authLoading && profile && !profile.is_admin) {
      navigate('/dashboard');
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive"
      });
    }
  }, [profile, authLoading, navigate, toast]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchPixSettings(), fetchQRCodes()]);
    setLoading(false);
  };

  const fetchPixSettings = async () => {
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', ['pix_key', 'pix_key_type', 'admin_whatsapp', 'admin_notification_enabled']);

      const settingsMap: Record<string, string> = {};
      data?.forEach(item => {
        settingsMap[item.key] = item.value;
      });

      setPixSettings({
        pix_key: settingsMap['pix_key'] || '',
        pix_key_type: (settingsMap['pix_key_type'] as PixSettings['pix_key_type']) || 'phone',
        admin_whatsapp: settingsMap['admin_whatsapp'] || '',
        admin_notification_enabled: settingsMap['admin_notification_enabled'] === 'true',
      });
    } catch (error) {
      console.error('Error fetching PIX settings:', error);
    }
  };

  const fetchQRCodes = async () => {
    const [petResult, displayResult] = await Promise.all([
      supabase.from('pet_tags').select('id, qr_code').order('created_at', { ascending: false }),
      supabase.from('business_displays').select('id, qr_code').order('created_at', { ascending: false })
    ]);

    if (petResult.data) {
      setPetTags(petResult.data.map(p => ({ ...p, type: 'pet_tag' as const })));
    }
    if (displayResult.data) {
      setDisplays(displayResult.data.map(d => ({ ...d, type: 'business_display' as const })));
    }
  };

  // PIX Save Handler
  const handleSavePix = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'pix_key', value: pixSettings.pix_key, description: 'Chave PIX' },
        { key: 'pix_key_type', value: pixSettings.pix_key_type, description: 'Tipo da chave PIX' },
        { key: 'admin_whatsapp', value: pixSettings.admin_whatsapp, description: 'WhatsApp admin' },
        { key: 'admin_notification_enabled', value: pixSettings.admin_notification_enabled.toString(), description: 'Notificações' },
      ];

      for (const update of updates) {
        await supabase.from('admin_settings').upsert(update, { onConflict: 'key' });
      }

      toast({ title: 'Sucesso', description: 'Configurações PIX salvas!' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Security Save Handler
  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSaveSecurity = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Erro', description: 'Mínimo 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Erro', description: 'Senhas não conferem.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: validationResult } = await supabase.functions.invoke('validate-admin-password', {
        body: { password: currentPassword }
      });

      if (!validationResult?.valid) {
        toast({ title: 'Erro', description: 'Senha atual incorreta.', variant: 'destructive' });
        setSaving(false);
        return;
      }

      const newPasswordHash = await hashPassword(newPassword);
      await supabase.from('admin_settings').upsert({
        key: 'bulk_delete_password_hash',
        value: newPasswordHash,
        description: 'Hash da senha de exclusão'
      }, { onConflict: 'key' });

      toast({ title: 'Sucesso', description: 'Senha alterada!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // QR Export Handlers
  const allCodes = [...petTags, ...displays];

  const createCategory = () => {
    if (!newCategoryName.trim()) return;
    setCategories(prev => [...prev, { id: crypto.randomUUID(), name: newCategoryName.trim(), codes: [] }]);
    setNewCategoryName('');
    setShowCategoryDialog(false);
    toast({ title: 'Categoria criada!' });
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const addSelectedToCategory = (categoryId: string) => {
    const selected = allCodes.filter(c => selectedCodes.has(c.id));
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        const existingIds = new Set(cat.codes.map(c => c.id));
        return { ...cat, codes: [...cat.codes, ...selected.filter(c => !existingIds.has(c.id))] };
      }
      return cat;
    }));
    setSelectedCodes(new Set());
    toast({ title: `${selected.length} código(s) adicionado(s)!` });
  };

  const toggleSelect = (id: string) => {
    setSelectedCodes(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const exportCategoryAsSVG = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category || category.codes.length === 0) {
      toast({ title: 'Erro', description: 'Categoria vazia.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Gerando arquivo...' });

    try {
      const padding = 2;
      const cellSize = QR_DIAMETER_MM + padding;
      const cols = Math.floor(SHEET_SIZE_MM / cellSize);
      const maxCodes = cols * cols;
      const codesToExport = category.codes.slice(0, maxCodes);
      
      const qrImages: string[] = [];
      for (const code of codesToExport) {
        const canvas = await createQRCodeCanvas(code);
        qrImages.push(canvas.toDataURL('image/png'));
      }

      let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${SHEET_SIZE_MM}mm" height="${SHEET_SIZE_MM}mm" viewBox="0 0 ${SHEET_SIZE_MM} ${SHEET_SIZE_MM}">
  <rect width="100%" height="100%" fill="white"/>
  <g id="CutLines">`;

      codesToExport.forEach((_, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;
        svgContent += `<circle cx="${x}" cy="${y}" r="${QR_DIAMETER_MM / 2}" fill="none" stroke="#FF00FF" stroke-width="0.1"/>`;
      });

      svgContent += `</g><g id="QRCodes">`;

      codesToExport.forEach((_, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;
        svgContent += `<image x="${x - QR_DIAMETER_MM/2}" y="${y - QR_DIAMETER_MM/2}" width="${QR_DIAMETER_MM}" height="${QR_DIAMETER_MM}" xlink:href="${qrImages[index]}"/>`;
      });

      svgContent += `</g></svg>`;

      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.download = `qrcodes-${category.name}-${codesToExport.length}.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();

      setShowExportDialog(false);
      toast({ title: 'Exportado!', description: `${codesToExport.length} QR Codes exportados.` });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile?.is_admin) return null;

  const KeyIcon = keyTypeLabels[pixSettings.pix_key_type].icon;

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Todas as configurações do sistema em um só lugar</p>
        </div>
      </div>

      <div className="max-w-4xl space-y-4">
        <Accordion type="multiple" defaultValue={['pix']} className="space-y-4">
          {/* PIX Settings */}
          <AccordionItem value="pix" className="glass-card rounded-xl border-0 overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <QrCode className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Configurações PIX</h3>
                  <p className="text-sm text-muted-foreground">Chave PIX e notificações de pedidos</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-6">
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo da Chave</Label>
                      <Select
                        value={pixSettings.pix_key_type}
                        onValueChange={(value) => setPixSettings(prev => ({ ...prev, pix_key_type: value as PixSettings['pix_key_type'] }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(keyTypeLabels).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Chave PIX</Label>
                      <div className="relative">
                        <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={pixSettings.pix_key}
                          onChange={(e) => setPixSettings(prev => ({ ...prev, pix_key: e.target.value }))}
                          placeholder={keyTypeLabels[pixSettings.pix_key_type].placeholder}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div>
                      <Label>Notificações WhatsApp</Label>
                      <p className="text-xs text-muted-foreground">Receber alerta de novos pedidos</p>
                    </div>
                    <Switch
                      checked={pixSettings.admin_notification_enabled}
                      onCheckedChange={(checked) => setPixSettings(prev => ({ ...prev, admin_notification_enabled: checked }))}
                    />
                  </div>
                  
                  {pixSettings.admin_notification_enabled && (
                    <div className="space-y-2">
                      <Label>WhatsApp do Admin</Label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={pixSettings.admin_whatsapp}
                          onChange={(e) => setPixSettings(prev => ({ ...prev, admin_whatsapp: e.target.value }))}
                          placeholder="5511999999999"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <Button onClick={handleSavePix} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar PIX
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Security Settings */}
          <AccordionItem value="security" className="glass-card rounded-xl border-0 overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <ShieldCheck className="w-5 h-5 text-red-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Segurança</h3>
                  <p className="text-sm text-muted-foreground">Senha de exclusão em massa</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Senha Atual</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Senha atual"
                      className="pl-10 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="pl-10 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a senha"
                  />
                </div>
                
                <Button onClick={handleSaveSecurity} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Alterar Senha
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* QR Export Settings */}
          <AccordionItem value="qr-export" className="glass-card rounded-xl border-0 overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <FileDown className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Exportação para Impressão</h3>
                  <p className="text-sm text-muted-foreground">Organize e exporte QR Codes em 1m²</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-6">
                {/* Categories */}
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4" />
                    Categorias ({categories.length})
                  </h4>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowCategoryDialog(true)}>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Nova
                    </Button>
                    {categories.length > 0 && (
                      <Button variant="hero" size="sm" onClick={() => setShowExportDialog(true)}>
                        <FileDown className="w-4 h-4 mr-2" />
                        Exportar 1m²
                      </Button>
                    )}
                  </div>
                </div>

                {categories.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categories.map((category) => (
                      <div key={category.id} className="p-3 rounded-lg border bg-card/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{category.name}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteCategory(category.id)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{category.codes.length} códigos</p>
                        <div className="flex gap-1">
                          {selectedCodes.size > 0 && (
                            <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => addSelectedToCategory(category.id)}>
                              <Plus className="w-3 h-3 mr-1" />
                              +{selectedCodes.size}
                            </Button>
                          )}
                          {category.codes.length > 0 && (
                            <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => exportCategoryAsSVG(category.id)}>
                              <Download className="w-3 h-3 mr-1" />
                              SVG
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Available QR Codes */}
                <div>
                  <h4 className="font-medium mb-3">QR Codes Disponíveis ({allCodes.length})</h4>
                  {allCodes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum QR Code encontrado.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-muted/20 rounded-lg">
                      {allCodes.slice(0, 100).map((code) => (
                        <div
                          key={code.id}
                          onClick={() => toggleSelect(code.id)}
                          className={`p-2 rounded text-center cursor-pointer transition-all text-xs ${
                            selectedCodes.has(code.id) ? 'bg-primary/20 border-primary border' : 'bg-card border border-border hover:border-primary/50'
                          }`}
                        >
                          <span className="font-mono">{code.qr_code}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedCodes.size > 0 && (
                    <p className="text-xs text-primary mt-2">{selectedCodes.size} selecionado(s)</p>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Landing Page Settings */}
          <AccordionItem value="landing" className="glass-card rounded-xl border-0 overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Layout className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Landing Page</h3>
                  <p className="text-sm text-muted-foreground">Textos e seções da página inicial</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Título Principal</Label>
                    <Input
                      value={heroSettings.title}
                      onChange={(e) => setHeroSettings(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtítulo</Label>
                    <Input
                      value={heroSettings.subtitle}
                      onChange={(e) => setHeroSettings(prev => ({ ...prev, subtitle: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={heroSettings.description}
                    onChange={(e) => setHeroSettings(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texto do Botão CTA</Label>
                  <Input
                    value={heroSettings.ctaText}
                    onChange={(e) => setHeroSettings(prev => ({ ...prev, ctaText: e.target.value }))}
                    className="max-w-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => window.open('/', '_blank')} variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                  <Button onClick={() => toast({ title: 'Em breve', description: 'Salvamento será implementado.' })}>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Dialogs */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>Organize QR Codes para impressão em lotes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Lote Janeiro 2025"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancelar</Button>
              <Button onClick={createCategory} disabled={!newCategoryName.trim()}>Criar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar para Impressão</DialogTitle>
            <DialogDescription>Gerar SVG com QR Codes em grade (1m² / ~1600 códigos)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={exportCategory} onValueChange={setExportCategory}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name} ({cat.codes.length})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {exportCategory && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium">Arquivo:</p>
                <ul className="text-muted-foreground mt-1 text-xs space-y-1">
                  <li>• SVG compatível com CorelDRAW</li>
                  <li>• 1000mm × 1000mm (1m²)</li>
                  <li>• Grade ~40 × 40 códigos</li>
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancelar</Button>
              <Button onClick={() => exportCategory && exportCategoryAsSVG(exportCategory)} disabled={!exportCategory}>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
