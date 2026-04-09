import { HorizonHero } from '@/components/ui/horizon-hero-section';
import { buttonVariants } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, BarChart3, Github } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  return (
    <div className="relative overflow-x-hidden">
      <HorizonHero />
      
      <div className="relative z-10">
        {/* Features Section - Clean White */}
        <section className="bg-white section-padding">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="heading-massive mb-6">
                Secure. <span className="text-primary">Fast.</span> Reliable.
              </h2>
              <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
                Next-generation fraud detection for the modern financial ecosystem.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="group p-8 rounded-2xl bg-muted hover:bg-white hover:shadow-float transition-all duration-500 border border-transparent hover:border-border/50">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Real-time Protection</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our engine analyzes thousands of data points in milliseconds to identify suspicious patterns before they impact your business.
                </p>
              </div>

              <div className="group p-8 rounded-2xl bg-muted hover:bg-white hover:shadow-float transition-all duration-500 border border-transparent hover:border-border/50">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Zap className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">ML-Powered Insights</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Advanced machine learning models adapt to new fraud vectors, providing a dynamic defense against evolving threats.
                </p>
              </div>

              <div className="group p-8 rounded-2xl bg-muted hover:bg-white hover:shadow-float transition-all duration-500 border border-transparent hover:border-border/50">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Comprehensive Analytics</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Deep visibility into transaction health, risk distribution, and automated decision-making processes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - Deep Charcoal */}
        <section className="bg-[#0F172A] section-padding text-white overflow-hidden relative">
          {/* Background Accents */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] -ml-48 -mb-48" />
          
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <h2 className="heading-massive mb-8">
              Ready to <span className="text-primary">Verify?</span>
            </h2>
            <p className="text-white/60 text-xl max-w-2xl mx-auto mb-12">
              Join hundreds of institutions using txn.Verify to secure their digital future.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link 
                to="/simulate-payment" 
                className={cn(buttonVariants({ size: "lg" }), "bg-primary text-secondary hover:bg-primary/90")}
              >
                Try Simulator <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link 
                to="/admin" 
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-white/20 text-white hover:bg-white/5")}
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Footer - Deep Forest Green */}
        <footer className="bg-[#064E3B] py-20 px-6 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-12 border-b border-white/10 pb-12 mb-12">
              <div className="flex flex-col gap-4 items-center md:items-start">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tracking-tighter">txn.Verify</span>
                  <span className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <p className="text-white/60 text-sm max-w-xs text-center md:text-left">
                  Securing the world's transactions with real-time intelligence.
                </p>
              </div>
              
              <div className="flex gap-12 text-sm font-medium">
                <div className="flex flex-col gap-4">
                  <span className="text-primary uppercase tracking-widest text-[10px]">Product</span>
                  <a href="#" className="hover:text-primary transition-colors">Features</a>
                  <a href="#" className="hover:text-primary transition-colors">Simulator</a>
                  <a href="#" className="hover:text-primary transition-colors">Dashboard</a>
                </div>
                <div className="flex flex-col gap-4">
                  <span className="text-primary uppercase tracking-widest text-[10px]">Company</span>
                  <a href="#" className="hover:text-primary transition-colors">About</a>
                  <a href="#" className="hover:text-primary transition-colors">Security</a>
                  <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <a href="https://github.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Github className="w-5 h-5" />
                </a>
                <div className="text-sm font-bold tracking-tight">
                  Team <span className="text-primary">ASYNCHRONOUS</span>
                </div>
              </div>
              <div className="text-white/40 text-xs">
                © 2026 txn.Verify. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
