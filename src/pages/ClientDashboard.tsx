import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { User, LogOut, Globe, Camera } from 'lucide-react';
import { toast } from 'sonner';

const ClientDashboard = () => {
  const { user, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success(t('dashboard.profileUpdated'));
      setEditing(false);
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center">
                <User className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{t('dashboard.myDashboard')}</h1>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleLanguage}>
                <Globe className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="w-4 h-4" />
                {t('auth.signOut')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Card */}
          <Card className="p-8 bg-gradient-card border-border">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full bg-gradient-hero flex items-center justify-center relative group">
                  <User className="w-16 h-16 text-primary-foreground" />
                  <button className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                </div>
                <div className="text-center">
                  <h2 className="font-bold text-xl">{profile?.full_name || t('dashboard.unnamed')}</h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t('dashboard.profileInfo')}</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('contact.name')}</label>
                      {editing ? (
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={t('contact.name')}
                        />
                      ) : (
                        <p className="text-muted-foreground">{profile?.full_name || '-'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">{t('contact.email')}</label>
                      <p className="text-muted-foreground">{user?.email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">{t('dashboard.memberSince')}</label>
                      <p className="text-muted-foreground">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  {editing ? (
                    <>
                      <Button onClick={handleUpdateProfile} variant="hero">
                        {t('dashboard.saveChanges')}
                      </Button>
                      <Button onClick={() => setEditing(false)} variant="outline">
                        {t('dashboard.cancel')}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditing(true)} variant="outline">
                      {t('dashboard.editProfile')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Links */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 bg-card border-border hover:border-primary/50 transition-all cursor-pointer">
              <h3 className="font-semibold mb-2">{t('dashboard.myBookings')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.viewManageBookings')}</p>
            </Card>

            <Card className="p-6 bg-card border-border hover:border-primary/50 transition-all cursor-pointer">
              <h3 className="font-semibold mb-2">{t('dashboard.support')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.contactSupport')}</p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;
