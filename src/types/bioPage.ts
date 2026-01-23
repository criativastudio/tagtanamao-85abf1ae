export interface BioButton {
  id: string;
  type: 'social' | 'contact' | 'custom';
  label: string;
  url: string;
  icon: string;
  color: string;
  order: number;
  enabled: boolean;
}

export interface BioTheme {
  backgroundColor: string;
  cardColor: string;
  primaryColor: string;
  textColor: string;
  buttonStyle: 'glass' | 'solid' | 'outline' | 'gradient';
  ledEnabled: boolean;
  ledColor: string;
  blurAmount: number;
  showGallery: boolean;
}

export interface BioPage {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  profile_photo_url: string | null;
  gallery_photos: string[];
  buttons: BioButton[];
  theme: BioTheme;
  pet_tag_id: string | null;
  display_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BioPageAnalytics {
  id: string;
  bio_page_id: string;
  event_type: 'view' | 'click';
  button_id: string | null;
  user_agent: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  referrer: string | null;
  created_at: string;
}

export const DEFAULT_THEME: BioTheme = {
  backgroundColor: "220 20% 4%",
  cardColor: "220 20% 7%",
  primaryColor: "160 84% 45%",
  textColor: "0 0% 98%",
  buttonStyle: "glass",
  ledEnabled: true,
  ledColor: "160 84% 45%",
  blurAmount: 12,
  showGallery: true,
};

export const SOCIAL_ICONS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'Music2',
  youtube: 'Youtube',
  facebook: 'Facebook',
  twitter: 'Twitter',
  linkedin: 'Linkedin',
  whatsapp: 'MessageCircle',
  phone: 'Phone',
  email: 'Mail',
  location: 'MapPin',
  website: 'Globe',
  link: 'Link',
};

export const BUTTON_PRESETS = [
  // Social
  { type: 'social' as const, label: 'Instagram', icon: 'Instagram', color: '330 70% 55%' },
  { type: 'social' as const, label: 'TikTok', icon: 'Music2', color: '0 0% 0%' },
  { type: 'social' as const, label: 'YouTube', icon: 'Youtube', color: '0 84% 60%' },
  { type: 'social' as const, label: 'Facebook', icon: 'Facebook', color: '220 84% 55%' },
  { type: 'social' as const, label: 'Twitter', icon: 'Twitter', color: '200 84% 55%' },
  { type: 'social' as const, label: 'LinkedIn', icon: 'Linkedin', color: '210 84% 45%' },
  { type: 'social' as const, label: 'Google Reviews', icon: 'Star', color: '45 93% 47%' },
  // Contact
  { type: 'contact' as const, label: 'WhatsApp', icon: 'MessageCircle', color: '142 70% 45%' },
  { type: 'contact' as const, label: 'Telefone', icon: 'Phone', color: '160 84% 45%' },
  { type: 'contact' as const, label: 'Email', icon: 'Mail', color: '200 84% 55%' },
  { type: 'contact' as const, label: 'Endereço', icon: 'MapPin', color: '0 84% 60%' },
  { type: 'contact' as const, label: 'Salvar Contato', icon: 'Contact', color: '220 70% 50%' },
  // Special
  { type: 'custom' as const, label: 'Wi-Fi', icon: 'Wifi', color: '200 84% 55%' },
  { type: 'custom' as const, label: 'PIX', icon: 'QrCode', color: '168 76% 42%' },
  { type: 'custom' as const, label: 'Agendamento', icon: 'Calendar', color: '270 70% 55%' },
];
