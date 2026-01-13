"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Receipt, 
  DollarSign, 
  Calendar, 
  Settings, 
  LogOut,
  Search,
  Bell,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useHouse } from "@/contexts/HouseContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: userLoading } = useUser();
  const { house, houses, loading: houseLoading } = useHouse();
  const [loading, setLoading] = useState(true);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Charges", href: "/dashboard/charges", icon: Receipt },
    { name: "Payments", href: "/dashboard/payments", icon: DollarSign },
    { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  useEffect(() => {
    if (userLoading || houseLoading) return; // Wait for contexts to load

    if (!user) {
      router.push("/login");
      setLoading(false);
      return;
    }

    if (houses.length === 0) {
      // No houses - redirect to onboarding
      router.push("/onboarding");
      setLoading(false);
      return;
    }

    setLoading(false);
  }, [user, userLoading, houses, houseLoading, router]);

  const handleLogout = async () => {
    const supabaseClient = createClient();
    await supabaseClient.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 backdrop-blur-2xl bg-card/60 p-6 flex flex-col">
        <div className="mb-8">
          <h2 className="text-lg font-light tracking-tight font-serif mb-1">
            {house?.name || "House"}
          </h2>
        </div>

        <nav className="flex-1 space-y-6">
          {/* Menu Section */}
          <div>
            <p className="text-xs font-normal text-muted-foreground uppercase tracking-wider mb-2 px-3">
              Menu
            </p>
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-normal transition-colors relative",
                      isActive
                        ? "bg-muted/50 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-foreground rounded-r-full" />
                    )}
                    <item.icon className="h-5 w-5 stroke-[1.5]" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* General Section */}
          <div>
            <p className="text-xs font-normal text-muted-foreground uppercase tracking-wider mb-2 px-3">
              General
            </p>
            <div className="space-y-1">
              <Link
                href="/dashboard/help"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-normal transition-colors relative",
                  pathname === "/dashboard/help"
                    ? "bg-muted/50 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {pathname === "/dashboard/help" && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-foreground rounded-r-full" />
                )}
                <HelpCircle className="h-5 w-5 stroke-[1.5]" />
                Help
              </Link>
            </div>
          </div>
        </nav>

        <div className="mt-auto pt-6 space-y-1">
          <div className="h-px bg-gradient-to-r from-transparent via-border/10 to-transparent mb-4" />
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-5 w-5 stroke-[1.5]" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Top Bar */}
        <header className="backdrop-blur-2xl bg-card/40 px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground stroke-[1.5]" />
                <Input
                  type="search"
                  placeholder="Search charges, payments..."
                  className="pl-10 h-9 font-light text-sm bg-muted/10 border-border/10"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Bell className="h-5 w-5 stroke-[1.5]" />
              </Button>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-normal">
                  {(user?.user_metadata?.first_name?.[0] || user?.email?.[0] || "U").toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-xs font-normal">
                    {user?.user_metadata?.first_name || user?.email?.split("@")[0] || "User"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user?.email}
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
