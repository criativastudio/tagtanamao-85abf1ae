import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SpecialButtonFields } from "./SpecialButtonFields";
import { 
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
  Instagram, Music2, Youtube, Facebook, Twitter, Linkedin,
  MessageCircle, Phone, Mail, MapPin, Globe, Link,
  Wifi, QrCode, Star, Calendar, Contact
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { BioButton, BUTTON_PRESETS } from "@/types/bioPage";

interface BioButtonEditorProps {
  buttons: BioButton[];
  onAddButton: (preset?: typeof BUTTON_PRESETS[0]) => void;
  onUpdateButton: (id: string, updates: Partial<BioButton>) => void;
  onRemoveButton: (id: string) => void;
  primaryColor: string;
}

const ICON_OPTIONS = [
  { value: 'Instagram', label: 'Instagram', icon: Instagram },
  { value: 'Music2', label: 'TikTok', icon: Music2 },
  { value: 'Youtube', label: 'YouTube', icon: Youtube },
  { value: 'Facebook', label: 'Facebook', icon: Facebook },
  { value: 'Twitter', label: 'Twitter', icon: Twitter },
  { value: 'Linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'MessageCircle', label: 'WhatsApp', icon: MessageCircle },
  { value: 'Phone', label: 'Telefone', icon: Phone },
  { value: 'Mail', label: 'Email', icon: Mail },
  { value: 'MapPin', label: 'Localização', icon: MapPin },
  { value: 'Globe', label: 'Website', icon: Globe },
  { value: 'Link', label: 'Link', icon: Link },
  { value: 'Wifi', label: 'Wi-Fi', icon: Wifi },
  { value: 'QrCode', label: 'PIX', icon: QrCode },
  { value: 'Star', label: 'Google Reviews', icon: Star },
  { value: 'Calendar', label: 'Agendamento', icon: Calendar },
  { value: 'Contact', label: 'Salvar Contato', icon: Contact },
];

export const BioButtonEditor = ({
  buttons,
  onAddButton,
  onUpdateButton,
  onRemoveButton,
  primaryColor,
}: BioButtonEditorProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const handleReorder = (newOrder: BioButton[]) => {
    newOrder.forEach((button, index) => {
      if (button.order !== index) {
        onUpdateButton(button.id, { order: index });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Botões / Links</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPresets(!showPresets)}
            >
              Templates
              {showPresets ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
            <Button size="sm" onClick={() => onAddButton()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presets */}
        <AnimatePresence>
          {showPresets && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 pb-4 border-b">
                {BUTTON_PRESETS.map((preset) => {
                  const IconComponent = ICON_OPTIONS.find(i => i.value === preset.icon)?.icon || Link;
                  return (
                    <Button
                      key={preset.label}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => {
                        onAddButton(preset);
                        setShowPresets(false);
                      }}
                    >
                      <IconComponent className="h-4 w-4 mr-2" />
                      {preset.label}
                    </Button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Button List */}
        {buttons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum botão adicionado</p>
            <p className="text-sm">Clique em "Novo" ou escolha um template</p>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={buttons}
            onReorder={handleReorder}
            className="space-y-2"
          >
            {buttons.sort((a, b) => a.order - b.order).map((button) => {
              const isExpanded = expandedId === button.id;
              const IconComponent = ICON_OPTIONS.find(i => i.value === button.icon)?.icon || Link;

              return (
                <Reorder.Item
                  key={button.id}
                  value={button}
                  className="bg-card border rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : button.id)}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `hsl(${button.color} / 0.2)` }}
                    >
                      <IconComponent 
                        className="h-4 w-4" 
                        style={{ color: `hsl(${button.color})` }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{button.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{button.url || 'Sem URL'}</p>
                    </div>
                    <Switch
                      checked={button.enabled}
                      onCheckedChange={(checked) => {
                        onUpdateButton(button.id, { enabled: checked });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 pt-0 space-y-4 border-t">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Texto do Botão</Label>
                              <Input
                                value={button.label}
                                onChange={(e) => onUpdateButton(button.id, { label: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Ícone</Label>
                              <Select
                                value={button.icon}
                                onValueChange={(value) => onUpdateButton(button.id, { icon: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ICON_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      <div className="flex items-center gap-2">
                                        <option.icon className="h-4 w-4" />
                                        {option.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <SpecialButtonFields 
                            button={button} 
                            onUpdate={(updates) => onUpdateButton(button.id, updates)} 
                          />

                          <div className="space-y-2">
                            <Label>Cor do Botão</Label>
                            <div className="flex gap-2">
                              {['160 84% 45%', '330 70% 55%', '0 84% 60%', '220 84% 55%', '200 84% 55%', '270 84% 55%'].map((color) => (
                                <button
                                  key={color}
                                  onClick={() => onUpdateButton(button.id, { color })}
                                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                                    button.color === color ? 'border-white scale-110' : 'border-transparent'
                                  }`}
                                  style={{ backgroundColor: `hsl(${color})` }}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onRemoveButton(button.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}
      </CardContent>
    </Card>
  );
};
