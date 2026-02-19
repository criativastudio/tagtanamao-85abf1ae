import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ElementPositions } from '@/types/ecommerce';
import { Move, QrCode, Image, Type } from 'lucide-react';

interface Props {
  positions: ElementPositions;
  onChange: (positions: ElementPositions) => void;
}

function PosField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 text-sm"
      />
    </div>
  );
}

export default function TemplatePositionControls({ positions, onChange }: Props) {
  const update = (key: keyof ElementPositions, field: string, value: number) => {
    onChange({
      ...positions,
      [key]: { ...((positions[key] as any) || {}), [field]: value },
    });
  };

  const qr = positions.qr_code || { x: 300, y: 300, width: 200, height: 200 };
  const logo = positions.logo || { x: 50, y: 50, width: 120, height: 120 };
  const cn = positions.company_name || { x: 400, y: 700, fontSize: 24, textAnchor: 'middle' as const };
  const on = positions.order_number || { x: 400, y: 780, fontSize: 14 };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Move className="w-4 h-4" />
          Posições dos Elementos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* QR Code */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <QrCode className="w-4 h-4 text-primary" /> QR Code
          </Label>
          <div className="grid grid-cols-4 gap-2">
            <PosField label="X" value={qr.x} onChange={(v) => update('qr_code', 'x', v)} />
            <PosField label="Y" value={qr.y} onChange={(v) => update('qr_code', 'y', v)} />
            <PosField label="Largura" value={qr.width} onChange={(v) => update('qr_code', 'width', v)} />
            <PosField label="Altura" value={qr.height} onChange={(v) => update('qr_code', 'height', v)} />
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Image className="w-4 h-4 text-primary" /> Logomarca
          </Label>
          <div className="grid grid-cols-4 gap-2">
            <PosField label="X" value={logo.x} onChange={(v) => update('logo', 'x', v)} />
            <PosField label="Y" value={logo.y} onChange={(v) => update('logo', 'y', v)} />
            <PosField label="Largura" value={logo.width} onChange={(v) => update('logo', 'width', v)} />
            <PosField label="Altura" value={logo.height} onChange={(v) => update('logo', 'height', v)} />
          </div>
        </div>

        {/* Company Name */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Type className="w-4 h-4 text-primary" /> Nome da Empresa
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <PosField label="X" value={cn.x} onChange={(v) => update('company_name', 'x', v)} />
            <PosField label="Y" value={cn.y} onChange={(v) => update('company_name', 'y', v)} />
            <PosField label="Tamanho" value={cn.fontSize} onChange={(v) => update('company_name', 'fontSize', v)} />
          </div>
        </div>

        {/* Unique Code */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Type className="w-4 h-4 text-muted-foreground" /> Código Único
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <PosField label="X" value={on.x} onChange={(v) => update('order_number', 'x', v)} />
            <PosField label="Y" value={on.y} onChange={(v) => update('order_number', 'y', v)} />
            <PosField label="Tamanho" value={on.fontSize} onChange={(v) => update('order_number', 'fontSize', v)} />
          </div>
          <p className="text-xs text-muted-foreground">Cor branca, centralizado na parte inferior da arte</p>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Tamanho final: 10x15 cm. Para impressão, as artes são exportadas em PNG alta qualidade em A4 com 2 por folha quando houver mais de 1.
        </p>
      </CardContent>
    </Card>
  );
}
