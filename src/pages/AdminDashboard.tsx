import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import QRCodeLib from 'qrcode';
import { 
  QrCode, 
  Download,
  Plus,
  BarChart3,
  ArrowLeft,
  Dog,
  Building2,
  Trash2,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GeneratedQRCode {
  id: string;
  qr_code: string;
  type: 'pet_tag' | 'business_display';
  dataUrl: string;
}

// Constants for QR code sizing (23mm diameter at 300 DPI)
const MM_TO_PIXELS = 11.811; // 300 DPI conversion
const QR_DIAMETER_MM = 23;
const QR_DIAMETER_PX = Math.round(QR_DIAMETER_MM * MM_TO_PIXELS); // ~272 pixels

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

export default function AdminDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [petTagCount, setPetTagCount] = useState(1);
  const [displayCount, setDisplayCount] = useState(1);
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedQRCode[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  
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
        // Generate unique 6-digit code
        const uniqueCode = await generateUniqueCode();
        
        // Insert into database with the generated code
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
        
        // Generate QR code image
        const baseUrl = window.location.origin;
        const url = type === 'pet_tag' 
          ? `${baseUrl}/pet/${data.qr_code}`
          : `${baseUrl}/display/${data.qr_code}`;
        
        // Calculate QR size to fit inside circle with text
        const qrSize = Math.round(QR_DIAMETER_PX * 0.65); // QR takes 65% of diameter
        
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
          dataUrl
        });
      }
      
      setGeneratedCodes(prev => [...prev, ...newCodes]);
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
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Canvas exactly 23mm diameter (circular)
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
    
    // Draw circular border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Load and draw QR code (square, centered in upper portion)
    const img = new Image();
    img.src = code.dataUrl;
    
    await new Promise<void>((resolve) => {
      img.onload = () => {
        const qrSize = Math.round(QR_DIAMETER_PX * 0.60); // QR takes 60% of diameter
        const qrX = (QR_DIAMETER_PX - qrSize) / 2;
        const qrY = Math.round(QR_DIAMETER_PX * 0.10); // 10% from top
        
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
        resolve();
      };
    });
    
    // Draw activation code text below QR but inside circle
    const activationCode = code.qr_code;
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${Math.round(QR_DIAMETER_PX * 0.11)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textY = QR_DIAMETER_PX * 0.82; // Position text at 82% from top
    ctx.fillText(activationCode, centerX, textY);
    
    // Download with activation code as filename
    const link = document.createElement('a');
    link.download = `qrcode-${activationCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast({
      title: "Download iniciado",
      description: `QR Code ${activationCode} baixado com sucesso.`
    });
  };

  const downloadSelectedCodes = async () => {
    const selected = generatedCodes.filter(c => selectedCodes.has(c.id));
    for (const code of selected) {
      await downloadQRCode(code);
      // Small delay between downloads
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
    
    toast({
      title: "QR Codes removidos",
      description: `${selected.length} QR code(s) removido(s) com sucesso.`
    });
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
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Geração e gerenciamento de QR Codes</p>
        </div>
      </div>

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
            
            <div className="flex items-center gap-2">
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
                      className="w-20 h-20 rounded-full overflow-hidden border-2 border-muted mb-2 flex items-center justify-center bg-white"
                    >
                      <img 
                        src={code.dataUrl} 
                        alt={`QR Code ${activationCode}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <span className="text-xs font-mono font-bold text-foreground">
                      {activationCode}
                    </span>
                    
                    <span className={`text-[10px] mt-1 ${
                      code.type === 'pet_tag' ? 'text-primary' : 'text-blue-400'
                    }`}>
                      {code.type === 'pet_tag' ? 'Pet Tag' : 'Display'}
                    </span>
                    
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
            Cada QR Code é gerado com 23mm de diâmetro (circular) a 300 DPI para impressão de alta qualidade.
          </p>
        </motion.div>
      )}

      {/* Hidden canvas for image generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
