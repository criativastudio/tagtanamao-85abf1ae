import { motion } from "framer-motion";
import { 
  Instagram, Music2, Youtube, Facebook, Twitter, Linkedin,
  MessageCircle, Phone, Mail, MapPin, Globe, Link,
  Wifi, QrCode, Star, Calendar, Contact,
  LucideIcon
} from "lucide-react";
import { BioTheme, BioButton } from "@/types/bioPage";

interface BioPageButtonsProps {
  buttons: BioButton[];
  theme: BioTheme;
  onButtonClick: (button: BioButton) => void;
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
  Wifi,
  QrCode,
  Star,
  Calendar,
  Contact,
};

const getIcon = (iconName: string): LucideIcon => {
  return iconMap[iconName] || Link;
};

export const BioPageButtons = ({ buttons, theme, onButtonClick }: BioPageButtonsProps) => {
  const getButtonStyles = (button: BioButton) => {
    const baseStyles = {
      backgroundColor: 'transparent',
      borderColor: `hsl(${button.color})`,
      color: `hsl(${theme.textColor})`,
    };

    switch (theme.buttonStyle) {
      case 'solid':
        return {
          ...baseStyles,
          backgroundColor: `hsl(${button.color})`,
          color: 'hsl(220 20% 4%)',
        };
      case 'gradient':
        return {
          ...baseStyles,
          background: `linear-gradient(135deg, hsl(${button.color}), hsl(${button.color} / 0.7))`,
          color: 'hsl(220 20% 4%)',
          borderColor: 'transparent',
        };
      case 'outline':
        return {
          ...baseStyles,
          border: `2px solid hsl(${button.color})`,
        };
      case 'glass':
      default:
        return {
          ...baseStyles,
          backgroundColor: `hsl(${theme.cardColor} / 0.5)`,
          backdropFilter: `blur(${theme.blurAmount}px)`,
          border: `1px solid hsl(${button.color} / 0.3)`,
        };
    }
  };

  return (
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      {buttons.map((button, index) => {
        const Icon = getIcon(button.icon);
        const styles = getButtonStyles(button);

        return (
          <motion.button
            key={button.id}
            onClick={() => onButtonClick(button)}
            className="w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-medium relative overflow-hidden group transition-all duration-300"
            style={styles}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* LED Glow Effect */}
            {theme.ledEnabled && (
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                style={{ 
                  boxShadow: `0 0 25px hsl(${button.color} / 0.5), inset 0 0 15px hsl(${button.color} / 0.2)`,
                }}
              />
            )}

            {/* Shimmer Effect */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: `linear-gradient(90deg, transparent, hsl(${button.color} / 0.2), transparent)`,
                transform: 'translateX(-100%)',
                animation: 'shimmer 1.5s infinite',
              }}
            />

            <Icon className="w-5 h-5 relative z-10" />
            <span className="relative z-10">{button.label}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
};
