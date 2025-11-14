import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Users, Settings, BarChart3, LogOut, Globe, Calendar, CheckCircle, XCircle, TrendingUp, MessageSquare, CreditCard, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import AdminSettings from '@/components/AdminSettings';

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalUsers: 0, admins: 0, clients: 0, totalBookings: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [newService, setNewService] = useState({ name: '', name_ar: '', description: '', description_ar: '', price: '', currency: 'EGP' });

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchAppointments();
    fetchChatSessions();
    fetchRecentActivity();
    fetchServices();
    fetchPayments();
  }, []);

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*').order('created_at', { ascending: false });
    setServices(data || []);
  };

  const fetchPayments = async () => {
    const { data } = await supabase.from('payments').select('*, profiles(full_name, email)').order('created_at', { ascending: false }).limit(20);
    setPayments(data || []);
  };

  const handleCreateService = async () => {
    try {
      const { error } = await supabase.from('services').insert({
        name: newService.name,
        name_ar: newService.name_ar,
        description: newService.description,
        description_ar: newService.description_ar,
        price: parseFloat(newService.price),
        currency: newService.currency,
        active: true
      });
      if (error) throw error;
      toast.success('Service created successfully');
      setServiceDialogOpen(false);
      setNewService({ name: '', name_ar: '', description: '', description_ar: '', price: '', currency: 'EGP' });
      fetchServices();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

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
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-8 gap-2">
            <TabsTrigger value="overview">{t('dashboard.overview')}</TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-1" />{t('dashboard.users')}</TabsTrigger>
            <TabsTrigger value="services"><Package className="w-4 h-4 mr-1" />Services</TabsTrigger>
            <TabsTrigger value="bookings"><Calendar className="w-4 h-4 mr-1" />{t('dashboard.bookings')}</TabsTrigger>
            <TabsTrigger value="payments"><CreditCard className="w-4 h-4 mr-1" />Payments</TabsTrigger>
            <TabsTrigger value="chats"><MessageSquare className="w-4 h-4 mr-1" />Chats</TabsTrigger>
            <TabsTrigger value="activity"><TrendingUp className="w-4 h-4 mr-1" />Activity</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" />Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="p-6 bg-gradient-card border-border"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground mb-1">{t('dashboard.totalUsers')}</p><p className="text-3xl font-bold">{stats.totalUsers}</p></div><Users className="w-12 h-12 text-primary" /></div></Card>
              <Card className="p-6 bg-gradient-card border-border"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground mb-1">{t('dashboard.admins')}</p><p className="text-3xl font-bold">{stats.admins}</p></div><Settings className="w-12 h-12 text-accent" /></div></Card>
              <Card className="p-6 bg-gradient-card border-border"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground mb-1">{t('dashboard.clients')}</p><p className="text-3xl font-bold">{stats.clients}</p></div><BarChart3 className="w-12 h-12 text-secondary" /></div></Card>
              <Card className="p-6 bg-gradient-card border-border"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground mb-1">{t('dashboard.totalBookings')}</p><p className="text-3xl font-bold">{stats.totalBookings}</p></div><Calendar className="w-12 h-12 text-primary-glow" /></div></Card>
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Services Management</CardTitle>
                  <CardDescription>Manage your AI services and offerings</CardDescription>
                </div>
                <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button><Package className="w-4 h-4 mr-2" />Create Service</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Service</DialogTitle>
                      <DialogDescription>Add a new service to your offerings</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Service Name (EN)</Label>
                          <Input value={newService.name} onChange={(e) => setNewService({...newService, name: e.target.value})} />
                        </div>
                        <div>
                          <Label>Service Name (AR)</Label>
                          <Input value={newService.name_ar} onChange={(e) => setNewService({...newService, name_ar: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <Label>Description (EN)</Label>
                        <Textarea value={newService.description} onChange={(e) => setNewService({...newService, description: e.target.value})} />
                      </div>
                      <div>
                        <Label>Description (AR)</Label>
                        <Textarea value={newService.description_ar} onChange={(e) => setNewService({...newService, description_ar: e.target.value})} />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Price</Label>
                          <Input type="number" value={newService.price} onChange={(e) => setNewService({...newService, price: e.target.value})} />
                        </div>
                        <div>
                          <Label>Currency</Label>
                          <Input value={newService.currency} onChange={(e) => setNewService({...newService, currency: e.target.value})} />
                        </div>
                      </div>
                      <Button onClick={handleCreateService} className="w-full">Create Service</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service) => (
                    <Card key={service.id} className="border-border">
                      <CardHeader>
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        <CardDescription className="line-clamp-2">{service.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-bold text-primary">{service.price} {service.currency}</span>
                          <Badge variant={service.active ? 'default' : 'secondary'}>
                            {service.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Transactions</CardTitle>
                <CardDescription>View all payment transactions and Stripe data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payments.map((payment: any) => (
                    <Card key={payment.id} className="border-border">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{payment.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{payment.profiles?.email}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(payment.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">{payment.amount} {payment.currency}</p>
                            <Badge className={payment.status === 'completed' ? 'bg-accent/20 text-accent' : 'bg-muted'}>
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">AI Chat Sessions</h2>
                  <p className="text-sm text-muted-foreground">Monitor user conversations with the AI chatbot</p>
                </div>
                <Badge>{chatSessions.length} Sessions</Badge>
              </div>
              <div className="space-y-4">
                {chatSessions.map((session) => (
                  <Card key={session.session_id} className="border-border">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-primary" />
                            <span className="font-mono text-sm text-muted-foreground">{session.session_id}</span>
                          </div>
                          <p className="text-sm mb-2 line-clamp-2">{session.last_message}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{session.message_count} messages</span>
                            <span>{new Date(session.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-bold mb-4">Recent Activity Feed</h2>
              <div className="space-y-4">
                {recentActivity.map((activity: any, index) => (
                  <Card key={index} className="border-border">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        {activity.type === 'booking' ? (
                          <Calendar className="w-8 h-8 text-primary" />
                        ) : (
                          <CreditCard className="w-8 h-8 text-accent" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold">
                            {activity.type === 'booking' ? 'New Booking' : 'Payment Received'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activity.profiles?.full_name || 'Unknown'} - {activity.profiles?.email}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                        {activity.type === 'payment' && (
                          <div className="text-right">
                            <p className="font-bold text-primary">{activity.amount} {activity.currency}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
