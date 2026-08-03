import { Link, useLocation } from "wouter";
import { Users, Cat, Stethoscope, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/pacientes", label: "Pacientes", icon: Cat },
  ];

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border min-h-[100dvh] flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-2 text-sidebar-primary">
          <Stethoscope className="h-6 w-6" />
          <span className="text-xl font-bold tracking-tight">VetControl</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === "/" 
            ? location === "/" 
            : location.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
        VetControl v1.0.0
      </div>
    </div>
  );
}
