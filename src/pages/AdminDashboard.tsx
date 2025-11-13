import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Settings, BarChart3, LogOut, Globe } from 'lucide-react';

const AdminDashboard = () => {
  const { user, signOut, userRole } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [stats, setStats] = useState({ totalUsers: 0, admins: 0, clients: 0 });
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const fetchStats = async () => {
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: admins } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    const { count: clients } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'client');

    setStats({
      totalUsers: totalUsers || 0,
      admins: admins || 0,
      clients: clients || 0,
    });
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles (role)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    setUsers(data || []);
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
                <Settings className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{t('dashboard.adminPanel')}</h1>
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
        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-card border-border hover:border-primary/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('dashboard.totalUsers')}</p>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="w-12 h-12 text-primary" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border hover:border-primary/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('dashboard.admins')}</p>
                <p className="text-3xl font-bold">{stats.admins}</p>
              </div>
              <Settings className="w-12 h-12 text-accent" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border hover:border-primary/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('dashboard.clients')}</p>
                <p className="text-3xl font-bold">{stats.clients}</p>
              </div>
              <BarChart3 className="w-12 h-12 text-secondary" />
            </div>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-bold mb-4">{t('dashboard.recentUsers')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">{t('contact.name')}</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">{t('contact.email')}</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">{t('dashboard.role')}</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">{t('dashboard.joinedDate')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="p-3">{user.full_name || '-'}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.user_roles?.[0]?.role === 'admin' 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-secondary/20 text-secondary'
                      }`}>
                        {user.user_roles?.[0]?.role || 'client'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
