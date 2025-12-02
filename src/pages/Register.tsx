import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import { registerSchema } from '@/lib/validation';
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    const result = registerSchema.safeParse({ fullName, email, password });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/client`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // Send welcome email via Resend
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: { email, full_name: fullName }
        });
      } catch (emailError) {
        console.error('Welcome email error:', emailError);
        // Don't block registration if email fails
      }

      toast.success("Account created successfully! Welcome to Exavo AI.");
      
      // Redirect to client portal since auto-confirm is enabled
      setTimeout(() => {
        navigate('/client');
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || t('auth.registerError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-2xl p-8 border border-border shadow-glow">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
                {t('auth.createAccount')}
              </h1>
              <p className="text-muted-foreground">{t('auth.registerSubtitle')}</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium mb-2">
                  {t('contact.name')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Ahmed"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  {t('contact.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ahmed@exavoai.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <PasswordStrengthMeter 
                  password={password} 
                  userInputs={[email, fullName]}
                />
                <p className="text-xs text-muted-foreground mt-1">{t('auth.passwordHint')}</p>
              </div>

              <Button type="submit" variant="hero" className="w-full shadow-glow" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('auth.creatingAccount')}
                  </>
                ) : (
                  t('auth.signUp')
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('auth.hasAccount')}{' '}
                <a href="/login" className="text-primary hover:underline">
                  {t('auth.signIn')}
                </a>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              ← {t('auth.backHome')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
