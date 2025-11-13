import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Settings, BarChart3, LogOut, Globe, Calendar, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalUsers: 0, admins: 0, clients: 0, totalBookings: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchAppointments();
    fetchChatSessions();
    fetchRecentActivity();
  }, []);

  const fetchStats = async () => {
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: admins } = await supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
    const { count: clients } = await supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'client');
    const { count: totalBookings } = await supabase.from('appointments').select('*', { count: 'exact', head: true });

    setStats({ totalUsers: totalUsers || 0, admins: admins || 0, clients: clients || 0, totalBookings: totalBookings || 0 });
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select(`*, user_roles (role)`).order('created_at', { ascending: false }).limit(10);
    setUsers(data || []);
  };

  const fetchAppointments = async () => {
    const { data } = await supabase.from('appointments').select('*').order('created_at', { ascending: false });
    setAppointments(data || []);
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success('Status updated');
      fetchAppointments();
      fetchStats();
    }
  };

  const fetchChatSessions = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('session_id, user_id, created_at, content, role')
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Group by session_id
    const sessions = data?.reduce((acc: any[], msg) => {
      const existing = acc.find(s => s.session_id === msg.session_id);
      if (!existing) {
        acc.push({
          session_id: msg.session_id,
          user_id: msg.user_id,
          last_message: msg.content,
          created_at: msg.created_at,
          message_count: 1
        });
      } else {
        existing.message_count += 1;
      }
      return acc;
    }, []);
    
    setChatSessions(sessions || []);
  };

  const fetchRecentActivity = async () => {
    const { data: recentBookings } = await supabase
      .from('appointments')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentPayments } = await supabase
      .from('payments')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(5);

    const combined = [
      ...(recentBookings?.map(b => ({ type: 'booking', ...b })) || []),
      ...(recentPayments?.map(p => ({ type: 'payment', ...p })) || [])
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

    setRecentActivity(combined);
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
                <Settings className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{t('dashboard.adminPanel')}</h1>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate('/analytics')}><TrendingUp className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}><Globe className="w-4 h-4" /></Button>
              <Button variant="outline" onClick={signOut}><LogOut className="w-4 h-4" />{t('auth.signOut')}</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-5 mb-8">
            <TabsTrigger value="overview">{t('dashboard.overview')}</TabsTrigger>
            <TabsTrigger value="users">{t('dashboard.users')}</TabsTrigger>
            <TabsTrigger value="bookings">{t('dashboard.bookings')}</TabsTrigger>
            <TabsTrigger value="chats">{t('dashboard.chatHistory')}</TabsTrigger>
            <TabsTrigger value="activity">{t('dashboard.recentActivity')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="p-6 bg-gradient-card border-border"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground mb-1">{t('dashboard.totalUsers')}</p><p className="text-3xl font-bold">{stats.totalUsers}</p></div><Users className="w-12 h-12 text-primary" /></div></Card>
              <Card className="p-6 bg-gradient-card border-border"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground mb-1">{t('dashboard.admins')}</p><p className="text-3xl font-bold">{stats.admins}</p></div><Settings className="w-12 h-12 text-accent" /></div></Card>
              <Card className="p-6 bg-gradient-card border-border"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground mb-1">{t('dashboard.clients')}</p><p className="text-3xl font-bold">{stats.clients}</p></div><BarChart3 className="w-12 h-12 text-secondary" /></div></Card>
              <Card className="p-6 bg-gradient-card border-border"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground mb-1">{t('dashboard.totalBookings')}</p><p className="text-3xl font-bold">{stats.totalBookings}</p></div><Calendar className="w-12 h-12 text-primary-glow" /></div></Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-bold mb-4">{t('dashboard.recentUsers')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border"><th className="text-left p-3 text-sm">{t('contact.name')}</th><th className="text-left p-3 text-sm">{t('contact.email')}</th><th className="text-left p-3 text-sm">{t('dashboard.role')}</th><th className="text-left p-3 text-sm">{t('dashboard.joinedDate')}</th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="p-3">{u.full_name || '-'}</td>
                        <td className="p-3">{u.email}</td>
                        <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${u.user_roles?.[0]?.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>{u.user_roles?.[0]?.role || 'client'}</span></td>
                        <td className="p-3 text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-bold mb-4">{t('dashboard.allBookings')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border"><th className="text-left p-3 text-sm">{t('contact.name')}</th><th className="text-left p-3 text-sm">{t('contact.email')}</th><th className="text-left p-3 text-sm">{t('booking.date')}</th><th className="text-left p-3 text-sm">{t('booking.time')}</th><th className="text-left p-3 text-sm">{t('booking.status')}</th><th className="text-left p-3 text-sm">Actions</th></tr></thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="p-3">{apt.full_name}</td>
                        <td className="p-3">{apt.email}</td>
                        <td className="p-3 text-sm">{new Date(apt.appointment_date).toLocaleDateString()}</td>
                        <td className="p-3 text-sm">{apt.appointment_time}</td>
                        <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${getStatusColor(apt.status)}`}>{t(`booking.${apt.status}`)}</span></td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {apt.status === 'pending' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}><CheckCircle className="w-4 h-4" /></Button>
                                <Button size="sm" variant="outline" onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}><XCircle className="w-4 h-4" /></Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="chats">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-bold mb-4">{t('dashboard.chatHistory')}</h2>
              <div className="space-y-4">
                {chatSessions.map((session) => (
                  <Card key={session.session_id} className="p-4 bg-gradient-card border-border hover:border-primary/50 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground">Session: {session.session_id.slice(0, 8)}...</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{session.message_count} messages</span>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">{session.last_message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(session.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
                {chatSessions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    {t('dashboard.noChats')}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-bold mb-4">{t('dashboard.recentActivity')}</h2>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-gradient-card border border-border rounded-lg hover:border-primary/50 transition-all">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activity.type === 'booking' ? 'bg-accent/20' : 'bg-primary/20'}`}>
                      {activity.type === 'booking' ? <Calendar className="w-5 h-5 text-accent" /> : <BarChart3 className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {activity.type === 'booking' ? t('dashboard.newBooking') : t('dashboard.newPayment')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.profiles?.full_name || activity.profiles?.email || 'Unknown user'}
                      </p>
                      {activity.type === 'payment' && (
                        <p className="text-sm text-primary font-medium mt-1">
                          {activity.amount} {activity.currency}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    {t('dashboard.noActivity')}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
