import { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, GripVertical, Trash2, ChevronDown, ChevronUp, LayoutTemplate,
  Instagram, Music2, Youtube, Facebook, Twitter, Linkedin,
  MessageCircle, Phone, Mail, MapPin, Globe, Link,
  LucideIcon
} from "lucide-react";

export interface PetButton {
  id: string;
  label: string;
  url: string;
  icon: string;
  color: string;
  enabled: boolean;
  order: number;
}

interface PetButtonEditorProps {
  buttons: PetButton[];
  onAddButton: (preset?: Partial<PetButton>) => void;
  onUpdateButton: (buttonId: string, updates: Partial<PetButton>) => void;
  onRemoveButton: (buttonId: string) => void;
  onReorderButtons: (buttons: PetButton[]) => void;
  primaryColor?: string;
}

const iconMap: Record<string, LucideIcon> = {
  Instagram,
  Music2,
  Youtube,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Globe,
  Link,
};

const ICON_OPTIONS = [
  { name: 'Instagram', icon: Instagram },
  { name: 'Music2', icon: Music2 },
  { name: 'Youtube', icon: Youtube },
  { name: 'Facebook', icon: Facebook },
  { name: 'Twitter', icon: Twitter },
  { name: 'Linkedin', icon: Linkedin },
  { name: 'MessageCircle', icon: MessageCircle },
  { name: 'Phone', icon: Phone },
  { name: 'Mail', icon: Mail },
  { name: 'MapPin', icon: MapPin },
  { name: 'Globe', icon: Globe },
  { name: 'Link', icon: Link },
];

const BUTTON_PRESETS = [
  { label: 'Instagram', icon: 'Instagram', color: '#E4405F' },
  { label: 'TikTok', icon: 'Music2', color: '#000000' },
  { label: 'WhatsApp', icon: 'MessageCircle', color: '#25D366' },
  { label: 'YouTube', icon: 'Youtube', color: '#FF0000' },
  { label: 'Facebook', icon: 'Facebook', color: '#1877F2' },
  { label: 'Site', icon: 'Globe', color: '#10b981' },
];

const COLOR_OPTIONS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#000000',
];

export const PetButtonEditor = ({
  buttons,
  onAddButton,
  onUpdateButton,
  onRemoveButton,
  onReorderButtons,
  primaryColor = '#10b981'
}: PetButtonEditorProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const handleReorder = (newOrder: PetButton[]) => {
    const reorderedButtons = newOrder.map((btn, index) => ({
      ...btn,
      order: index,
    }));
    onReorderButtons(reorderedButtons);
  };

  const getIcon = (iconName: string): LucideIcon => {
    return iconMap[iconName] || Link;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Botões Personalizados</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPresets(!showPresets)}
          >
            <LayoutTemplate className="h-4 w-4 mr-1" />
            Templates
          </Button>
          <Button
            size="sm"
            onClick={() => onAddButton()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset Templates */}
        {showPresets && (
          <motion.div 
            className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/50"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {BUTTON_PRESETS.map((preset) => {
              const Icon = getIcon(preset.icon);
              return (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 justify-start"
                  onClick={() => {
                    onAddButton(preset);
                    setShowPresets(false);
                  }}
                >
                  <Icon className="h-4 w-4" style={{ color: preset.color }} />
                  <span className="text-xs">{preset.label}</span>
                </Button>
              );
            })}
          </motion.div>
        )}

        {/* Buttons List */}
        {buttons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum botão adicionado</p>
            <p className="text-xs">Adicione botões de redes sociais, contato ou links personalizados</p>
          </div>
        ) : (
          <Reorder.Group axis="y" values={buttons} onReorder={handleReorder} className="space-y-2">
            {buttons.map((button) => {
              const Icon = getIcon(button.icon);
              const isExpanded = expandedId === button.id;

              return (
                <Reorder.Item 
                  key={button.id} 
                  value={button}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <motion.div
                    className="rounded-lg border bg-card overflow-hidden"
                    layout
                  >
                    {/* Collapsed View */}
                    <div 
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(isExpanded ? null : button.id)}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: button.color }}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{button.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{button.url || 'Sem URL'}</p>
                      </div>
                      <Switch
                        checked={button.enabled}
                        onCheckedChange={(checked) => onUpdateButton(button.id, { enabled: checked })}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Expanded Edit View */}
                    {isExpanded && (
                      <motion.div
                        className="p-4 border-t space-y-4 bg-muted/30"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="space-y-2">
                          <Label className="text-xs">Texto do Botão</Label>
                          <Input
                            value={button.label}
                            onChange={(e) => onUpdateButton(button.id, { label: e.target.value })}
                            placeholder="Nome do botão"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">URL / Link</Label>
                          <Input
                            value={button.url}
                            onChange={(e) => onUpdateButton(button.id, { url: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Ícone</Label>
                          <div className="flex flex-wrap gap-2">
                            {ICON_OPTIONS.map(({ name, icon: IconComp }) => (
                              <Button
                                key={name}
                                variant={button.icon === name ? "default" : "outline"}
                                size="sm"
                                className="w-9 h-9 p-0"
                                onClick={() => onUpdateButton(button.id, { icon: name })}
                              >
                                <IconComp className="h-4 w-4" />
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Cor</Label>
                          <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map((color) => (
                              <button
                                key={color}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${
                                  button.color === color ? 'ring-2 ring-primary ring-offset-2' : ''
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => onUpdateButton(button.id, { color })}
                              />
                            ))}
                          </div>
                        </div>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onRemoveButton(button.id)}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover Botão
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}
      </CardContent>
    </Card>
  );
};
