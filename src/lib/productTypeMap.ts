export const PRODUCT_TYPE_MAP: Record<string, { label: string; colorClass: string }> = {
  pet_tag: { label: "Para Pets", colorClass: "bg-primary/10 text-primary" },
  business_display: { label: "Para Empresas", colorClass: "bg-[hsl(210_80%_55%)]/10 text-[hsl(210_80%_55%)]" },
  nfc_tag: { label: "Tag Celular", colorClass: "bg-[hsl(38_92%_50%)]/10 text-[hsl(38_92%_50%)]" },
  nfc_card: { label: "Card NFC", colorClass: "bg-[hsl(270_70%_60%)]/10 text-[hsl(270_70%_60%)]" },
  template: { label: "Template Digital", colorClass: "bg-[hsl(330_70%_60%)]/10 text-[hsl(330_70%_60%)]" },
};

export function getProductTypeBadge(type: string) {
  return PRODUCT_TYPE_MAP[type] || { label: type, colorClass: "bg-muted text-muted-foreground" };
}
