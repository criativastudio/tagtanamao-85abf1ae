import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BioButton } from "@/types/bioPage";
import { SpecialButtonFields } from "@/components/bio/SpecialButtonFields";
import { Wifi, QrCode, Contact, Calendar } from "lucide-react";

interface SpecialButton {
  id: string;
  label: string;
  url: string;
  icon: string;
  enabled?: boolean;
}

interface Props {
  buttons: SpecialButton[];
  onChange: (buttons: SpecialButton[]) => void;
}

const SPECIAL_BUTTON_DEFINITIONS = [
  { id: "wifi", icon: "Wifi", label: "Conectar ao Wi-Fi", LucideIcon: Wifi },
  { id: "pix", icon: "QrCode", label: "PIX", LucideIcon: QrCode },
  { id: "contact", icon: "Contact", label: "Salvar Contato", LucideIcon: Contact },
  { id: "calendar", icon: "Calendar", label: "Agendamento", LucideIcon: Calendar },
];

export default function TemplateSpecialButtonsEditor({ buttons, onChange }: Props) {
  const getButton = (id: string) => buttons.find(b => b.id === id);

  const toggleButton = (def: typeof SPECIAL_BUTTON_DEFINITIONS[0], enabled: boolean) => {
    const existing = getButton(def.id);
    if (existing) {
      onChange(buttons.map(b => b.id === def.id ? { ...b, enabled } : b));
    } else {
      onChange([...buttons, { id: def.id, label: def.label, url: "", icon: def.icon, enabled }]);
    }
  };

  const updateButtonUrl = (id: string, url: string) => {
    onChange(buttons.map(b => b.id === id ? { ...b, url } : b));
  };

  const updateButtonLabel = (id: string, label: string) => {
    onChange(buttons.map(b => b.id === id ? { ...b, label } : b));
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Ative botões de ação especiais que aparecerão na página pública do template.
      </p>

      {SPECIAL_BUTTON_DEFINITIONS.map((def) => {
        const btn = getButton(def.id);
        const isEnabled = btn?.enabled ?? false;
        const IconComp = def.LucideIcon;

        return (
          <Card key={def.id} className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <IconComp className="w-4 h-4" />
                  {def.label}
                </span>
                <Switch checked={isEnabled} onCheckedChange={(v) => toggleButton(def, v)} />
              </CardTitle>
            </CardHeader>
            {isEnabled && (
              <CardContent className="pt-0 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Texto do botão</Label>
                  <input
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={btn?.label || def.label}
                    onChange={(e) => updateButtonLabel(def.id, e.target.value)}
                  />
                </div>
                <SpecialButtonFields
                  button={{
                    id: def.id,
                    label: btn?.label || def.label,
                    url: btn?.url || "",
                    icon: def.icon,
                    type: "special",
                    enabled: true,
                    order: 0,
                    color: "",
                  } as unknown as BioButton}
                  onUpdate={(updates) => {
                    if (updates.url !== undefined) updateButtonUrl(def.id, updates.url);
                  }}
                />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
