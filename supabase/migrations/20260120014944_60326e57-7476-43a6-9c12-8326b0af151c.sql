-- Create bio_pages table for link-in-bio configuration
CREATE TABLE public.bio_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Basic info
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Minha Bio',
  subtitle TEXT,
  profile_photo_url TEXT,
  
  -- Gallery photos (array of URLs)
  gallery_photos JSONB DEFAULT '[]'::jsonb,
  
  -- Links/Buttons configuration
  -- Each button: { id, type, label, url, icon, color, order, enabled }
  buttons JSONB DEFAULT '[]'::jsonb,
  
  -- Theme configuration
  theme JSONB DEFAULT '{
    "backgroundColor": "220 20% 4%",
    "cardColor": "220 20% 7%",
    "primaryColor": "160 84% 45%",
    "textColor": "0 0% 98%",
    "buttonStyle": "glass",
    "ledEnabled": true,
    "ledColor": "160 84% 45%",
    "blurAmount": 12,
    "showGallery": true
  }'::jsonb,
  
  -- Link to pet_tag or business_display (optional)
  pet_tag_id UUID REFERENCES public.pet_tags(id) ON DELETE SET NULL,
  display_id UUID REFERENCES public.business_displays(id) ON DELETE SET NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bio_page_analytics table for tracking views and clicks
CREATE TABLE public.bio_page_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bio_page_id UUID NOT NULL REFERENCES public.bio_pages(id) ON DELETE CASCADE,
  
  -- Event type: 'view' or 'click'
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click')),
  
  -- For clicks, which button was clicked
  button_id TEXT,
  
  -- Visitor info
  user_agent TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  referrer TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster analytics queries
CREATE INDEX idx_bio_page_analytics_page_id ON public.bio_page_analytics(bio_page_id);
CREATE INDEX idx_bio_page_analytics_event_type ON public.bio_page_analytics(event_type);
CREATE INDEX idx_bio_page_analytics_created_at ON public.bio_page_analytics(created_at);
CREATE INDEX idx_bio_pages_slug ON public.bio_pages(slug);
CREATE INDEX idx_bio_pages_user_id ON public.bio_pages(user_id);

-- Enable RLS
ALTER TABLE public.bio_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bio_page_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bio_pages
CREATE POLICY "Anyone can view active bio pages"
ON public.bio_pages
FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can view own bio pages"
ON public.bio_pages
FOR SELECT
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can create own bio pages"
ON public.bio_pages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bio pages"
ON public.bio_pages
FOR UPDATE
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own bio pages"
ON public.bio_pages
FOR DELETE
USING (auth.uid() = user_id OR is_admin());

-- RLS Policies for bio_page_analytics
CREATE POLICY "Anyone can log analytics events"
ON public.bio_page_analytics
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view own bio page analytics"
ON public.bio_page_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bio_pages
    WHERE bio_pages.id = bio_page_analytics.bio_page_id
    AND (bio_pages.user_id = auth.uid() OR is_admin())
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_bio_pages_updated_at
BEFORE UPDATE ON public.bio_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();