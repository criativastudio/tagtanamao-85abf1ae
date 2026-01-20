import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageUploadProps {
  userId: string;
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  type: 'profile' | 'gallery';
  className?: string;
}

export const ImageUpload = ({ 
  userId, 
  currentUrl, 
  onUpload, 
  onRemove,
  type,
  className = ""
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);

    try {
      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${type}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('bio-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('bio-images')
        .getPublicUrl(fileName);

      onUpload(publicUrl);
      toast.success('Imagem enviada com sucesso!');
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Upload error:', error);
      toast.error(err.message || 'Erro ao enviar imagem');
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onRemove?.();
  };

  if (type === 'profile') {
    return (
      <div className={`relative ${className}`}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        <motion.div
          className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-border bg-card cursor-pointer group"
          onClick={() => !uploading && inputRef.current?.click()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {preview ? (
            <>
              <img 
                src={preview} 
                alt="Profile preview" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Upload className="h-6 w-6 text-white" />
                )}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <>
                  <Upload className="h-8 w-8 mb-1" />
                  <span className="text-xs">Upload</span>
                </>
              )}
            </div>
          )}
        </motion.div>

        {preview && onRemove && !uploading && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // Gallery style upload
  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      
      <motion.button
        onClick={() => !uploading && inputRef.current?.click()}
        className="w-full aspect-square rounded-xl border-2 border-dashed border-border bg-card/50 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <>
            <Upload className="h-8 w-8 mb-2" />
            <span className="text-sm">Adicionar foto</span>
          </>
        )}
      </motion.button>
    </div>
  );
};

interface GalleryUploadProps {
  userId: string;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export const GalleryUpload = ({ 
  userId, 
  photos, 
  onPhotosChange,
  maxPhotos = 9
}: GalleryUploadProps) => {
  const handleAddPhoto = (url: string) => {
    if (photos.length < maxPhotos) {
      onPhotosChange([...photos, url]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <AnimatePresence mode="popLayout">
        {photos.map((photo, index) => (
          <motion.div
            key={photo}
            className="relative aspect-square rounded-xl overflow-hidden group"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            layout
          >
            <img 
              src={photo} 
              alt={`Gallery ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleRemovePhoto(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {photos.length < maxPhotos && (
        <ImageUpload
          userId={userId}
          onUpload={handleAddPhoto}
          type="gallery"
        />
      )}
    </div>
  );
};
