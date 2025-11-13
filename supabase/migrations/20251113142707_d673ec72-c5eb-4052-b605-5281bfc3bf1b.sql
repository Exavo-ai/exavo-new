-- Create services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EGP',
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create appointments/bookings table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Services RLS Policies (everyone can view active services)
CREATE POLICY "Anyone can view active services"
  ON public.services
  FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage services"
  ON public.services
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Appointments RLS Policies
CREATE POLICY "Users can view their own appointments"
  ON public.appointments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own appointments"
  ON public.appointments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
  ON public.appointments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all appointments"
  ON public.appointments
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all appointments"
  ON public.appointments
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial services
INSERT INTO public.services (name, name_ar, description, description_ar, price, currency) VALUES
('AI Chatbot', 'روبوت محادثة ذكي', 'Intelligent conversational AI for customer support and engagement', 'ذكاء اصطناعي محادثة ذكي لدعم العملاء والتفاعل', 3500.00, 'EGP'),
('Workflow Automation', 'أتمتة سير العمل', 'Automate repetitive tasks and streamline business processes', 'أتمتة المهام المتكررة وتبسيط عمليات العمل', 5000.00, 'EGP'),
('Predictive Analytics', 'التحليلات التنبؤية', 'Data-driven insights for better business decisions', 'رؤى مبنية على البيانات لقرارات عمل أفضل', 6500.00, 'EGP'),
('Marketing Automation', 'أتمتة التسويق', 'AI-powered marketing campaigns and customer engagement', 'حملات تسويقية مدعومة بالذكاء الاصطناعي', 4000.00, 'EGP'),
('Content Generation', 'إنشاء المحتوى', 'AI-assisted content creation for marketing and communications', 'إنشاء محتوى بمساعدة الذكاء الاصطناعي', 3000.00, 'EGP'),
('Data Visualization', 'تصور البيانات', 'Transform complex data into actionable visual insights', 'تحويل البيانات المعقدة إلى رؤى بصرية قابلة للتنفيذ', 4500.00, 'EGP');