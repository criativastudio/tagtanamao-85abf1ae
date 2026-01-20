import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BioTheme } from "@/types/bioPage";

interface BioThemeEditorProps {
  theme: BioTheme;
  onUpdateTheme: (updates: Partial<BioTheme>) => void;
}

const COLOR_PRESETS = {
  backgrounds: [
    { label: 'Escuro', value: '220 20% 4%' },
    { label: 'Cinza Escuro', value: '220 15% 10%' },
    { label: 'Azul Escuro', value: '220 30% 8%' },
    { label: 'Verde Escuro', value: '160 30% 8%' },
    { label: 'Roxo Escuro', value: '270 30% 10%' },
  ],
  primary: [
    { label: 'Verde Tech', value: '160 84% 45%' },
    { label: 'Ciano', value: '180 100% 50%' },
    { label: 'Roxo', value: '270 84% 55%' },
    { label: 'Rosa', value: '330 70% 55%' },
    { label: 'Laranja', value: '25 95% 55%' },
    { label: 'Azul', value: '220 84% 55%' },
  ],
};

const THEME_PRESETS = [
  {
    name: 'Tech Verde',
    theme: {
      backgroundColor: '220 20% 4%',
      cardColor: '220 20% 7%',
      primaryColor: '160 84% 45%',
      textColor: '0 0% 98%',
      ledColor: '160 84% 45%',
    }
  },
  {
    name: 'Neon Ciano',
    theme: {
      backgroundColor: '200 30% 6%',
      cardColor: '200 25% 10%',
      primaryColor: '180 100% 50%',
      textColor: '0 0% 98%',
      ledColor: '180 100% 50%',
    }
  },
  {
    name: 'Roxo Místico',
    theme: {
      backgroundColor: '270 30% 6%',
      cardColor: '270 25% 12%',
      primaryColor: '270 84% 60%',
      textColor: '0 0% 98%',
      ledColor: '270 84% 60%',
    }
  },
  {
    name: 'Rosa Quente',
    theme: {
      backgroundColor: '330 20% 6%',
      cardColor: '330 20% 10%',
      primaryColor: '330 70% 55%',
      textColor: '0 0% 98%',
      ledColor: '330 70% 55%',
    }
  },
];

export const BioThemeEditor = ({ theme, onUpdateTheme }: BioThemeEditorProps) => {
  return (
    <div className="space-y-4">
      {/* Theme Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Temas Prontos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => onUpdateTheme(preset.theme)}
                className="p-3 rounded-lg border-2 border-transparent hover:border-primary transition-all text-left"
                style={{ 
                  backgroundColor: `hsl(${preset.theme.backgroundColor})`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: `hsl(${preset.theme.primaryColor})` }}
                  />
                  <span 
                    className="text-sm font-medium"
                    style={{ color: `hsl(${preset.theme.textColor})` }}
                  >
                    {preset.name}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-2 flex-1 rounded"
                      style={{ 
                        backgroundColor: `hsl(${preset.theme.cardColor})`,
                        boxShadow: `0 0 8px hsl(${preset.theme.ledColor} / 0.5)`,
                      }}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cores Personalizadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Cor de Fundo</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.backgrounds.map((color) => (
                <button
                  key={color.value}
                  onClick={() => onUpdateTheme({ backgroundColor: color.value })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    theme.backgroundColor === color.value ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: `hsl(${color.value})` }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Cor Principal</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.primary.map((color) => (
                <button
                  key={color.value}
                  onClick={() => onUpdateTheme({ primaryColor: color.value, ledColor: color.value })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    theme.primaryColor === color.value ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: `hsl(${color.value})` }}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Button Style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estilo dos Botões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={theme.buttonStyle}
            onValueChange={(value) => onUpdateTheme({ buttonStyle: value as BioTheme['buttonStyle'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="glass">Glass (Vidro)</SelectItem>
              <SelectItem value="solid">Sólido</SelectItem>
              <SelectItem value="outline">Contorno</SelectItem>
              <SelectItem value="gradient">Gradiente</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Effects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Efeitos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Efeito LED / Glow</Label>
              <p className="text-xs text-muted-foreground">Brilho animado nos elementos</p>
            </div>
            <Switch
              checked={theme.ledEnabled}
              onCheckedChange={(checked) => onUpdateTheme({ ledEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Mostrar Galeria</Label>
              <p className="text-xs text-muted-foreground">Exibir fotos na página</p>
            </div>
            <Switch
              checked={theme.showGallery}
              onCheckedChange={(checked) => onUpdateTheme({ showGallery: checked })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Intensidade do Blur</Label>
              <span className="text-sm text-muted-foreground">{theme.blurAmount}px</span>
            </div>
            <Slider
              value={[theme.blurAmount]}
              onValueChange={([value]) => onUpdateTheme({ blurAmount: value })}
              min={0}
              max={24}
              step={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
