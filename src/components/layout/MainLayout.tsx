import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppSidebar } from './AppSidebar';
import { PageTransition } from './PageTransition';
import { UserSettingsDropdown } from './UserSettingsDropdown';
import { NotificationsDropdown } from './NotificationsDropdown';
import { Search, Settings, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import isonBanner from '@/assets/ison-banner.jpg';
export function MainLayout() {
  const [sidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Cosmic Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${isonBanner})` }}
      />
      
      {/* Gradient overlay for depth and cosmic feel */}
      <div 
        className="fixed inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, hsla(280, 60%, 25%, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, hsla(250, 60%, 30%, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 100%)
          `
        }}
      />

      {/* Animated glow orbs */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="fixed bottom-20 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="fixed top-1/2 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '4s' }} />
      
      {/* Very subtle noise texture */}
      <div 
        className="fixed inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Sidebar */}
      <AppSidebar />
      
      {/* Main Content */}
      <div className={`relative z-10 transition-all duration-300 ${sidebarCollapsed ? 'ml-[72px]' : 'ml-64'}`}>
        {/* Top Header - Glassmorphism */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-6 glass-header">
          {/* Page Title */}
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          
          {/* Search and Actions */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Button 
                variant="ghost" 
                className="glass-button h-9 px-4 gap-2 text-muted-foreground hover:text-foreground"
              >
                <Search className="h-4 w-4" />
                <span className="text-sm">Search</span>
              </Button>
            </div>
            
            {/* Alerts */}
            <Button variant="ghost" className="glass-button h-9 px-3 gap-2 text-muted-foreground hover:text-foreground">
              <span className="text-sm font-medium text-amber-400">▲</span>
              <span className="text-sm">Aterr</span>
              <ArrowUp className="h-3 w-3" />
            </Button>
            
            {/* Notifications */}
            <NotificationsDropdown />
            
            {/* System Settings (navigates to Settings page) */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="glass-button h-9 w-9"
              onClick={() => navigate('/settings')}
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            {/* User Settings Dropdown */}
            <UserSettingsDropdown />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
