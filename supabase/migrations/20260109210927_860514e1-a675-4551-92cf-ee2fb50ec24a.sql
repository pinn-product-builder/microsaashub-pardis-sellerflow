-- Create pricing_engine_config table for global engine parameters
CREATE TABLE public.pricing_engine_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_markup_mg DECIMAL(5,2) NOT NULL DEFAULT 1.50,
  default_markup_br DECIMAL(5,2) NOT NULL DEFAULT 1.60,
  margin_green_threshold DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  margin_yellow_threshold DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  margin_orange_threshold DECIMAL(5,2) NOT NULL DEFAULT -5.00,
  margin_authorized_threshold DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  minimum_price_margin_target DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default configuration
INSERT INTO public.pricing_engine_config (
  default_markup_mg, default_markup_br,
  margin_green_threshold, margin_yellow_threshold, margin_orange_threshold,
  margin_authorized_threshold, minimum_price_margin_target
) VALUES (1.50, 1.60, 10.00, 0.00, -5.00, 0.00, 1.00);

-- Enable RLS
ALTER TABLE public.pricing_engine_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view engine config" 
ON public.pricing_engine_config FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Admins can manage engine config" 
ON public.pricing_engine_config FOR ALL 
TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_pricing_engine_config_updated_at
BEFORE UPDATE ON public.pricing_engine_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();