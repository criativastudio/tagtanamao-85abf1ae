import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface BottomNavItem {
  icon: string;
  label: string;
  url: string;
  badgeCount?: number;
}

const ICON_OPTIONS = [
  "Home", "Heart", "MessageCircle", "Instagram", "Star",
  "Phone", "Globe", "Mail", "MapPin", "ShoppingBag",
  "Music", "Camera", "User", "Calendar", "Gift"
];

const PRESETS: { label: string; item: BottomNavItem }[] = [
  { label: "WhatsApp", item: { icon: "MessageCircle", label: "WhatsApp", url: "https://wa.me/" } },
  { label: "Instagram", item: { icon: "Instagram", label: "Instagram", url: "https://instagram.com/" } },
  { label: "Google Reviews", item: { icon: "Star", label: "Avaliar", url: "https://g.page/" } },
  { label: "Telefone", item: { icon: "Phone", label: "Ligar", url: "tel:" } },
  { label: "Site", item: { icon: "Globe", label: "Site", url: "https://" } },
];

interface Props {
  items: BottomNavItem[];
  onChange: (items: BottomNavItem[]) => void;
}

export default function TemplateBottomNavEditor({ items, onChange }: Props) {
  const addItem = (preset?: BottomNavItem) => {
    if (items.length >= 5) return;
    onChange([...items, preset || { icon: "Home", label: "Início", url: "#top" }]);
  };

  const updateItem = (i: number, patch: Partial<BottomNavItem>) => {
    onChange(items.map((item, idx) => idx === i ? { ...item, ...patch } : item));
  };

  const removeItem = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i));
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Barra Inferior Fixa</CardTitle>
        <p className="text-[10px] text-muted-foreground">Até 5 ícones fixos no rodapé, estilo app</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick presets */}
        <div className="space-y-1.5">
          <Label className="text-[10px]">Adicionar Rápido</Label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <Button key={p.label} variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => addItem(p.item)} disabled={items.length >= 5}>
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Items list */}
        {items.map((item, i) => (
          <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Slot {i + 1}</span>
              <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Ícone</Label>
                <Select value={item.icon} onValueChange={(v) => updateItem(i, { icon: v })}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Label</Label>
                <Input value={item.label} onChange={(e) => updateItem(i, { label: e.target.value })} className="text-[10px] h-7" />
              </div>
              <div className="space-y-1 col-span-1">
                <Label className="text-[10px]">URL</Label>
                <Input value={item.url} onChange={(e) => updateItem(i, { url: e.target.value })} className="text-[10px] h-7" />
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Use os botões acima para adicionar ícones ao rodapé
          </p>
        )}

        {items.length < 5 && (
          <Button variant="outline" className="w-full border-dashed text-xs" size="sm" onClick={() => addItem()}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Manualmente
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
