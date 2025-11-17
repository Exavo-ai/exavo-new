import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen overflow-hidden bg-background w-full">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <AdminSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      )}
      
      {/* Mobile Sidebar */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <AdminSidebar collapsed={false} onToggle={() => {}} />
          </SheetContent>
        </Sheet>
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <AdminHeader 
          isMobile={isMobile}
          onMenuToggle={() => setMobileOpen(!mobileOpen)}
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[1600px] mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
