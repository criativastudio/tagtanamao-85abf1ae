import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import QRCodeLib from 'qrcode';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Bell, 
  Shield, 
  Settings,
  QrCode,
  Dog,
  Building2,
  ShoppingCart,
  Package,
  Ticket,
  Layout,
  FileImage,
  LayoutDashboard,
  ShieldCheck,
  FileDown,
  FolderPlus,
  Grid3X3,
  X,
  Download,
  Plus,
  Printer,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AdminMenuItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
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

// Constants for QR code sizing at 300 DPI
const MM_TO_PIXELS = 11.811;

// Pet Tag: 23mm diameter circle
const QR_DIAMETER_MM = 23;
const QR_DIAMETER_PX = Math.round(QR_DIAMETER_MM * MM_TO_PIXELS);

// Business Display: 41.5mm x 41.5mm square (4.15cm)
const DISPLAY_SIZE_MM = 41.5;
const DISPLAY_SIZE_PX = Math.round(DISPLAY_SIZE_MM * MM_TO_PIXELS);

const SHEET_SIZE_MM = 1000;

const adminMenuItems: AdminMenuItem[] = [
  {
    id: 'qr-generator',
    title: 'Gerador de QR Codes',
    description: 'Gere e gerencie QR Codes para produção.',
    icon: QrCode,
    path: '/admin',
    color: 'text-primary'
  },
  {
    id: 'pet-tags',
    title: 'Tags Pet',
    description: 'Gerencie todas as tags de pets.',
    icon: Dog,
    path: '/dashboard/tags',
    color: 'text-yellow-400'
  },
  {
    id: 'displays',
    title: 'Displays',
    description: 'Gerencie todos os displays.',
    icon: Building2,
    path: '/dashboard/displays',
    color: 'text-blue-400'
  },
  {
    id: 'orders',
    title: 'Pedidos',
    description: 'Gerencie os pedidos da loja.',
    icon: ShoppingCart,
    path: '/admin/pedidos',
    color: 'text-purple-400'
  },
  {
    id: 'products',
    title: 'Produtos',
    description: 'Gerencie os produtos da loja.',
    icon: Package,
    path: '/admin/produtos',
    color: 'text-orange-400'
  },
];

const adminSettingsItems: AdminMenuItem[] = [
  {
    id: 'roles',
    title: 'Gerenciar Funções',
    description: 'Controle de permissões.',
    icon: ShieldCheck,
    path: '/admin/funcoes',
    color: 'text-red-400'
  },
  {
    id: 'templates',
    title: 'Templates de Arte',
    description: 'Templates SVG para produtos.',
    icon: FileImage,
    path: '/admin/templates',
    color: 'text-purple-400'
  },
  {
    id: 'coupons',
    title: 'Cupons de Desconto',
    description: 'Gerencie cupons da loja.',
    icon: Ticket,
    path: '/admin/cupons',
    color: 'text-primary'
  },
];

const createQRCodeCanvas = async (code: QRCode): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  
  const isDisplay = code.type === 'business_display';
  const size = isDisplay ? DISPLAY_SIZE_PX : QR_DIAMETER_PX;
  
  canvas.width = size;
  canvas.height = size;
  
  const centerX = size / 2;
  const centerY = size / 2;
  
  if (isDisplay) {
    // Business Display: Square format 4.15cm x 4.15cm
    
    // White square background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    
    // Cut line rectangle - magenta color
    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, size - 2, size - 2);
    
    // Corner registration marks
    const markLength = 12;
    const markOffset = 6;
    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 0.5;
    
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(markOffset, markOffset);
    ctx.lineTo(markOffset + markLength, markOffset);
    ctx.moveTo(markOffset, markOffset);
    ctx.lineTo(markOffset, markOffset + markLength);
    ctx.stroke();
    
    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(size - markOffset, markOffset);
    ctx.lineTo(size - markOffset - markLength, markOffset);
    ctx.moveTo(size - markOffset, markOffset);
    ctx.lineTo(size - markOffset, markOffset + markLength);
    ctx.stroke();
    
    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(markOffset, size - markOffset);
    ctx.lineTo(markOffset + markLength, size - markOffset);
    ctx.moveTo(markOffset, size - markOffset);
    ctx.lineTo(markOffset, size - markOffset - markLength);
    ctx.stroke();
    
    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(size - markOffset, size - markOffset);
    ctx.lineTo(size - markOffset - markLength, size - markOffset);
    ctx.moveTo(size - markOffset, size - markOffset);
    ctx.lineTo(size - markOffset, size - markOffset - markLength);
    ctx.stroke();
    
    // QR code size for square format
    const qrSize = Math.round(size * 0.75);
    const url = `${window.location.origin}/display/${code.qr_code}`;
    
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
        const qrX = (size - qrSize) / 2;
        const qrY = Math.round(size * 0.08);
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
        resolve();
      };
    });
    
    // Activation code at bottom - small font
    ctx.fillStyle = '#000000';
    ctx.font = `${Math.round(size * 0.06)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code.qr_code, centerX, size * 0.93);
    
  } else {
    // Pet Tag: Circular format 23mm diameter
    const radius = size / 2;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    const qrSize = Math.round(size * 0.68);
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
        const qrX = (size - qrSize) / 2;
        const qrY = Math.round(size * 0.12);
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
        resolve();
      };
    });
    
    ctx.fillStyle = '#000000';
    ctx.font = `${Math.round(size * 0.08)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code.qr_code, centerX, size * 0.90);
  }
  
  return canvas;
};

export default function UserSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, user } = useAuth();

  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    whatsapp: profile?.whatsapp || '',
    address: profile?.address || ''
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    whatsappNotifications: true,
    scanAlerts: true,
    orderUpdates: true
  });

  const [saving, setSaving] = useState(false);

  // QR Export states
  const [petTags, setPetTags] = useState<QRCode[]>([]);
  const [displays, setDisplays] = useState<QRCode[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportCategory, setExportCategory] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [loadingQR, setLoadingQR] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTags, setDeletingTags] = useState(false);

  const allCodes = [...petTags, ...displays];

  useEffect(() => {
    if (profile?.is_admin) {
      fetchQRCodes();
    }
  }, [profile]);

  const fetchQRCodes = async () => {
    setLoadingQR(true);
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
    setLoadingQR(false);
  };

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

  const deleteSelectedTags = async () => {
    setDeletingTags(true);
    try {
      const selectedItems = allCodes.filter(c => selectedCodes.has(c.id));
      const petIds = selectedItems.filter(c => c.type === 'pet_tag').map(c => c.id);
      const displayIds = selectedItems.filter(c => c.type === 'business_display').map(c => c.id);

      if (petIds.length > 0) {
        const { error } = await supabase.from('pet_tags').delete().in('id', petIds);
        if (error) throw error;
      }
      if (displayIds.length > 0) {
        const { error } = await supabase.from('business_displays').delete().in('id', displayIds);
        if (error) throw error;
      }

      setPetTags(prev => prev.filter(t => !selectedCodes.has(t.id)));
      setDisplays(prev => prev.filter(d => !selectedCodes.has(d.id)));
      setCategories(prev => prev.map(cat => ({
        ...cat,
        codes: cat.codes.filter(c => !selectedCodes.has(c.id))
      })));
      setSelectedCodes(new Set());
      setShowDeleteConfirm(false);

      toast({ title: 'Tags apagadas!', description: `${selectedItems.length} tag(s) removida(s) com sucesso.` });
    } catch (error: any) {
      toast({ title: 'Erro ao apagar', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingTags(false);
    }
  };

  const exportCategoryAsSVG = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category || category.codes.length === 0) {
      toast({ title: 'Erro', description: 'Categoria vazia.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Gerando arquivo...' });

    try {
      // Determine type from first code in category
      const codeType = category.codes[0]?.type || 'pet_tag';
      const isDisplay = codeType === 'business_display';
      
      // Use appropriate size based on type
      const itemSize = isDisplay ? DISPLAY_SIZE_MM : QR_DIAMETER_MM;
      const padding = 2;
      const cellSize = itemSize + padding;
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
  <title>QR Codes - ${category.name}</title>
  <desc>Tipo: ${isDisplay ? 'Display (4.15x4.15cm)' : 'Pet Tag (23mm)'}</desc>
  <rect width="100%" height="100%" fill="white"/>
  <g id="CutLines">`;

      codesToExport.forEach((code, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;
        
        if (isDisplay) {
          // Square cut line for displays
          const halfSize = itemSize / 2;
          svgContent += `<rect x="${x - halfSize}" y="${y - halfSize}" width="${itemSize}" height="${itemSize}" fill="none" stroke="#FF00FF" stroke-width="0.1"/>`;
        } else {
          // Circular cut line for pet tags
          svgContent += `<circle cx="${x}" cy="${y}" r="${itemSize / 2}" fill="none" stroke="#FF00FF" stroke-width="0.1"/>`;
        }
      });

      svgContent += `</g><g id="QRCodes">`;

      codesToExport.forEach((_, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;
        svgContent += `<image x="${x - itemSize/2}" y="${y - itemSize/2}" width="${itemSize}" height="${itemSize}" xlink:href="${qrImages[index]}"/>`;
      });

      svgContent += `</g></svg>`;

      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.download = `qrcodes-${category.name}-${isDisplay ? 'displays' : 'pet-tags'}-${codesToExport.length}.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();

      setShowExportDialog(false);
      toast({ title: 'Exportado!', description: `${codesToExport.length} QR Codes ${isDisplay ? '(4.15x4.15cm)' : '(23mm)'} exportados.` });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
          whatsapp: profileData.whatsapp,
          address: profileData.address
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">Gerencie seu perfil e preferências</p>
          </div>
        </div>
        <Button variant="hero" onClick={handleSaveProfile} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className={`grid w-full max-w-2xl ${profile?.is_admin ? 'grid-cols-5' : 'grid-cols-3'}`}>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
          {profile?.is_admin && (
            <>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-xl space-y-6"
          >
            <h2 className="text-lg font-semibold text-foreground">Informações Pessoais</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Seu nome"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={profileData.whatsapp}
                  onChange={(e) => setProfileData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={profileData.address}
                onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Seu endereço completo"
              />
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="notifications">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-xl space-y-6"
          >
            <h2 className="text-lg font-semibold text-foreground">Preferências de Notificação</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Notificações por E-mail</Label>
                  <p className="text-sm text-muted-foreground">Receba atualizações por e-mail</p>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailNotifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Notificações por WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">Receba alertas no WhatsApp</p>
                </div>
                <Switch
                  checked={notifications.whatsappNotifications}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, whatsappNotifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Alertas de Leitura</Label>
                  <p className="text-sm text-muted-foreground">Seja notificado quando alguém escanear seu QR</p>
                </div>
                <Switch
                  checked={notifications.scanAlerts}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, scanAlerts: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <Label>Atualizações de Pedidos</Label>
                  <p className="text-sm text-muted-foreground">Status e rastreio dos seus pedidos</p>
                </div>
                <Switch
                  checked={notifications.orderUpdates}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, orderUpdates: checked }))}
                />
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="security">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-xl space-y-6"
          >
            <h2 className="text-lg font-semibold text-foreground">Segurança da Conta</h2>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <Label>Alterar Senha</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Para alterar sua senha, utilize a opção de recuperação de senha na tela de login.
                </p>
                <Button variant="outline" onClick={() => navigate('/auth')}>
                  Ir para Login
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <Label className="text-destructive">Zona de Perigo</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Ações irreversíveis para sua conta.
                </p>
                <Button variant="destructive" disabled>
                  Excluir Conta
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Entre em contato com o suporte para excluir sua conta.
                </p>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Export Tab - Admin only */}
        {profile?.is_admin && (
          <TabsContent value="export">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="glass-card border-0">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                      <FileDown className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <CardTitle>Exportação para Impressão</CardTitle>
                      <CardDescription>Organize e exporte QR Codes em 1m² para produção</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Categorias e Botões */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Grid3X3 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Categorias ({categories.length})</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowCategoryDialog(true)}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Nova Categoria
                      </Button>
                      {categories.length > 0 && (
                        <Button variant="hero" size="sm" onClick={() => setShowExportDialog(true)}>
                          <FileDown className="w-4 h-4 mr-2" />
                          Exportar 1m²
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Lista de Categorias */}
                  {categories.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categories.map((category) => (
                        <div key={category.id} className="p-4 rounded-lg border bg-card/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{category.name}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCategory(category.id)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{category.codes.length} códigos</p>
                          <div className="flex gap-2">
                            {selectedCodes.size > 0 && (
                              <Button variant="outline" size="sm" className="flex-1" onClick={() => addSelectedToCategory(category.id)}>
                                <Plus className="w-4 h-4 mr-1" />
                                Adicionar {selectedCodes.size}
                              </Button>
                            )}
                            {category.codes.length > 0 && (
                              <Button variant="outline" size="sm" className="flex-1" onClick={() => exportCategoryAsSVG(category.id)}>
                                <Download className="w-4 h-4 mr-1" />
                                SVG
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Seleção de QR Codes */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="font-medium">QR Codes Disponíveis ({allCodes.length})</h4>
                      <div className="flex items-center gap-2">
                        {allCodes.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (selectedCodes.size === allCodes.length) {
                                setSelectedCodes(new Set());
                              } else {
                                setSelectedCodes(new Set(allCodes.map(c => c.id)));
                              }
                            }}
                          >
                            {selectedCodes.size === allCodes.length ? 'Desmarcar todos' : 'Selecionar todos'}
                          </Button>
                        )}
                        {selectedCodes.size > 0 && (
                          <>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(true)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Apagar Tag ({selectedCodes.size})
                            </Button>
                            <span className="text-sm text-primary font-medium">{selectedCodes.size} selecionado(s)</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {loadingQR ? (
                      <div className="p-8 text-center rounded-lg bg-muted/30">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Carregando QR Codes...</p>
                      </div>
                    ) : allCodes.length === 0 ? (
                      <div className="p-8 text-center rounded-lg bg-muted/30">
                        <QrCode className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhum QR Code encontrado.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-64 overflow-y-auto p-3 bg-muted/20 rounded-lg border">
                        {allCodes.slice(0, 200).map((code) => (
                          <div
                            key={code.id}
                            onClick={() => toggleSelect(code.id)}
                            className={`p-2 rounded-md text-center cursor-pointer transition-all text-xs font-mono ${
                              selectedCodes.has(code.id) 
                                ? 'bg-primary text-primary-foreground border-primary border-2' 
                                : 'bg-card border border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                          >
                            {code.qr_code}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Instruções */}
                  <div className="p-4 bg-muted/30 rounded-lg text-sm">
                    <p className="font-medium mb-2">Como usar:</p>
                    <ol className="text-muted-foreground space-y-1 list-decimal list-inside text-xs">
                      <li>Selecione os QR Codes clicando neles</li>
                      <li>Crie uma categoria para agrupar os códigos</li>
                      <li>Adicione os códigos selecionados à categoria</li>
                      <li>Exporte a categoria como SVG (1000mm × 1000mm)</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              {/* AlertDialog para confirmar exclusão */}
              <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apagar {selectedCodes.size} tag(s)?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação é irreversível. As tags selecionadas serão permanentemente excluídas do sistema.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deletingTags}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteSelectedTags}
                      disabled={deletingTags}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deletingTags ? 'Apagando...' : 'Apagar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </motion.div>
          </TabsContent>
        )}

        {profile?.is_admin && (
          <TabsContent value="admin">
            <div className="space-y-6">
              {/* Admin Menu */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 rounded-xl"
              >
                <h2 className="text-lg font-semibold text-foreground mb-4">Menu Admin</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {adminMenuItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all cursor-pointer group"
                      onClick={() => navigate(item.path)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-muted/50 ${item.color} group-hover:scale-110 transition-transform`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Admin Settings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-6 rounded-xl"
              >
                <h2 className="text-lg font-semibold text-foreground mb-4">Configurações do Sistema</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {adminSettingsItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (index + adminMenuItems.length) * 0.05 }}
                      className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all cursor-pointer group"
                      onClick={() => navigate(item.path)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-muted/50 ${item.color} group-hover:scale-110 transition-transform`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </TabsContent>
        )}
      </Tabs>

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
