import { Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, CreditCard, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export const Navbar = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: Shield },
    { name: 'Simulate', path: '/simulate-payment', icon: CreditCard },
    { name: 'Admin', path: '/admin', icon: LayoutDashboard },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center p-6 pointer-events-none">
      <div className="flex items-center gap-4 p-2 px-6 pointer-events-auto bg-white/80 backdrop-blur-xl border border-white/20 shadow-soft rounded-full">
        <div className="flex items-center gap-2 mr-4 border-r border-border/50 pr-4">
          <Activity className="w-5 h-5 text-primary" />
          <span className="font-black tracking-tighter text-foreground">txn.Verify</span>
        </div>
        <div className="flex gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  buttonVariants({ 
                    variant: isActive ? "secondary" : "ghost",
                    size: "sm"
                  }),
                  "gap-2"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
