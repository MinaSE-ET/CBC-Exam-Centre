import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  FileText, 
  LogOut, 
  Menu, 
  X, 
  LogIn,
  GraduationCap,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  active: boolean;
  onClick: () => void;
}

const SidebarItem = ({ icon, label, active, onClick }: SidebarItemProps) => (
  <div
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
      active ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
    )}
    onClick={onClick}
  >
    <div className="w-5 h-5">{icon}</div>
    <span>{label}</span>
  </div>
);

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Sidebar = ({ open, setOpen }: SidebarProps) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 768) {
      setOpen(false);
    }
  };

  const adminMenuItems = [
    {
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
      path: "/dashboard",
    },
    {
      icon: <FileText size={20} />,
      label: "Question Bank",
      path: "/questions",
    },
    {
      icon: <BookOpen size={20} />,
      label: "Exams",
      path: "/exams",
    },
    {
      icon: <Users size={20} />,
      label: "Users",
      path: "/users",
    },
    {
      icon: <ClipboardList size={20} />,
      label: "All Results",
      path: "/all-results",
    },
  ];

  const studentMenuItems = [
    {
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
      path: "/dashboard",
    },
    {
      icon: <GraduationCap size={20} />,
      label: "My Exams",
      path: "/my-exams",
    },
  ];

  const menuItems = isAdmin() ? adminMenuItems : studentMenuItems;

  return (
    <div 
      className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-sidebar text-sidebar-foreground shadow-lg transform transition-transform duration-200 ease-in-out md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          {/* Logo image */}
          <img
            src="/lovable-uploads/3daf9a81-98d0-4283-8c87-685c2a6abd1f.png"
            alt="CBC Exam Centre logo"
            className="h-10 w-auto"
            title="CBC Exam Centre"
          />
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden" 
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </Button>
      </div>
      
      <div className="p-4">
        {user ? (
          <div className="mb-6 p-3 bg-sidebar-accent rounded-md">
            <p className="font-medium">{user.name}</p>
            <p className="text-sm opacity-70">{user.role}</p>
          </div>
        ) : null}
        
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              active={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            />
          ))}
        </nav>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {user ? (
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2" 
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </Button>
        ) : (
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2" 
            onClick={() => navigate("/login")}
          >
            <LogIn size={18} />
            <span>Login</span>
          </Button>
        )}
      </div>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("main-sidebar");
      const toggle = document.getElementById("sidebar-toggle");
      
      if (
        sidebar && 
        toggle && 
        !sidebar.contains(event.target as Node) && 
        !toggle.contains(event.target as Node) &&
        sidebarOpen &&
        window.innerWidth < 768
      ) {
        setSidebarOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarOpen]);
  
  // Close sidebar on route change on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);
  
  // Don't show sidebar on auth pages
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  
  if (isAuthPage) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div id="main-sidebar">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      </div>
      
      <div 
        className={cn(
          "min-h-screen transition-all duration-200 ease-in-out",
          "md:pl-64"
        )}
      >
        <header className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur">
          <Button 
            id="sidebar-toggle"
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </Button>
          
          <div className="flex-1 md:ml-4">
            <h2 className="text-xl font-semibold">
              {location.pathname === "/dashboard" && "Dashboard"}
              {location.pathname === "/questions" && "Question Bank"}
              {location.pathname === "/exams" && "Exams"}
              {location.pathname === "/users" && "Users"}
              {location.pathname === "/my-exams" && "My Exams"}
              {location.pathname.startsWith("/exam/") && "Exam"}
              {location.pathname.startsWith("/question/") && "Question Details"}
            </h2>
          </div>
        </header>
        
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

// [NOTE] This file is getting long (255+ lines)! For better maintainability, ask me to refactor it into smaller components.
