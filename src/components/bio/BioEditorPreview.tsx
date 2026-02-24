import { BioPage, DEFAULT_THEME, BioButton } from "@/types/bioPage";
import { BioPageHeader } from "./BioPageHeader";
import { BioPageGallery } from "./BioPageGallery";
import { BioPageButtons } from "./BioPageButtons";

interface BioEditorPreviewProps {
  bioPage: BioPage;
}

export const BioEditorPreview = ({ bioPage }: BioEditorPreviewProps) => {
  const theme = bioPage.theme || DEFAULT_THEME;
  const activeButtons = (bioPage.buttons || [])
    .filter((b) => b.enabled)
    .sort((a, b) => a.order - b.order);

  const handleButtonClick = (button: BioButton) => {
    // Preview mode - just show what would happen
    console.log('Button clicked:', button);
  };

  return (
    <div 
      className="min-h-full py-8 px-4 relative overflow-hidden"
      style={{ 
        backgroundColor: `hsl(${theme.backgroundColor})`,
        color: `hsl(${theme.textColor})`,
      }}
    >
      <style>{`
        .qr-cut-mark,
        .cut-mark,
        rect.qr-cut-mark,
        rect.cut-mark {
          border-radius: 9999px !important;
        }
        .qr-cut-mark rect,
        .cut-mark rect,
        svg .qr-cut-mark rect,
        svg .cut-mark rect,
        rect.qr-cut-mark,
        rect.cut-mark {
          rx: 999px !important;
          ry: 999px !important;
        }
      `}</style>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ backgroundColor: `hsl(${theme.primaryColor})` }}
      />

      <div className="relative z-10 max-w-sm mx-auto space-y-6">
        <BioPageHeader 
          title={bioPage.title || "Minha Bio"}
          subtitle={bioPage.subtitle}
          photoUrl={bioPage.profile_photo_url}
          theme={theme}
        />

        {theme.showGallery && bioPage.gallery_photos && bioPage.gallery_photos.length > 0 && (
          <BioPageGallery photos={bioPage.gallery_photos} theme={theme} />
        )}

        <BioPageButtons 
          buttons={activeButtons}
          theme={theme}
          onButtonClick={handleButtonClick}
        />

        <p className="text-center text-xs opacity-50 pt-4">
          Powered by TagNaMão
        </p>
      </div>
    </div>
  );
};
