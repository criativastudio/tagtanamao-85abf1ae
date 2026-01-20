import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import QRCodeLib from 'qrcode';
import {
  ArrowLeft,
  FileDown,
  FolderPlus,
  Grid3X3,
  X,
  Download,
  Plus
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

interface QRCode {
  id: string;
  qr_code: string;
  type: 'pet_tag' | 'business_display';
  dataUrl?: string;
}

interface Category {
  id: string;
  name: string;
  codes: QRCode[];
}

// Constants for QR code sizing (23mm diameter at 300 DPI)
const MM_TO_PIXELS = 11.811;
const QR_DIAMETER_MM = 23;
const QR_DIAMETER_PX = Math.round(QR_DIAMETER_MM * MM_TO_PIXELS);
const SHEET_SIZE_MM = 1000;

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
  
  const markLength = 8;
  const markOffset = 4;
  ctx.strokeStyle = '#FF00FF';
  ctx.lineWidth = 0.5;
  
  ctx.beginPath();
  ctx.moveTo(centerX, markOffset);
  ctx.lineTo(centerX, markOffset + markLength);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(centerX, QR_DIAMETER_PX - markOffset);
  ctx.lineTo(centerX, QR_DIAMETER_PX - markOffset - markLength);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(markOffset, centerY);
  ctx.lineTo(markOffset + markLength, centerY);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(QR_DIAMETER_PX - markOffset, centerY);
  ctx.lineTo(QR_DIAMETER_PX - markOffset - markLength, centerY);
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

export default function QRExportSettings() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [petTags, setPetTags] = useState<QRCode[]>([]);
  const [displays, setDisplays] = useState<QRCode[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportCategory, setExportCategory] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && profile && !profile.is_admin) {
      navigate('/dashboard');
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    fetchAllCodes();
  }, []);

  const fetchAllCodes = async () => {
    setLoadingData(true);
    
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
    
    setLoadingData(false);
  };

  const allCodes = [...petTags, ...displays];

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

  const deleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    toast({
      title: "Categoria removida",
      description: "Categoria removida com sucesso."
    });
  };

  const addSelectedToCategory = (categoryId: string) => {
    const selected = allCodes.filter(c => selectedCodes.has(c.id));
    
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        const existingIds = new Set(cat.codes.map(c => c.id));
        const newCodes = selected.filter(c => !existingIds.has(c.id));
        return { ...cat, codes: [...cat.codes, ...newCodes] };
      }
      return cat;
    }));
    
    setSelectedCodes(new Set());
    
    toast({
      title: "Códigos adicionados",
      description: `${selected.length} código(s) adicionado(s) à categoria.`
    });
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
      const padding = 2;
      const cellSize = QR_DIAMETER_MM + padding;
      const cols = Math.floor(SHEET_SIZE_MM / cellSize);
      const rows = Math.floor(SHEET_SIZE_MM / cellSize);
      const maxCodes = cols * rows;

      const codesToExport = category.codes.slice(0, maxCodes);
      
      const qrImages: string[] = [];
      for (const code of codesToExport) {
        const canvas = await createQRCodeCanvas(code);
        qrImages.push(canvas.toDataURL('image/png'));
      }

      let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${SHEET_SIZE_MM}mm" height="${SHEET_SIZE_MM}mm" 
     viewBox="0 0 ${SHEET_SIZE_MM} ${SHEET_SIZE_MM}">
  <title>QR Codes - ${category.name}</title>
  <desc>Categoria: ${category.name} - ${codesToExport.length} códigos - Gerado para impressão em 1m²</desc>
  
  <defs>
    <style>
      .cut-line { fill: none; stroke: #FF00FF; stroke-width: 0.1; }
      .reg-mark { fill: none; stroke: #FF00FF; stroke-width: 0.1; }
    </style>
  </defs>
  
  <rect width="100%" height="100%" fill="white"/>
  
  <g id="CutLines">
`;

      codesToExport.forEach((code, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;
        const r = QR_DIAMETER_MM / 2;
        svgContent += `    <circle cx="${x}" cy="${y}" r="${r}" class="cut-line"/>\n`;
      });

      svgContent += `  </g>
  
  <g id="QRCodes">
`;

      codesToExport.forEach((code, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;

        svgContent += `    <g transform="translate(${x}, ${y})">
      <image x="${-QR_DIAMETER_MM/2}" y="${-QR_DIAMETER_MM/2}" 
             width="${QR_DIAMETER_MM}" height="${QR_DIAMETER_MM}"
             xlink:href="${qrImages[index]}"
             preserveAspectRatio="xMidYMid meet"/>
    </g>
`;
      });

      svgContent += `  </g>
</svg>`;

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
        description: `${codesToExport.length} QR Codes exportados em grade para impressão.`
      });
    } catch (error: any) {
      toast({
        title: "Erro na exportação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/configuracoes')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exportação para Impressão</h1>
            <p className="text-muted-foreground">Organize QR Codes em categorias e exporte para impressão em 1m²</p>
          </div>
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
                  Exportar 1m²
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

        {/* Available QR Codes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-xl"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            QR Codes Disponíveis ({allCodes.length})
          </h2>
          
          {allCodes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum QR Code encontrado. Gere novos códigos no painel de administração.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-96 overflow-y-auto">
              {allCodes.map((code) => (
                <div
                  key={code.id}
                  onClick={() => toggleSelect(code.id)}
                  className={`p-2 rounded-lg border cursor-pointer transition-all text-center ${
                    selectedCodes.has(code.id)
                      ? 'border-primary bg-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className="text-xs font-mono text-foreground">{code.qr_code}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {code.type === 'pet_tag' ? 'Pet' : 'Display'}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          {selectedCodes.size > 0 && (
            <p className="text-sm text-primary mt-4">
              {selectedCodes.size} código(s) selecionado(s) - Selecione uma categoria acima para adicionar.
            </p>
          )}
        </motion.div>
      </div>

      {/* Create Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Crie uma categoria para organizar QR Codes para impressão.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="categoryName">Nome da Categoria</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Lote Janeiro 2025"
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
