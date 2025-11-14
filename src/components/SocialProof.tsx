import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Users, CheckCircle2, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: number;
  name: string;
  action: string;
  time: string;
}

const SocialProof = () => {
  const [count, setCount] = useState(1247);
  const [showNotification, setShowNotification] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(0);

  const notifications: Notification[] = [
    { id: 1, name: 'Ahmed M.', action: 'booked AI Consultation', time: '2 minutes ago' },
    { id: 2, name: 'Sara K.', action: 'started AI implementation', time: '5 minutes ago' },
    { id: 3, name: 'Mohammed A.', action: 'completed ML training', time: '8 minutes ago' },
    { id: 4, name: 'Fatima R.', action: 'subscribed to Premium', time: '12 minutes ago' },
  ];

  useEffect(() => {
    // Increment counter animation
    const interval = setInterval(() => {
      setCount(prev => prev + 1);
    }, 5000);

    // Show notifications periodically
    const notificationInterval = setInterval(() => {
      setCurrentNotification(prev => (prev + 1) % notifications.length);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 4000);
    }, 8000);

    return () => {
      clearInterval(interval);
      clearInterval(notificationInterval);
    };
  }, []);

  return (
    <>
      {/* Live Booking Notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            className="fixed bottom-6 left-6 z-50"
          >
            <Card className="p-4 shadow-glow border-primary/20 bg-card/95 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    <span className="text-primary">{notifications[currentNotification].name}</span>
                    {' '}
                    {notifications[currentNotification].action}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {notifications[currentNotification].time}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Section for Homepage */}
      <section className="py-12 bg-gradient-accent">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-2 animate-fade-in">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-hero mb-3">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {count.toLocaleString()}+
              </div>
              <p className="text-muted-foreground">Clients Served</p>
            </div>

            <div className="text-center space-y-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-hero mb-3">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                98%
              </div>
              <p className="text-muted-foreground">Success Rate</p>
            </div>

            <div className="text-center space-y-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-hero mb-3">
                <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                500+
              </div>
              <p className="text-muted-foreground">Projects Completed</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default SocialProof;
