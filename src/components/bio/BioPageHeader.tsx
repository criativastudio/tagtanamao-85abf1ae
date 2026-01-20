import { motion } from "framer-motion";
import { BioTheme } from "@/types/bioPage";

interface BioPageHeaderProps {
  title: string;
  subtitle: string | null;
  photoUrl: string | null;
  theme: BioTheme;
}

export const BioPageHeader = ({ title, subtitle, photoUrl, theme }: BioPageHeaderProps) => {
  return (
    <motion.div 
      className="flex flex-col items-center space-y-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Profile Photo with LED Ring */}
      <div className="relative">
        {theme.ledEnabled && (
          <motion.div 
            className="absolute inset-0 rounded-full"
            style={{ 
              boxShadow: `0 0 30px 8px hsl(${theme.ledColor} / 0.5), 0 0 60px 15px hsl(${theme.ledColor} / 0.3)`,
            }}
            animate={{
              boxShadow: [
                `0 0 30px 8px hsl(${theme.ledColor} / 0.5), 0 0 60px 15px hsl(${theme.ledColor} / 0.3)`,
                `0 0 40px 12px hsl(${theme.ledColor} / 0.6), 0 0 80px 20px hsl(${theme.ledColor} / 0.4)`,
                `0 0 30px 8px hsl(${theme.ledColor} / 0.5), 0 0 60px 15px hsl(${theme.ledColor} / 0.3)`,
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        
        <div 
          className="w-28 h-28 rounded-full overflow-hidden border-2 relative z-10"
          style={{ 
            borderColor: `hsl(${theme.primaryColor})`,
            backgroundColor: `hsl(${theme.cardColor})`,
          }}
        >
          {photoUrl ? (
            <img 
              src={photoUrl} 
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              🐾
            </div>
          )}
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="text-center space-y-1">
        <h1 
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm opacity-70">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
};
