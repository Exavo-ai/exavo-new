import { Users, CheckCircle2, TrendingUp } from 'lucide-react';

const SocialProof = () => {
  return (
    <section className="py-12 bg-gradient-accent">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-2 animate-fade-in">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-hero mb-3">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              1,200+
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
  );
};

export default SocialProof;
