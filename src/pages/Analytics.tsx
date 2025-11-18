import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Calendar, DollarSign, MessageSquare, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Analytics = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    totalUsers: 0,
    totalMessages: 0,
  });
  const [bookingsData, setBookingsData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [servicesData, setServicesData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch overall stats
      const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: totalBookings } = await supabase.from('appointments').select('*', { count: 'exact', head: true });
      const { count: totalMessages } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true });
      
      const { data: payments } = await supabase.from('payments').select('amount, status').eq('status', 'completed');
      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setStats({
        totalRevenue,
        totalBookings: totalBookings || 0,
        totalUsers: totalUsers || 0,
        totalMessages: totalMessages || 0,
      });

      // Fetch bookings over time (last 7 days)
      const { data: appointments } = await supabase
        .from('appointments')
        .select('created_at, status')
        .order('created_at', { ascending: true });

      const bookingsByDate = appointments?.reduce((acc: any, apt) => {
        const date = new Date(apt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const existing = acc.find((d: any) => d.date === date);
        if (existing) {
          existing.bookings += 1;
        } else {
          acc.push({ date, bookings: 1 });
        }
        return acc;
      }, []);
      setBookingsData(bookingsByDate?.slice(-7) || []);

      // Fetch revenue over time
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('created_at, amount, status')
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      const revenueByDate = paymentsData?.reduce((acc: any, payment) => {
        const date = new Date(payment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const existing = acc.find((d: any) => d.date === date);
        if (existing) {
          existing.revenue += Number(payment.amount);
        } else {
          acc.push({ date, revenue: Number(payment.amount) });
        }
        return acc;
      }, []);
      setRevenueData(revenueByDate?.slice(-7) || []);

      // Fetch service popularity (mock data for now - would need to join with services table)
      const { data: serviceBookings } = await supabase
        .from('appointments')
        .select('service_id');
      
      const serviceCounts = serviceBookings?.reduce((acc: any, apt) => {
        const serviceId = apt.service_id || 'Unknown';
        acc[serviceId] = (acc[serviceId] || 0) + 1;
        return acc;
      }, {});

      const servicesArray = Object.entries(serviceCounts || {}).map(([name, value]) => ({
        name: `Service ${name.slice(0, 8)}`,
        value,
      }));
      setServicesData(servicesArray.slice(0, 5));

      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  };

  const COLORS = ['hsl(270 100% 50%)', 'hsl(195 100% 50%)', 'hsl(270 100% 65%)', 'hsl(195 80% 60%)', 'hsl(240 20% 40%)'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold">{t('dashboard.analytics')}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-card border-border animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.totalRevenue')}</p>
                <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.totalBookings')}</p>
                <p className="text-2xl font-bold">{stats.totalBookings}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.totalUsers')}</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary-glow/20 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary-glow" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.chatMessages')}</p>
                <p className="text-2xl font-bold">{stats.totalMessages}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-gradient-card border-border animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">{t('dashboard.bookingsTrend')}</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={bookingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 20% 18%)" />
                <XAxis dataKey="date" stroke="hsl(240 10% 65%)" />
                <YAxis stroke="hsl(240 10% 65%)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(240 25% 10%)', 
                    border: '1px solid hsl(240 20% 18%)',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="bookings" stroke="hsl(270 100% 50%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6 bg-gradient-card border-border animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold">{t('dashboard.revenueTrend')}</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 20% 18%)" />
                <XAxis dataKey="date" stroke="hsl(240 10% 65%)" />
                <YAxis stroke="hsl(240 10% 65%)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(240 25% 10%)', 
                    border: '1px solid hsl(240 20% 18%)',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(195 100% 50%)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Service Popularity */}
        {servicesData.length > 0 && (
          <Card className="p-6 bg-gradient-card border-border animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-secondary" />
              <h2 className="text-lg font-semibold">{t('dashboard.popularServices')}</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={servicesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="hsl(270 100% 50%)"
                  dataKey="value"
                >
                  {servicesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(240 25% 10%)', 
                    border: '1px solid hsl(240 20% 18%)',
                    borderRadius: '8px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Analytics;
