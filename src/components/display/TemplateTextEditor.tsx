import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus } from "lucide-react";
import { useState } from "react";

interface Props {
  headline: string;
  subheadline: string;
  heroSubtitle: string;
  tags: string[];
  onChange: (data: { headline: string; subheadline: string; heroSubtitle: string; tags: string[] }) => void;
}

export default function TemplateTextEditor({ headline, subheadline, heroSubtitle, tags, onChange }: Props) {
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const val = tagInput.trim();
    if (val && !tags.includes(val)) {
      onChange({ headline, subheadline, heroSubtitle, tags: [...tags, val] });
      setTagInput("");
    }
  };

  const removeTag = (i: number) => {
    onChange({ headline, subheadline, heroSubtitle, tags: tags.filter((_, idx) => idx !== i) });
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Textos do Hero</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Subtítulo Superior</Label>
          <Input
            value={subheadline}
            onChange={(e) => onChange({ headline, subheadline: e.target.value, heroSubtitle, tags })}
            placeholder="FOTOGRAFAR É ETERNIZAR"
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Headline Principal</Label>
          <Input
            value={headline}
            onChange={(e) => onChange({ headline: e.target.value, subheadline, heroSubtitle, tags })}
            placeholder="MOMENTOS"
            className="text-sm font-bold"
          />
          <p className="text-[10px] text-muted-foreground">Fonte Bebas Neue, estilo Netflix</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Subtítulo Inferior</Label>
          <Input
            value={heroSubtitle}
            onChange={(e) => onChange({ headline, subheadline, heroSubtitle: e.target.value, tags })}
            placeholder="COM ANA LUA"
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Tags Descritivas</Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Ex: Fascinante"
              className="text-sm flex-1"
            />
            <Button variant="outline" size="sm" onClick={addTag} type="button">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-xs">
                  {tag}
                  <button onClick={() => removeTag(i)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
