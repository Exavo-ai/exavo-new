import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { User, LogOut, Globe, Camera, Calendar, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ClientDashboard = () => {
  const { user, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchAppointments();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
    if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
    }
  };

  const fetchAppointments = async () => {
    const { data } = await supabase.from('appointments').select('*').eq('user_id', user?.id).order('appointment_date', { ascending: false });
    setAppointments(data || []);
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user?.id);
      if (error) throw error;
      toast.success(t('dashboard.profileUpdated'));
      setEditing(false);
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-accent/20 text-accent';
      case 'cancelled': return 'bg-destructive/20 text-destructive';
      case 'completed': return 'bg-primary/20 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
              <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}><Globe className="w-4 h-4" /></Button>
              <Button variant="outline" onClick={signOut}><LogOut className="w-4 h-4" />{t('auth.signOut')}</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="profile">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2 mb-8">
            <TabsTrigger value="profile">{t('dashboard.myProfile')}</TabsTrigger>
            <TabsTrigger value="bookings">{t('dashboard.myBookings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="p-8 bg-gradient-card border-border max-w-2xl">
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
                  <h3 className="text-lg font-semibold mb-4">{t('dashboard.profileInfo')}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('contact.name')}</label>
                      {editing ? <Input value={fullName} onChange={(e) => setFullName(e.target.value)} /> : <p className="text-muted-foreground">{profile?.full_name || '-'}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('contact.email')}</label>
                      <p className="text-muted-foreground">{user?.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('dashboard.memberSince')}</label>
                      <p className="text-muted-foreground">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    {editing ? (<><Button onClick={handleUpdateProfile} variant="hero">{t('dashboard.saveChanges')}</Button><Button onClick={() => setEditing(false)} variant="outline">{t('dashboard.cancel')}</Button></>) : (<Button onClick={() => setEditing(true)} variant="outline">{t('dashboard.editProfile')}</Button>)}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t('dashboard.myBookings')}</h2>
              <Button variant="hero" onClick={() => navigate('/booking')}><Plus className="w-4 h-4" />{t('dashboard.newBooking')}</Button>
            </div>

            {appointments.length === 0 ? (
              <Card className="p-12 text-center bg-card border-border">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">{t('dashboard.noBookings')}</p>
                <Button variant="hero" onClick={() => navigate('/booking')}>{t('dashboard.bookFirstService')}</Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {appointments.map((apt) => (
                  <Card key={apt.id} className="p-6 bg-gradient-card border-border">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{apt.full_name}</h3>
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(apt.status)}`}>{t(`booking.${apt.status}`)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>📅 {apt.appointment_date} at {apt.appointment_time}</p>
                          <p>📧 {apt.email}</p>
                          <p>📞 {apt.phone}</p>
                          {apt.notes && <p>📝 {apt.notes}</p>}
                        </div>
                      </div>
                      {apt.status === 'pending' && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('appointments')
                                .update({ status: 'cancelled' })
                                .eq('id', apt.id);
                              
                              if (error) throw error;
                              toast.success(t('dashboard.bookingCancelled'));
                              fetchAppointments();
                            } catch (error: any) {
                              toast.error(error.message);
                            }
                          }}
                        >
                          {t('dashboard.cancelBooking')}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClientDashboard;
