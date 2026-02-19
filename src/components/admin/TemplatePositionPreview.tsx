import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ElementPositions } from "@/types/ecommerce";
import { Eye } from "lucide-react";
import { sanitizeSvg } from "@/lib/sanitize";

interface Props {
  svgContent: string;
  positions: ElementPositions;
  previewUrl?: string | null;
}

export default function TemplatePositionPreview({ svgContent, positions, previewUrl }: Props) {
  // Parse SVG viewBox to get dimensions
  const { svgWidth, svgHeight } = useMemo(() => {
    const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
    let w = 800,
      h = 800;
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number);
      if (parts.length >= 4) {
        w = parts[2];
        h = parts[3];
      }
    }
    return { svgWidth: w, svgHeight: h };
  }, [svgContent]);

  const qr = positions.qr_code || { x: 300, y: 300, width: 200, height: 200 };
  const logo = positions.logo || { x: 50, y: 50, width: 120, height: 120 };
  const cn = positions.company_name || { x: 400, y: 700, fontSize: 24, textAnchor: "middle" as const };
  const on = positions.order_number || { x: 400, y: 780, fontSize: 14 };

  // Build the preview SVG with overlaid elements
  const previewSvg = useMemo(() => {
    let baseSvg = sanitizeSvg(svgContent);

    // Remove closing tag to append
    const closingIdx = baseSvg.lastIndexOf("</svg>");
    if (closingIdx === -1) return baseSvg;

    let body = baseSvg.substring(0, closingIdx);

    // Logo placeholder (circular clip)
    const clipId = "preview-logo-clip";
    const logoR = Math.min(logo.width, logo.height) / 2;
    body += `
      <defs>
        <clipPath id="${clipId}">
          <circle cx="${logo.x + logo.width / 2}" cy="${logo.y + logo.height / 2}" r="${logoR}" />
        </clipPath>
      </defs>
      <circle cx="${logo.x + logo.width / 2}" cy="${logo.y + logo.height / 2}" r="${logoR}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-dasharray="8 4" opacity="0.9" />
      <text x="${logo.x + logo.width / 2}" y="${logo.y + logo.height / 2 + 5}" text-anchor="middle" font-size="${Math.max(12, logoR / 3)}" fill="#3b82f6" font-family="Arial, sans-serif" font-weight="bold">LOGO</text>
    `;

    // QR Code placeholder
    body += `
      <rect x="${qr.x}" y="${qr.y}" width="${qr.width}" height="${qr.height}" fill="rgba(16,185,129,0.15)" stroke="#10b981" stroke-width="3" stroke-dasharray="8 4" rx="4" />
      <text x="${qr.x + qr.width / 2}" y="${qr.y + qr.height / 2 - 8}" text-anchor="middle" font-size="${Math.max(12, qr.width / 8)}" fill="#10b981" font-family="Arial, sans-serif" font-weight="bold">QR CODE</text>
      <text x="${qr.x + qr.width / 2}" y="${qr.y + qr.height / 2 + 14}" text-anchor="middle" font-size="${Math.max(10, qr.width / 12)}" fill="#10b981" font-family="Arial, sans-serif">DSP-XXXXXXXX</text>
    `;

    // Company name placeholder
    const cnAnchor = cn.textAnchor || "middle";
    body += `
      <rect x="${cnAnchor === "middle" ? cn.x - 100 : cnAnchor === "end" ? cn.x - 200 : cn.x}" y="${cn.y - cn.fontSize}" width="200" height="${cn.fontSize + 8}" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6 3" rx="3" />
      <text x="${cn.x}" y="${cn.y}" font-size="${cn.fontSize}" font-family="Arial, sans-serif" font-weight="bold" text-anchor="${cnAnchor}" fill="#c">Nome da Empresa</text>
    `;

    // Order number placeholder
    body += `
      <rect x="${on.x - 60}" y="${on.y - on.fontSize}" width="120" height="${on.fontSize + 6}" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="6 3" rx="3" />
      <text x="${on.x}" y="${on.y}" font-size="${on.fontSize}" font-family="monospace" font-weight="bold" text-anchor="middle" fill="#8b5cf6">#ABC12345</text>
    `;

    body += "</svg>";

    // Adjust dimensions for responsive display
    return body.replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, 'height="100%"');
  }, [svgContent, positions, logo, qr, cn, on]);

  if (!svgContent) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Preview em Tempo Real
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-center">
            <div
              className="w-full max-w-md aspect-[2/3] flex items-center justify-center bg-background rounded-lg overflow-hidden"
              dangerouslySetInnerHTML={{ __html: previewSvg }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#3b82f6] inline-block" /> Logo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#10b981] inline-block" /> QR Code
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#f59e0b] inline-block" /> Empresa
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#8b5cf6] inline-block" /> Nº Pedido
          </span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Arte em proporção 10x15 cm. Exportação em PNG A4 com 2 artes por folha quando houver mais de 1 display.
        </p>
      </CardContent>
    </Card>
  );
}
