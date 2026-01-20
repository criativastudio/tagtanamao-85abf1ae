import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import QRCodeLib from 'qrcode';
import { 
  QrCode, 
  Download,
  Plus,
  ArrowLeft,
  Dog,
  Building2,
  Trash2,
  Check,
  Grid3X3,
  FolderPlus,
  X,
  FileDown,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GeneratedQRCode {
  id: string;
  qr_code: string;
  type: 'pet_tag' | 'business_display';
  dataUrl: string;
  category?: string;
}

interface Category {
  id: string;
  name: string;
  codes: GeneratedQRCode[];
}

// Constants for QR code sizing (23mm diameter at 300 DPI)
const MM_TO_PIXELS = 11.811; // 300 DPI conversion
const QR_DIAMETER_MM = 23;
const QR_DIAMETER_PX = Math.round(QR_DIAMETER_MM * MM_TO_PIXELS); // ~272 pixels

// 1 meter = 1000mm, at 300 DPI = ~11811 pixels
const SHEET_SIZE_MM = 1000;
const SHEET_SIZE_PX = Math.round(SHEET_SIZE_MM * MM_TO_PIXELS);

// Generate a unique 6-digit numeric code
const generateUniqueCode = async (): Promise<string> => {
  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  
  let code = generateCode();
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    // Check if code exists in pet_tags
    const { data: petData } = await supabase
      .from('pet_tags')
      .select('id')
      .eq('qr_code', code)
      .maybeSingle();
    
    // Check if code exists in business_displays
    const { data: displayData } = await supabase
      .from('business_displays')
      .select('id')
      .eq('qr_code', code)
      .maybeSingle();
    
    if (!petData && !displayData) {
      return code;
    }
    
    code = generateCode();
    attempts++;
  }
  
  throw new Error('Não foi possível gerar um código único. Tente novamente.');
};

// Create a single QR code canvas with updated design
const createQRCodeCanvas = async (code: GeneratedQRCode): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  
  canvas.width = QR_DIAMETER_PX;
  canvas.height = QR_DIAMETER_PX;
  
  const centerX = QR_DIAMETER_PX / 2;
  const centerY = QR_DIAMETER_PX / 2;
  const radius = QR_DIAMETER_PX / 2;
  
  // White circular background
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  
  // Cut line circle (vector marking for die-cut) - magenta color standard for cut lines
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
  ctx.strokeStyle = '#FF00FF'; // Magenta - standard cut line color
  ctx.lineWidth = 0.5;
  ctx.stroke();
  
  // Add registration marks (cross marks at cardinal points for alignment)
  const markLength = 8;
  const markOffset = 4;
  ctx.strokeStyle = '#FF00FF';
  ctx.lineWidth = 0.5;
  
  // Top mark
  ctx.beginPath();
  ctx.moveTo(centerX, markOffset);
  ctx.lineTo(centerX, markOffset + markLength);
  ctx.stroke();
  
  // Bottom mark
  ctx.beginPath();
  ctx.moveTo(centerX, QR_DIAMETER_PX - markOffset);
  ctx.lineTo(centerX, QR_DIAMETER_PX - markOffset - markLength);
  ctx.stroke();
  
  // Left mark
  ctx.beginPath();
  ctx.moveTo(markOffset, centerY);
  ctx.lineTo(markOffset + markLength, centerY);
  ctx.stroke();
  
  // Right mark
  ctx.beginPath();
  ctx.moveTo(QR_DIAMETER_PX - markOffset, centerY);
  ctx.lineTo(QR_DIAMETER_PX - markOffset - markLength, centerY);
  ctx.stroke();
  
  // Generate larger QR code for better scanning
  const qrSize = Math.round(QR_DIAMETER_PX * 0.68); // Slightly reduced to better fit
  
  const qrDataUrl = await QRCodeLib.toDataURL(code.dataUrl.includes('http') ? code.dataUrl : `${window.location.origin}/pet/${code.qr_code}`, {
    width: qrSize,
    margin: 0,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });
  
  // Load and draw QR code - positioned lower for better centering
  const img = new Image();
  img.src = qrDataUrl;
  
  await new Promise<void>((resolve) => {
    img.onload = () => {
      const qrX = (QR_DIAMETER_PX - qrSize) / 2;
      const qrY = Math.round(QR_DIAMETER_PX * 0.12); // Moved down from 6% to 12%
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      resolve();
    };
  });
  
  // Draw activation code - smaller font, normal weight (not bold)
  const activationCode = code.qr_code;
  ctx.fillStyle = '#000000';
  ctx.font = `${Math.round(QR_DIAMETER_PX * 0.08)}px Arial`; // Slightly smaller
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textY = QR_DIAMETER_PX * 0.90; // Position text at 90% from top
  ctx.fillText(activationCode, centerX, textY);
  
  return canvas;
};

export default function AdminDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [petTagCount, setPetTagCount] = useState(1);
  const [displayCount, setDisplayCount] = useState(1);
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedQRCode[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  
  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportCategory, setExportCategory] = useState<string>('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!loading && profile && !profile.is_admin) {
      navigate('/dashboard');
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive"
      });
    }
  }, [profile, loading, navigate, toast]);

  const generateQRCodes = async (type: 'pet_tag' | 'business_display', count: number) => {
    setGenerating(true);
    const newCodes: GeneratedQRCode[] = [];
    
    try {
      for (let i = 0; i < count; i++) {
        const uniqueCode = await generateUniqueCode();
        const table = type === 'pet_tag' ? 'pet_tags' : 'business_displays';
        
        const { data, error } = await supabase
          .from(table)
          .insert({
            user_id: user?.id,
            qr_code: uniqueCode
          })
          .select('id, qr_code')
          .single();
        
        if (error) throw error;
        
        const baseUrl = window.location.origin;
        const url = type === 'pet_tag' 
          ? `${baseUrl}/pet/${data.qr_code}`
          : `${baseUrl}/display/${data.qr_code}`;
        
        const qrSize = Math.round(QR_DIAMETER_PX * 0.72);
        
        const dataUrl = await QRCodeLib.toDataURL(url, {
          width: qrSize,
          margin: 0,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'H'
        });
        
        newCodes.push({
          id: data.id,
          qr_code: data.qr_code,
          type,
          dataUrl,
          category: selectedCategory && selectedCategory !== 'none' ? selectedCategory : undefined
        });
      }
      
      setGeneratedCodes(prev => [...prev, ...newCodes]);
      
      // Add to category if selected
      if (selectedCategory && selectedCategory !== 'none') {
        setCategories(prev => prev.map(cat => {
          if (cat.id === selectedCategory) {
            return { ...cat, codes: [...cat.codes, ...newCodes] };
          }
          return cat;
        }));
      }
      
      toast({
        title: "QR Codes gerados!",
        description: `${count} ${type === 'pet_tag' ? 'tag(s) pet' : 'display(s)'} criado(s) com sucesso.`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar QR Codes",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadQRCode = async (code: GeneratedQRCode) => {
    const canvas = await createQRCodeCanvas(code);
    
    const link = document.createElement('a');
    link.download = `qrcode-${code.qr_code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast({
      title: "Download iniciado",
      description: `QR Code ${code.qr_code} baixado com sucesso.`
    });
  };

  const downloadSelectedCodes = async () => {
    const selected = generatedCodes.filter(c => selectedCodes.has(c.id));
    for (const code of selected) {
      await downloadQRCode(code);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  const downloadAllCodes = async () => {
    for (const code of generatedCodes) {
      await downloadQRCode(code);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedCodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedCodes.size === generatedCodes.length) {
      setSelectedCodes(new Set());
    } else {
      setSelectedCodes(new Set(generatedCodes.map(c => c.id)));
    }
  };

  const deleteSelected = async () => {
    const selected = generatedCodes.filter(c => selectedCodes.has(c.id));
    
    for (const code of selected) {
      const table = code.type === 'pet_tag' ? 'pet_tags' : 'business_displays';
      await supabase.from(table).delete().eq('id', code.id);
    }
    
    setGeneratedCodes(prev => prev.filter(c => !selectedCodes.has(c.id)));
    setSelectedCodes(new Set());
    
    // Also remove from categories
    setCategories(prev => prev.map(cat => ({
      ...cat,
      codes: cat.codes.filter(c => !selectedCodes.has(c.id))
    })));
    
    toast({
      title: "QR Codes removidos",
      description: `${selected.length} QR code(s) removido(s) com sucesso.`
    });
  };

  const createCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name: newCategoryName.trim(),
      codes: []
    };
    
    setCategories(prev => [...prev, newCategory]);
    setNewCategoryName('');
    setShowCategoryDialog(false);
    
    toast({
      title: "Categoria criada",
      description: `Categoria "${newCategory.name}" criada com sucesso.`
    });
  };

  const addSelectedToCategory = (categoryId: string) => {
    const selected = generatedCodes.filter(c => selectedCodes.has(c.id));
    
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        // Avoid duplicates
        const existingIds = new Set(cat.codes.map(c => c.id));
        const newCodes = selected.filter(c => !existingIds.has(c.id));
        return { ...cat, codes: [...cat.codes, ...newCodes] };
      }
      return cat;
    }));
    
    // Update codes with category
    setGeneratedCodes(prev => prev.map(c => {
      if (selectedCodes.has(c.id)) {
        return { ...c, category: categoryId };
      }
      return c;
    }));
    
    setSelectedCodes(new Set());
    
    toast({
      title: "Códigos adicionados",
      description: `${selected.length} código(s) adicionado(s) à categoria.`
    });
  };

  const deleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    
    // Remove category reference from codes
    setGeneratedCodes(prev => prev.map(c => {
      if (c.category === categoryId) {
        return { ...c, category: undefined };
      }
      return c;
    }));
    
    toast({
      title: "Categoria removida",
      description: "Categoria removida com sucesso. Os QR Codes permanecem."
    });
  };

  // Export QR codes as SVG grid for 1m² sheet (CorelDRAW compatible)
  const exportCategoryAsSVG = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category || category.codes.length === 0) {
      toast({
        title: "Erro",
        description: "Categoria vazia ou não encontrada.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Gerando arquivo...",
      description: "Aguarde enquanto o arquivo é preparado."
    });

    try {
      // Calculate grid layout
      const padding = 2; // 2mm padding between circles
      const cellSize = QR_DIAMETER_MM + padding; // 25mm per cell
      const cols = Math.floor(SHEET_SIZE_MM / cellSize); // ~40 columns
      const rows = Math.floor(SHEET_SIZE_MM / cellSize); // ~40 rows
      const maxCodes = cols * rows; // ~1600 codes per sheet

      const codesToExport = category.codes.slice(0, maxCodes);
      
      // Create PNG images for each QR code
      const qrImages: string[] = [];
      for (const code of codesToExport) {
        const canvas = await createQRCodeCanvas(code);
        qrImages.push(canvas.toDataURL('image/png'));
      }

      // Generate SVG content (CorelDRAW compatible) with vector cut lines
      let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${SHEET_SIZE_MM}mm" height="${SHEET_SIZE_MM}mm" 
     viewBox="0 0 ${SHEET_SIZE_MM} ${SHEET_SIZE_MM}">
  <title>QR Codes - ${category.name}</title>
  <desc>Categoria: ${category.name} - ${codesToExport.length} códigos - Gerado para impressão em 1m²</desc>
  
  <!-- Styles -->
  <defs>
    <style>
      .cut-line { fill: none; stroke: #FF00FF; stroke-width: 0.1; }
      .reg-mark { fill: none; stroke: #FF00FF; stroke-width: 0.1; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="white"/>
  
  <!-- Cut Lines Layer (Magenta - standard for die-cut) -->
  <g id="CutLines">
`;

      // Add vector cut circles for each QR code
      codesToExport.forEach((code, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;
        const r = QR_DIAMETER_MM / 2;

        svgContent += `    <circle cx="${x}" cy="${y}" r="${r}" class="cut-line"/>
`;
      });

      svgContent += `  </g>
  
  <!-- QR Codes Layer -->
  <g id="QRCodes">
`;

      codesToExport.forEach((code, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;

        svgContent += `    <!-- QR Code: ${code.qr_code} -->
    <g transform="translate(${x}, ${y})">
      <image x="${-QR_DIAMETER_MM/2}" y="${-QR_DIAMETER_MM/2}" 
             width="${QR_DIAMETER_MM}" height="${QR_DIAMETER_MM}"
             xlink:href="${qrImages[index]}"
             preserveAspectRatio="xMidYMid meet"/>
    </g>
`;
      });

      svgContent += `  </g>
</svg>`;

      // Download SVG
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `qrcodes-${category.name}-${codesToExport.length}unidades.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      setShowExportDialog(false);

      toast({
        title: "Arquivo exportado!",
        description: `${codesToExport.length} QR Codes exportados em grade para impressão. Abra o arquivo SVG no CorelDRAW.`
      });
    } catch (error: any) {
      toast({
        title: "Erro na exportação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile?.is_admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Geração e gerenciamento de QR Codes</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/configuracoes')}>
          <Settings className="w-4 h-4 mr-2" />
          Configurações
        </Button>
      </div>

      {/* Categories Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 rounded-xl mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Grid3X3 className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Categorias para Impressão</h2>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCategoryDialog(true)}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
            
            {categories.length > 0 && (
              <Button 
                variant="hero" 
                size="sm"
                onClick={() => setShowExportDialog(true)}
              >
                <FileDown className="w-4 h-4 mr-2" />
                Exportar para Impressão
              </Button>
            )}
          </div>
        </div>

        {categories.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Crie categorias para organizar QR Codes e gerar arquivos prontos para impressão em 1m².
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div 
                key={category.id}
                className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{category.name}</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => deleteCategory(category.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {category.codes.length} QR Code(s)
                </p>
                <div className="flex gap-2">
                  {selectedCodes.size > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => addSelectedToCategory(category.id)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar ({selectedCodes.size})
                    </Button>
                  )}
                  {category.codes.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => exportCategoryAsSVG(category.id)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Exportar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pet Tags Generator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <Dog className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Gerar Tags Pet</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="petTagCount">Quantidade</Label>
              <Input
                id="petTagCount"
                type="number"
                min={1}
                max={100}
                value={petTagCount}
                onChange={(e) => setPetTagCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1"
              />
            </div>
            
            {categories.length > 0 && (
              <div>
                <Label>Adicionar à categoria (opcional)</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button 
              onClick={() => generateQRCodes('pet_tag', petTagCount)}
              disabled={generating}
              className="w-full"
              variant="hero"
            >
              <Plus className="w-4 h-4 mr-2" />
              Gerar {petTagCount} Tag(s) Pet
            </Button>
          </div>
        </motion.div>

        {/* Business Displays Generator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-semibold text-foreground">Gerar Displays</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="displayCount">Quantidade</Label>
              <Input
                id="displayCount"
                type="number"
                min={1}
                max={100}
                value={displayCount}
                onChange={(e) => setDisplayCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1"
              />
            </div>
            
            {categories.length > 0 && (
              <div>
                <Label>Adicionar à categoria (opcional)</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button 
              onClick={() => generateQRCodes('business_display', displayCount)}
              disabled={generating}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Gerar {displayCount} Display(s)
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Generated QR Codes */}
      {generatedCodes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <QrCode className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                QR Codes Gerados ({generatedCodes.length})
              </h2>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm"
                onClick={selectAll}
              >
                {selectedCodes.size === generatedCodes.length ? 'Desmarcar' : 'Selecionar'} Todos
              </Button>
              
              {selectedCodes.size > 0 && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadSelectedCodes}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar ({selectedCodes.size})
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={deleteSelected}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </>
              )}
              
              <Button 
                variant="hero" 
                size="sm"
                onClick={downloadAllCodes}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Todos
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {generatedCodes.map((code) => {
              const activationCode = code.qr_code;
              const isSelected = selectedCodes.has(code.id);
              const categoryName = categories.find(c => c.id === code.category)?.name;
              
              return (
                <motion.div
                  key={code.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`relative p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleSelect(code.id)}
                >
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-20 h-20 rounded-full overflow-hidden border border-muted/50 mb-2 flex items-center justify-center bg-white"
                    >
                      <img 
                        src={code.dataUrl} 
                        alt={`QR Code ${activationCode}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <span className="text-xs font-mono text-foreground">
                      {activationCode}
                    </span>
                    
                    <span className={`text-[10px] mt-1 ${
                      code.type === 'pet_tag' ? 'text-primary' : 'text-blue-400'
                    }`}>
                      {code.type === 'pet_tag' ? 'Pet Tag' : 'Display'}
                    </span>
                    
                    {categoryName && (
                      <span className="text-[9px] text-muted-foreground mt-0.5">
                        {categoryName}
                      </span>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadQRCode(code);
                      }}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Baixar
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          <p className="text-xs text-muted-foreground mt-4 text-center">
            QR Codes: 23mm de diâmetro, borda fina para corte, código em fonte normal. Exportação em grade para impressão 1m².
          </p>
        </motion.div>
      )}

      {/* Hidden canvas for image generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Create Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Crie uma categoria para organizar QR Codes e gerar arquivos para impressão.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="categoryName">Nome da categoria</Label>
              <Input
                id="categoryName"
                placeholder="Ex: Lote Janeiro 2025"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={createCategory} disabled={!newCategoryName.trim()}>
                Criar Categoria
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar para Impressão</DialogTitle>
            <DialogDescription>
              Selecione uma categoria para gerar arquivo SVG com QR Codes em grade (1m² / ~1600 códigos).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>Categoria</Label>
              <Select value={exportCategory} onValueChange={setExportCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name} ({cat.codes.length} códigos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {exportCategory && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium">Informações do arquivo:</p>
                <ul className="text-muted-foreground mt-1 space-y-1">
                  <li>• Formato: SVG (compatível com CorelDRAW)</li>
                  <li>• Tamanho: 1000mm × 1000mm (1m²)</li>
                  <li>• Grade: ~40 × 40 códigos</li>
                  <li>• Espaçamento: 2mm entre círculos</li>
                </ul>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => exportCategory && exportCategoryAsSVG(exportCategory)} 
                disabled={!exportCategory}
              >
                <FileDown className="w-4 h-4 mr-2" />
                Exportar SVG
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
