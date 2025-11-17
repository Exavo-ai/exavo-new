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
import { Users, Settings, BarChart3, LogOut, Globe, Calendar, CheckCircle, XCircle, TrendingUp, MessageSquare, CreditCard, Package, Sun, Moon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import AdminSettings from '@/components/AdminSettings';
import { useTheme } from '@/hooks/useTheme';

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
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

    // Set up real-time subscription for new bookings
    const appointmentsChannel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          fetchAppointments();
          fetchStats();
          fetchRecentActivity();
        }
      )
      .subscribe();

    // Set up real-time subscription for new payments
    const paymentsChannel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          fetchPayments();
          fetchStats();
          fetchRecentActivity();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(paymentsChannel);
    };
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
    const { data } = await supabase
      .from('profiles')
      .select('*, user_roles(role)')
      .order('created_at', { ascending: false });
    
    // Transform data to include role from user_roles array
    const usersWithRoles = data?.map((user: any) => ({
      ...user,
      role: user.user_roles?.[0]?.role || 'client'
    })) || [];
    
    setUsers(usersWithRoles);
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
        <div className="container mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-hero flex items-center justify-center flex-shrink-0">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold truncate">{t('dashboard.adminPanel')}</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/analytics')}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="hover:scale-105 transition-transform h-8 w-8 sm:h-9 sm:w-9"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={signOut}
                size="sm"
                className="hidden sm:flex h-8 sm:h-9"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden md:inline">{t('auth.signOut')}</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={signOut}
                size="icon"
                className="sm:hidden h-8 w-8"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 gap-1 sm:gap-2 p-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                {t('dashboard.overview')}
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">{t('dashboard.users')}</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">Services</span>
              </TabsTrigger>
              <TabsTrigger value="bookings" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">{t('dashboard.bookings')}</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger>
              <TabsTrigger value="chats" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">Chats</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <Card className="p-4 sm:p-6 bg-gradient-card border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t('dashboard.totalUsers')}</p>
                    <p className="text-2xl sm:text-3xl font-bold">{stats.totalUsers}</p>
                  </div>
                  <Users className="w-8 h-8 sm:w-12 sm:h-12 text-primary flex-shrink-0" />
                </div>
              </Card>
              <Card className="p-4 sm:p-6 bg-gradient-card border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t('dashboard.admins')}</p>
                    <p className="text-2xl sm:text-3xl font-bold">{stats.admins}</p>
                  </div>
                  <Settings className="w-8 h-8 sm:w-12 sm:h-12 text-accent flex-shrink-0" />
                </div>
              </Card>
              <Card className="p-4 sm:p-6 bg-gradient-card border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t('dashboard.clients')}</p>
                    <p className="text-2xl sm:text-3xl font-bold">{stats.clients}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 sm:w-12 sm:h-12 text-secondary flex-shrink-0" />
                </div>
              </Card>
              <Card className="p-4 sm:p-6 bg-gradient-card border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t('dashboard.totalBookings')}</p>
                    <p className="text-2xl sm:text-3xl font-bold">{stats.totalBookings}</p>
                  </div>
                  <Calendar className="w-8 h-8 sm:w-12 sm:h-12 text-primary-glow flex-shrink-0" />
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">Services Management</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage your AI services and offerings</CardDescription>
                </div>
                <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="w-full sm:w-auto">
                      <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                      Create Service
                    </Button>
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
              <CardContent className="p-3 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                  {services.map((service) => (
                    <Card key={service.id} className="border-border">
                      <CardHeader className="p-3 sm:p-6">
                        <CardTitle className="text-sm sm:text-base lg:text-lg">{service.name}</CardTitle>
                        <CardDescription className="line-clamp-2 text-xs sm:text-sm">{service.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 p-3 sm:p-6 pt-0 sm:pt-0">
                        <div className="flex justify-between items-center">
                          <span className="text-base sm:text-lg lg:text-xl font-bold text-primary">{service.price} {service.currency}</span>
                          <Badge variant={service.active ? 'default' : 'secondary'} className="text-xs">
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
          <TabsContent value="payments" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Payment Transactions</CardTitle>
                <CardDescription className="text-xs sm:text-sm">View all payment transactions and Stripe data</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                {payments.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <CreditCard className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                    <p className="text-xs sm:text-sm">No payment transactions yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <div className="min-w-[600px] sm:min-w-full">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">User</th>
                            <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">Amount</th>
                            <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">Status</th>
                            <th className="text-left p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">Payment Method</th>
                            <th className="text-left p-2 sm:p-3 text-xs sm:text-sm hidden lg:table-cell">Session ID</th>
                            <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((payment: any) => (
                            <tr key={payment.id} className="border-b border-border/50 hover:bg-muted/50">
                              <td className="p-2 sm:p-3">
                                <div>
                                  <p className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{payment.profiles?.full_name || 'Unknown'}</p>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">{payment.profiles?.email}</p>
                                </div>
                              </td>
                              <td className="p-2 sm:p-3">
                                <p className="font-semibold text-primary text-xs sm:text-sm whitespace-nowrap">{payment.amount} {payment.currency}</p>
                              </td>
                              <td className="p-2 sm:p-3">
                                <Badge className={
                                  payment.status === 'completed' ? 'bg-accent/20 text-accent' : 
                                  payment.status === 'pending' ? 'bg-muted' :
                                  'bg-destructive/20 text-destructive'
                                }>
                                  {payment.status}
                                </Badge>
                              </td>
                              <td className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">{payment.payment_method || '-'}</td>
                              <td className="p-2 sm:p-3 hidden lg:table-cell">
                                <code className="text-[10px] sm:text-xs bg-muted px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">{payment.stripe_session_id || '-'}</code>
                              </td>
                              <td className="p-2 sm:p-3 text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(payment.created_at).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="p-3 sm:p-6 bg-card border-border">
              <h2 className="text-base sm:text-xl font-bold mb-3 sm:mb-4">{t('dashboard.recentUsers')}</h2>
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="min-w-[600px] sm:min-w-full">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">{t('contact.name')}</th>
                        <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">{t('contact.email')}</th>
                        <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">{t('dashboard.role')}</th>
                        <th className="text-left p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">{t('dashboard.joinedDate')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="p-2 sm:p-3 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{u.full_name || '-'}</td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">{u.email}</td>
                          <td className="p-2 sm:p-3">
                            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs whitespace-nowrap ${u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground hidden md:table-cell">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="p-3 sm:p-6 bg-card border-border">
              <h2 className="text-base sm:text-xl font-bold mb-3 sm:mb-4">{t('dashboard.allBookings')}</h2>
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="min-w-[700px] sm:min-w-full">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">{t('contact.name')}</th>
                        <th className="text-left p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">{t('contact.email')}</th>
                        <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">{t('booking.date')}</th>
                        <th className="text-left p-2 sm:p-3 text-xs sm:text-sm hidden lg:table-cell">{t('booking.time')}</th>
                        <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">{t('booking.status')}</th>
                        <th className="text-left p-2 sm:p-3 text-xs sm:text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((apt) => (
                        <tr key={apt.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="p-2 sm:p-3 text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{apt.full_name}</td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell truncate max-w-[150px]">{apt.email}</td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm whitespace-nowrap">{new Date(apt.appointment_date).toLocaleDateString()}</td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden lg:table-cell">{apt.appointment_time}</td>
                          <td className="p-2 sm:p-3">
                            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs whitespace-nowrap ${getStatusColor(apt.status)}`}>
                              {t(`booking.${apt.status}`)}
                            </span>
                          </td>
                          <td className="p-2 sm:p-3">
                            <div className="flex gap-1 sm:gap-2">
                              {apt.status === 'pending' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}
                                    className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                  >
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                                    className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                  >
                                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="chats">
            <Card className="p-3 sm:p-6 bg-card border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                <div>
                  <h2 className="text-base sm:text-xl font-bold">AI Chat Sessions</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Monitor user conversations with the AI chatbot</p>
                </div>
                <Badge className="text-xs">{chatSessions.length} Sessions</Badge>
              </div>
              <div className="space-y-2 sm:space-y-4">
                {chatSessions.map((session) => (
                  <Card key={session.session_id} className="border-border">
                    <CardContent className="p-3 sm:pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                            <span className="font-mono text-[10px] sm:text-xs text-muted-foreground truncate">{session.session_id}</span>
                          </div>
                          <p className="text-xs sm:text-sm mb-2 line-clamp-2">{session.last_message}</p>
                          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                            <span>{session.message_count} messages</span>
                            <span className="hidden sm:inline">{new Date(session.created_at).toLocaleString()}</span>
                            <span className="sm:hidden">{new Date(session.created_at).toLocaleDateString()}</span>
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
            <Card className="p-3 sm:p-6 bg-card border-border">
              <h2 className="text-base sm:text-xl font-bold mb-3 sm:mb-4">Recent Activity Feed</h2>
              <div className="space-y-2 sm:space-y-4">
                {recentActivity.map((activity: any, index) => (
                  <Card key={index} className="border-border">
                    <CardContent className="p-3 sm:pt-6">
                      <div className="flex items-start sm:items-center gap-2 sm:gap-4">
                        {activity.type === 'booking' ? (
                          <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
                        ) : (
                          <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-accent flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs sm:text-sm">
                            {activity.type === 'booking' ? 'New Booking' : 'Payment Received'}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {activity.profiles?.full_name || 'Unknown'} - {activity.profiles?.email}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                        {activity.type === 'payment' && (
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-primary text-xs sm:text-base whitespace-nowrap">
                              {activity.amount} {activity.currency}
                            </p>
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
            <div className="max-w-4xl">
              <AdminSettings />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
