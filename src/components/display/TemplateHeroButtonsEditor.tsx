import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface HeroButton {
  label: string;
  icon?: string;
  url?: string;
  action?: string;
}

const ICON_OPTIONS = [
  "Plus", "ChevronDown", "Info", "Play", "Heart", "Star",
  "Share2", "ExternalLink", "MessageCircle", "Phone", "Mail"
];

interface Props {
  buttons: HeroButton[];
  onChange: (buttons: HeroButton[]) => void;
}

export default function TemplateHeroButtonsEditor({ buttons, onChange }: Props) {
  const addButton = () => {
    if (buttons.length >= 4) return;
    onChange([...buttons, { label: "Novo Botão", icon: "Plus", url: "#" }]);
  };

  const updateButton = (i: number, patch: Partial<HeroButton>) => {
    const updated = buttons.map((b, idx) => idx === i ? { ...b, ...patch } : b);
    onChange(updated);
  };

  const removeButton = (i: number) => {
    onChange(buttons.filter((_, idx) => idx !== i));
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Botões do Hero</span>
          <Button variant="outline" size="sm" onClick={addButton} disabled={buttons.length >= 4}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {buttons.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Adicione botões de ação no hero (máx. 4)
          </p>
        )}
        {buttons.map((btn, i) => (
          <div key={i} className="border border-border rounded-lg p-3 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Botão {i + 1}</span>
              <button onClick={() => removeButton(i)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Label</Label>
                <Input value={btn.label} onChange={(e) => updateButton(i, { label: e.target.value })} className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Ícone</Label>
                <Select value={btn.icon || "Plus"} onValueChange={(v) => updateButton(i, { icon: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">URL / Ação</Label>
              <Input value={btn.url || ""} onChange={(e) => updateButton(i, { url: e.target.value })} placeholder="https://... ou #links" className="text-xs h-8" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
