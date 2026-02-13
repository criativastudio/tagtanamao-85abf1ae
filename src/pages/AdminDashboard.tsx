import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import QRCodeLib from "qrcode";
import { QrCode, Download, Plus, ArrowLeft, Dog, Building2, Trash2, Check, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardAnalytics from "@/components/dashboard/DashboardAnalytics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GeneratedQRCode {
  id: string;
  qr_code: string;
  type: "pet_tag" | "business_display";
  dataUrl: string;
  category?: string;
}

interface Category {
  id: string;
  name: string;
  codes: GeneratedQRCode[];
}

// Constants for QR code sizing at 300 DPI
const MM_TO_PIXELS = 11.811; // 300 DPI conversion

// Pet Tag: 23mm diameter circle
const QR_DIAMETER_MM = 23;
const QR_DIAMETER_PX = Math.round(QR_DIAMETER_MM * MM_TO_PIXELS); // ~272 pixels

// Business Display: 41.5mm x 41.5mm square (4.15cm)
const DISPLAY_SIZE_MM = 41.5;
const DISPLAY_SIZE_PX = Math.round(DISPLAY_SIZE_MM * MM_TO_PIXELS); // ~490 pixels

// 1 meter = 1000mm, at 300 DPI = ~11811 pixels
const SHEET_SIZE_MM = 1000;
const SHEET_SIZE_PX = Math.round(SHEET_SIZE_MM * MM_TO_PIXELS);

const generateUniqueCode = async (): Promise<string> => {
  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  let code = generateCode();
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    // Check if code exists in pet_tags
    const { data: petData } = await supabase.from("pet_tags").select("id").eq("qr_code", code).maybeSingle();

    // Check if code exists in business_displays
    const { data: displayData } = await supabase
      .from("business_displays")
      .select("id")
      .eq("qr_code", code)
      .maybeSingle();

    if (!petData && !displayData) {
      return code;
    }

    code = generateCode();
    attempts++;
  }

  throw new Error("Não foi possível gerar um código único. Tente novamente.");
};

// Create a single QR code canvas with updated design - handles both pet tags (circular) and displays (square)
const createQRCodeCanvas = async (code: GeneratedQRCode): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  const isDisplay = code.type === "business_display";
  const size = isDisplay ? DISPLAY_SIZE_PX : QR_DIAMETER_PX;

  canvas.width = size;
  canvas.height = size;

  const centerX = size / 2;
  const centerY = size / 2;

  if (isDisplay) {
    // Business Display: Square format 4.15cm x 4.15cm

    // White square background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);

    // Cut line rectangle - magenta color standard for cut lines
    // ctx.strokeStyle = '#FF00FF';
    // ctx.lineWidth = 1;
    // ctx.strokeRect(1, 1, size - 2, size - 2);

    // Add corner registration marks
    // const markLength = 12;
    // const markOffset = 6;
    // ctx.strokeStyle = '#FF00FF';
    // ctx.lineWidth = 0.5;

    // Top-left corner
    // ctx.beginPath();
    // ctx.moveTo(markOffset, markOffset);
    // ctx.lineTo(markOffset + markLength, markOffset);
    // ctx.moveTo(markOffset, markOffset);
    // ctx.lineTo(markOffset, markOffset + markLength);
    // ctx.stroke();

    // Top-right corner
    // ctx.beginPath();
    // ctx.moveTo(size - markOffset, markOffset);
    // ctx.lineTo(size - markOffset - markLength, markOffset);
    // ctx.moveTo(size - markOffset, markOffset);
    // ctx.lineTo(size - markOffset, markOffset + markLength);
    // ctx.stroke();

    // Bottom-left corner
    // ctx.beginPath();
    // ctx.moveTo(markOffset, size - markOffset);
    // ctx.lineTo(markOffset + markLength, size - markOffset);
    // ctx.moveTo(markOffset, size - markOffset);
    // ctx.lineTo(markOffset, size - markOffset - markLength);
    // ctx.stroke();

    // Bottom-right corner
    // ctx.beginPath();
    // ctx.moveTo(size - markOffset, size - markOffset);
    // ctx.lineTo(size - markOffset - markLength, size - markOffset);
    // ctx.moveTo(size - markOffset, size - markOffset);
    // ctx.lineTo(size - markOffset, size - markOffset - markLength);
    // ctx.stroke();

    // QR code size - larger for square format (80% of width)
    const qrSize = Math.round(size * 0.75);

    const qrDataUrl = await QRCodeLib.toDataURL(`${window.location.origin}/display/${code.qr_code}`, {
      width: qrSize,
      margin: 0,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    });

    const img = new Image();
    img.src = qrDataUrl;

    await new Promise<void>((resolve) => {
      img.onload = () => {
        const qrX = (size - qrSize) / 2;
        const qrY = Math.round(size * 0.08); // Position from top
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
        resolve();
      };
    });

    // Draw activation code at the bottom - small font
    const activationCode = code.qr_code;
    ctx.fillStyle = "#000000";
    ctx.font = `${Math.round(size * 0.06)}px Arial`; // Smaller font for display
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textY = size * 0.93; // Position text at 93% from top (bottom area)
    ctx.fillText(activationCode, centerX, textY);
  } else {
    // Pet Tag: Circular format 23mm diameter
    const radius = size / 2;

    // White circular background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    // Cut line circle - magenta color standard for cut lines
    // ctx.beginPath();
    // ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
    // ctx.strokeStyle = '#FF00FF';
    // ctx.lineWidth = 0.5;
    // ctx.stroke();

    // Add registration marks (cross marks at cardinal points)
    // const markLength = 8;
    // const markOffset = 4;
    // ctx.strokeStyle = '#FF00FF';
    // ctx.lineWidth = 0.5;

    // Top mark
    // ctx.beginPath();
    // ctx.moveTo(centerX, markOffset);
    // ctx.lineTo(centerX, markOffset + markLength);
    // ctx.stroke();

    // Bottom mark
    // ctx.beginPath();
    // ctx.moveTo(centerX, size - markOffset);
    // ctx.lineTo(centerX, size - markOffset - markLength);
    // ctx.stroke();

    // Left mark
    // ctx.beginPath();
    // ctx.moveTo(markOffset, centerY);
    // ctx.lineTo(markOffset + markLength, centerY);
    // ctx.stroke();

    // Right mark
    // ctx.beginPath();
    // ctx.moveTo(size - markOffset, centerY);
    // ctx.lineTo(size - markOffset - markLength, centerY);
    // ctx.stroke();

    // QR code size for pet tag
    const qrSize = Math.round(size * 0.68);

    const qrDataUrl = await QRCodeLib.toDataURL(`${window.location.origin}/pet/${code.qr_code}`, {
      width: qrSize,
      margin: 0,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
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

    // Draw activation code
    const activationCode = code.qr_code;
    ctx.fillStyle = "#000000";
    ctx.font = `${Math.round(size * 0.08)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textY = size * 0.9;
    ctx.fillText(activationCode, centerX, textY);
  }

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

  // Categories state - persisted in localStorage
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem("admin_qr_categories");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportCategory, setExportCategory] = useState<string>("");

  // Manual QR Code creation
  const [manualCode, setManualCode] = useState("");
  const [manualType, setManualType] = useState<"pet_tag" | "business_display">("pet_tag");
  const [creatingManual, setCreatingManual] = useState(false);

  // Logo upload (SVG) for print export
  const [logoSvgContent, setLogoSvgContent] = useState("");
  const [logoFileName, setLogoFileName] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Persist categories to localStorage
  useEffect(() => {
    localStorage.setItem("admin_qr_categories", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    if (!loading && profile && !profile.is_admin) {
      navigate("/dashboard");
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
    }
  }, [profile, loading, navigate, toast]);

  const generateQRCodes = async (type: "pet_tag" | "business_display", count: number) => {
    setGenerating(true);
    const newCodes: GeneratedQRCode[] = [];

    try {
      for (let i = 0; i < count; i++) {
        const uniqueCode = await generateUniqueCode();
        const table = type === "pet_tag" ? "pet_tags" : "business_displays";

        const { data, error } = await supabase
          .from(table)
          .insert({
            user_id: user?.id,
            qr_code: uniqueCode,
          })
          .select("id, qr_code")
          .single();

        if (error) throw error;

        const baseUrl = window.location.origin;
        const url = type === "pet_tag" ? `${baseUrl}/pet/${data.qr_code}` : `${baseUrl}/display/${data.qr_code}`;

        const qrSize = Math.round(QR_DIAMETER_PX * 0.72);

        const dataUrl = await QRCodeLib.toDataURL(url, {
          width: qrSize,
          margin: 0,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
          errorCorrectionLevel: "H",
        });

        newCodes.push({
          id: data.id,
          qr_code: data.qr_code,
          type,
          dataUrl,
          category: selectedCategory && selectedCategory !== "none" ? selectedCategory : undefined,
        });
      }

      setGeneratedCodes((prev) => [...prev, ...newCodes]);

      // Add to category if selected
      if (selectedCategory && selectedCategory !== "none") {
        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.id === selectedCategory) {
              return { ...cat, codes: [...cat.codes, ...newCodes] };
            }
            return cat;
          }),
        );
      }

      toast({
        title: "QR Codes gerados!",
        description: `${count} ${type === "pet_tag" ? "tag(s) pet" : "display(s)"} criado(s) com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar QR Codes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadQRCode = async (code: GeneratedQRCode) => {
    const canvas = await createQRCodeCanvas(code);

    const link = document.createElement("a");
    link.download = `qrcode-${code.qr_code}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    toast({
      title: "Download iniciado",
      description: `QR Code ${code.qr_code} baixado com sucesso.`,
    });
  };

  const downloadSelectedCodes = async () => {
    const selected = generatedCodes.filter((c) => selectedCodes.has(c.id));
    for (const code of selected) {
      await downloadQRCode(code);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  };

  const downloadAllCodes = async () => {
    for (const code of generatedCodes) {
      await downloadQRCode(code);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedCodes((prev) => {
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
      setSelectedCodes(new Set(generatedCodes.map((c) => c.id)));
    }
  };

  const deleteSelected = async () => {
    const selected = generatedCodes.filter((c) => selectedCodes.has(c.id));

    for (const code of selected) {
      const table = code.type === "pet_tag" ? "pet_tags" : "business_displays";
      await supabase.from(table).delete().eq("id", code.id);
    }

    setGeneratedCodes((prev) => prev.filter((c) => !selectedCodes.has(c.id)));
    setSelectedCodes(new Set());

    // Also remove from categories
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        codes: cat.codes.filter((c) => !selectedCodes.has(c.id)),
      })),
    );

    toast({
      title: "QR Codes removidos",
      description: `${selected.length} QR code(s) removido(s) com sucesso.`,
    });
  };

  const createCategory = () => {
    if (!newCategoryName.trim()) return;

    const newCategory: Category = {
      id: crypto.randomUUID(),
      name: newCategoryName.trim(),
      codes: [],
    };

    setCategories((prev) => [...prev, newCategory]);
    setNewCategoryName("");
    setShowCategoryDialog(false);

    toast({
      title: "Categoria criada",
      description: `Categoria "${newCategory.name}" criada com sucesso.`,
    });
  };

  const addSelectedToCategory = (categoryId: string) => {
    const selected = generatedCodes.filter((c) => selectedCodes.has(c.id));

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          // Avoid duplicates
          const existingIds = new Set(cat.codes.map((c) => c.id));
          const newCodes = selected.filter((c) => !existingIds.has(c.id));
          return { ...cat, codes: [...cat.codes, ...newCodes] };
        }
        return cat;
      }),
    );

    // Update codes with category
    setGeneratedCodes((prev) =>
      prev.map((c) => {
        if (selectedCodes.has(c.id)) {
          return { ...c, category: categoryId };
        }
        return c;
      }),
    );

    setSelectedCodes(new Set());

    toast({
      title: "Códigos adicionados",
      description: `${selected.length} código(s) adicionado(s) à categoria.`,
    });
  };

  const createManualQRCode = async () => {
    if (!/^\d{1,6}$/.test(manualCode)) {
      toast({
        title: "Código inválido",
        description: "O código deve ser numérico com no máximo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setCreatingManual(true);
    try {
      // Check duplicates in both tables
      const [petCheck, displayCheck] = await Promise.all([
        supabase.from("pet_tags").select("id").eq("qr_code", manualCode).maybeSingle(),
        supabase.from("business_displays").select("id").eq("qr_code", manualCode).maybeSingle(),
      ]);

      if (petCheck.data || displayCheck.data) {
        toast({ title: "Código duplicado", description: "Este código já existe no sistema.", variant: "destructive" });
        return;
      }

      const table = manualType === "pet_tag" ? "pet_tags" : "business_displays";
      const { data, error } = await supabase
        .from(table)
        .insert({ user_id: user?.id, qr_code: manualCode })
        .select("id, qr_code")
        .single();

      if (error) throw error;

      const baseUrl = window.location.origin;
      const url = manualType === "pet_tag" ? `${baseUrl}/pet/${data.qr_code}` : `${baseUrl}/display/${data.qr_code}`;
      const qrSize = Math.round(QR_DIAMETER_PX * 0.72);
      const dataUrl = await QRCodeLib.toDataURL(url, {
        width: qrSize,
        margin: 0,
        color: { dark: "#000000", light: "#FFFFFF" },
        errorCorrectionLevel: "H",
      });

      setGeneratedCodes((prev) => [...prev, { id: data.id, qr_code: data.qr_code, type: manualType, dataUrl }]);
      setManualCode("");
      toast({
        title: "QR Code criado!",
        description: `Código ${data.qr_code} (${manualType === "pet_tag" ? "Pet Tag" : "Display"}) criado com sucesso.`,
      });
    } catch (error: any) {
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    } finally {
      setCreatingManual(false);
    }
  };

  const deleteCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));

    // Remove category reference from codes
    setGeneratedCodes((prev) =>
      prev.map((c) => {
        if (c.category === categoryId) {
          return { ...c, category: undefined };
        }
        return c;
      }),
    );

    toast({
      title: "Categoria removida",
      description: "Categoria removida com sucesso. Os QR Codes permanecem.",
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    if (!isSvg) {
      toast({ title: "Formato inválido", description: "Envie um arquivo SVG.", variant: "destructive" });
      return;
    }

    const content = await file.text();
    setLogoSvgContent(content);
    setLogoFileName(file.name);
    event.target.value = "";

    toast({ title: "Logo carregada", description: "Logo SVG pronta para exportação." });
  };

  // Export QR codes as SVG grid for 1m² sheet (CorelDRAW compatible)
  const exportCategoryAsSVG = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category || category.codes.length === 0) {
      toast({
        title: "Erro",
        description: "Categoria vazia ou não encontrada.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Gerando arquivo...",
      description: "Aguarde enquanto o arquivo é preparado.",
    });

    try {
      // Determine type from first code in category (categories should contain same type)
      const codeType = category.codes[0]?.type || "pet_tag";
      const isDisplay = codeType === "business_display";

      // Pet Tag print export with QR + logo (684 + 684)
      if (!isDisplay) {
        if (!logoSvgContent) {
          toast({
            title: "Logo obrigatória",
            description: "Faça upload da logo SVG para exportar.",
            variant: "destructive",
          });
          return;
        }

        if (category.codes.length < 684) {
          toast({
            title: "Quantidade insuficiente",
            description: "São necessários 684 QR Codes para a arte 1m².",
            variant: "destructive",
          });
          return;
        }

        const codesToExport = category.codes.slice(0, 684);
        const qrImages: string[] = [];
        for (const code of codesToExport) {
          const canvas = await createQRCodeCanvas(code);
          qrImages.push(canvas.toDataURL("image/png"));
        }

        const totalItems = 1368;
        const cols = 38;
        const rows = 36;
        const cellSizeX = SHEET_SIZE_MM / cols;
        const cellSizeY = SHEET_SIZE_MM / rows;
        const itemSize = QR_DIAMETER_MM;

        const logoDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(logoSvgContent)))}`;

        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${SHEET_SIZE_MM}mm" height="${SHEET_SIZE_MM}mm" 
     viewBox="0 0 ${SHEET_SIZE_MM} ${SHEET_SIZE_MM}">
  <title>QR Codes + Logo - ${category.name}</title>
  <desc>Categoria: ${category.name} - 684 QR Codes + 684 Logos - Pet Tag 23mm - Gerado para impressão em 1m²</desc>
  
  <!-- Styles -->
  <defs>
    <style>
      .cut-line { fill: none; stroke: #FF00FF; stroke-width: 0.1; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="white"/>
  
  <!-- Cut Lines Layer (Magenta - standard for die-cut) -->
  <g id="CutLines">
`;

        for (let index = 0; index < totalItems; index++) {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = col * cellSizeX + cellSizeX / 2;
          const y = row * cellSizeY + cellSizeY / 2;
          const r = itemSize / 2;
          svgContent += `    <circle cx="${x}" cy="${y}" r="${r}" class="cut-line"/>
`;
        }

        svgContent += `  </g>
  
  <!-- QR Codes + Logos Layer -->
  <g id="PrintItems">
`;

        for (let index = 0; index < totalItems; index++) {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = col * cellSizeX + cellSizeX / 2;
          const y = row * cellSizeY + cellSizeY / 2;
          const isQr = index % 2 === 0;
          const imageSrc = isQr ? qrImages[Math.floor(index / 2)] : logoDataUrl;

          svgContent += `    <g transform="translate(${x}, ${y})">
      <image x="${-itemSize / 2}" y="${-itemSize / 2}" 
             width="${itemSize}" height="${itemSize}"
             xlink:href="${imageSrc}"
             preserveAspectRatio="xMidYMid meet"/>
    </g>
`;
        }

        svgContent += `  </g>
</svg>`;

        const blob = new Blob([svgContent], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `qrcodes-${category.name}-1m2-qr-logo-1368.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        setShowExportDialog(false);

        toast({
          title: "Arquivo exportado!",
          description: "Arte 1m² pronta com 684 QR Codes + 684 logos (23mm).",
        });

        return;
      }

      // Use appropriate size based on type (Display export)
      const itemSize = isDisplay ? DISPLAY_SIZE_MM : QR_DIAMETER_MM;
      const padding = 2; // 2mm padding between items
      const cellSize = itemSize + padding;
      const cols = Math.floor(SHEET_SIZE_MM / cellSize);
      const rows = Math.floor(SHEET_SIZE_MM / cellSize);
      const maxCodes = cols * rows;

      const codesToExport = category.codes.slice(0, maxCodes);

      // Create PNG images for each QR code
      const qrImages: string[] = [];
      for (const code of codesToExport) {
        const canvas = await createQRCodeCanvas(code);
        qrImages.push(canvas.toDataURL("image/png"));
      }

      // Generate SVG content (CorelDRAW compatible) with vector cut lines
      let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${SHEET_SIZE_MM}mm" height="${SHEET_SIZE_MM}mm" 
     viewBox="0 0 ${SHEET_SIZE_MM} ${SHEET_SIZE_MM}">
  <title>QR Codes - ${category.name}</title>
  <desc>Categoria: ${category.name} - ${codesToExport.length} códigos - Tipo: ${isDisplay ? "Display (4.15x4.15cm)" : "Pet Tag (23mm)"} - Gerado para impressão em 1m²</desc>
  
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

      // Add vector cut shapes for each QR code (individual type check)
      codesToExport.forEach((code, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;

        const codeIsDisplay = code.type === "business_display";
        const codeItemSize = codeIsDisplay ? DISPLAY_SIZE_MM : QR_DIAMETER_MM;
        if (codeIsDisplay) {
          // Square cut line for displays
          const halfSize = codeItemSize / 2;
          svgContent += `    <rect x="${x - halfSize}" y="${y - halfSize}" width="${codeItemSize}" height="${codeItemSize}" class="cut-line"/>
`;
        } else {
          // Circular cut line for pet tags
          const r = codeItemSize / 2;
          svgContent += `    <circle cx="${x}" cy="${y}" r="${r}" class="cut-line"/>
`;
        }
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
      <image x="${-itemSize / 2}" y="${-itemSize / 2}" 
             width="${itemSize}" height="${itemSize}"
             xlink:href="${qrImages[index]}"
             preserveAspectRatio="xMidYMid meet"/>
    </g>
`;
      });

      svgContent += `  </g>
</svg>`;

      // Download SVG
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `qrcodes-${category.name}-${isDisplay ? "displays" : "pet-tags"}-${codesToExport.length}unidades.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      setShowExportDialog(false);

      toast({
        title: "Arquivo exportado!",
        description: `${codesToExport.length} QR Codes ${isDisplay ? "(4.15x4.15cm)" : "(23mm)"} exportados em grade para impressão. Abra o arquivo SVG no CorelDRAW.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro na exportação",
        description: error.message,
        variant: "destructive",
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Geração e gerenciamento de QR Codes</p>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Analytics - Todos os Scans</h2>
        </div>
        <DashboardAnalytics showAll />
      </motion.div>

      {/* Financeiro Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-8"
      >
        <Button
          variant="outline"
          className="w-full sm:w-auto gap-2 h-12 text-base"
          onClick={() => navigate("/admin/financeiro")}
        >
          <BarChart3 className="w-5 h-5 text-primary" />
          Abrir Painel Financeiro
        </Button>
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
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={() => generateQRCodes("pet_tag", petTagCount)}
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
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={() => generateQRCodes("business_display", displayCount)}
              disabled={generating}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Gerar {displayCount} Display(s)
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Manual QR Code Creation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6 rounded-xl mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <QrCode className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Criar QR Code Manual</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="manualCode">Código (numérico, max 6 dígitos)</Label>
            <Input
              id="manualCode"
              value={manualCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setManualCode(val);
              }}
              placeholder="Ex: 123456"
              maxLength={6}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={manualType} onValueChange={(v) => setManualType(v as "pet_tag" | "business_display")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pet_tag">Pet Tag</SelectItem>
                <SelectItem value="business_display">Meu Display</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createManualQRCode} disabled={creatingManual || !manualCode}>
            <Plus className="w-4 h-4 mr-2" />
            {creatingManual ? "Criando..." : "Criar"}
          </Button>
        </div>
      </motion.div>

      {/* Exportação para Impressão */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card p-6 rounded-xl mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <Download className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Exportação para Impressão (1m²)</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          <div>
            <Label>Categoria</Label>
            <Select value={exportCategory} onValueChange={setExportCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Logo Tag Tá na Mão (SVG)</Label>
            <div className="flex items-center gap-3 mt-1">
              <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>
                Upload Logo (SVG)
              </Button>
              {logoFileName && (
                <span className="text-xs text-muted-foreground truncate max-w-[180px]">{logoFileName}</span>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept=".svg,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>

          <Button variant="hero" onClick={() => exportCategoryAsSVG(exportCategory)} disabled={!exportCategory}>
            Exportar 1m²
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Exporta 1m² com 684 QR Codes + 684 logos circulares (23mm) distribuídos automaticamente.
        </p>
      </motion.div>

      {generatedCodes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <QrCode className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">QR Codes Gerados ({generatedCodes.length})</h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedCodes.size === generatedCodes.length ? "Desmarcar" : "Selecionar"} Todos
              </Button>

              {selectedCodes.size > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={downloadSelectedCodes}>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar ({selectedCodes.size})
                  </Button>
                  <Button variant="destructive" size="sm" onClick={deleteSelected}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </>
              )}

              <Button variant="hero" size="sm" onClick={downloadAllCodes}>
                <Download className="w-4 h-4 mr-2" />
                Baixar Todos
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {generatedCodes.map((code) => {
              const activationCode = code.qr_code;
              const isSelected = selectedCodes.has(code.id);
              const categoryName = categories.find((c) => c.id === code.category)?.name;

              return (
                <motion.div
                  key={code.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`relative p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => toggleSelect(code.id)}
                >
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}

                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden border border-muted/50 mb-2 flex items-center justify-center bg-white">
                      <img
                        src={code.dataUrl}
                        alt={`QR Code ${activationCode}`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <span className="text-xs font-mono text-foreground">{activationCode}</span>

                    <span className={`text-[10px] mt-1 ${code.type === "pet_tag" ? "text-primary" : "text-blue-400"}`}>
                      {code.type === "pet_tag" ? "Pet Tag" : "Display"}
                    </span>

                    {categoryName && <span className="text-[9px] text-muted-foreground mt-0.5">{categoryName}</span>}

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
            QR Codes: 23mm de diâmetro, borda fina para corte, código em fonte normal. Exportação em grade para
            impressão 1m².
          </p>
        </motion.div>
      )}

      {/* Hidden canvas for image generation */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
