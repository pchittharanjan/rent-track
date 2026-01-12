"use client";

import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { useHouse } from "@/contexts/HouseContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus,
  TrendingUp,
  TrendingDown,
  Home,
  Zap,
  Droplet,
  Trash2,
  Wifi,
  ArrowRight,
  Tag,
  Edit,
  DollarSign,
  Calendar,
  Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AddChargeModal } from "@/components/dashboard/AddChargeModal";
import { RecordPaymentModal } from "@/components/dashboard/RecordPaymentModal";
import { AddCategoryModal } from "@/components/dashboard/AddCategoryModal";
import { EditCategoryModal } from "@/components/dashboard/EditCategoryModal";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { house, houses, houseMembers, setSelectedHouse, loading: houseLoading } = useHouse();
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false); // Track if initial data load has completed
  const [charges, setCharges] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [balanceData, setBalanceData] = useState<{ 
    totalOwed: number; 
    totalOwedTo: number; 
    netBalance: number;
    balances: Array<{ userId: string; name: string; amount: number; isOwedTo: boolean }>
  }>({ 
    totalOwed: 0, 
    totalOwedTo: 0, 
    netBalance: 0,
    balances: []
  });
  
  // Modal states
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any>(null);

  // Wait for contexts to load, then check if we have houses
  useEffect(() => {
    // Wait for both contexts to finish loading
    if (userLoading || houseLoading) return;

    if (!user) {
      router.push("/login");
      setDataLoaded(true);
      setLoading(false);
      return;
    }

    if (houses.length === 0) {
      router.push("/onboarding");
      setDataLoaded(true);
      setLoading(false);
      return;
    }

    // If we have houses but no selected house, select the first one
    if (houses.length > 0 && !house) {
      setSelectedHouse(houses[0].id);
    }

    // Mark as loaded and stop loading
    setDataLoaded(true);
    setLoading(false);
  }, [user, userLoading, houses, house, houseLoading, router, setSelectedHouse]);

  useEffect(() => {
      async function loadHouseData() {
      if (!house || !user) return;

      const supabaseClient = createClient();
      try {
        // Load charges
        const { data: chargesData, error: chargesError } = await supabaseClient
          .from("charges")
          .select(`
            *,
            category:categories(*),
            charge_shares(*)
          `)
          .eq("house_id", house.id)
          .order("due_date", { ascending: true });

        if (chargesError) {
          console.error("Error loading charges:", chargesError);
          setCharges([]);
        } else {
          setCharges(chargesData || []);
        }

        // Load payments with category info
        const { data: paymentsData, error: paymentsError } = await supabaseClient
          .from("payments")
          .select(`
            *,
            category:categories(*)
          `)
          .eq("house_id", house.id)
          .order("date", { ascending: false });

        if (paymentsError) {
          console.error("Error loading payments:", paymentsError);
          setPayments([]);
        } else {
          setPayments(paymentsData || []);
        }

        // House members are already available from context, no need to fetch

        // Load categories
        const { data: categoriesData, error: categoriesError } = await supabaseClient
          .from("categories")
          .select("*")
          .eq("house_id", house.id)
          .order("name");

        if (categoriesError) {
          console.error("Error loading categories:", categoriesError);
          setCategories([]);
        } else {
          setCategories(categoriesData || []);
        }

        // Calculate balance for current user (only if we have data)
        const safeChargesData = chargesError ? [] : (chargesData || []);
        const safePaymentsData = paymentsError ? [] : (paymentsData || []);

        const userShares = safeChargesData
          .flatMap((charge: any) => charge.charge_shares || [])
          .filter((share: any) => share.user_id === user?.id);

        const totalOwed = userShares.reduce((sum: number, share: any) => sum + parseFloat(share.amount || 0), 0);
        
        // Calculate what's owed to user (payments where user is recipient)
        const paymentsToUser = safePaymentsData.filter((p: any) => p.recipient_id === user?.id);
        const totalOwedTo = paymentsToUser.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);

        // Calculate what user has paid (payments where user is payer)
        const paymentsFromUser = safePaymentsData.filter((p: any) => p.payer_id === user?.id);
        const totalPaid = paymentsFromUser.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);

        // Net balance (what user owes minus what's owed to them, minus what they've already paid)
        const netBalance = (totalOwed || 0) - (totalPaid || 0) - (totalOwedTo || 0);

        // Calculate balances with other members
        const balances: Array<{ userId: string; name: string; amount: number; isOwedTo: boolean }> = [];

        setBalanceData({ 
          totalOwed: totalOwed || 0, 
          totalOwedTo: totalOwedTo || 0, 
          netBalance: netBalance || 0,
          balances: balances.filter(b => b.amount !== 0)
        });
      } catch (error) {
        console.error("Error loading house data:", error);
        // Set safe defaults on error
        setCharges([]);
        setPayments([]);
        setCategories([]);
        setBalanceData({ 
          totalOwed: 0, 
          totalOwedTo: 0, 
          netBalance: 0,
          balances: []
        });
      }
    }

    loadHouseData();
  }, [house, user]);

  // Function to refresh house data (called after modal success)
  const refreshHouseData = async () => {
    if (!house || !user) return;
    
    const supabaseClient = createClient();
    try {
      // Load charges
      const { data: chargesData, error: chargesError } = await supabaseClient
        .from("charges")
        .select(`
          *,
          category:categories(*),
          charge_shares(*)
        `)
        .eq("house_id", house.id)
        .order("due_date", { ascending: true });

      if (!chargesError) setCharges(chargesData || []);

      // Load payments
      const { data: paymentsData, error: paymentsError } = await supabaseClient
        .from("payments")
        .select(`
          *,
          category:categories(*)
        `)
        .eq("house_id", house.id)
        .order("date", { ascending: false });

      if (!paymentsError) setPayments(paymentsData || []);

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabaseClient
        .from("categories")
        .select("*")
        .eq("house_id", house.id)
        .order("name");

      if (!categoriesError) setCategories(categoriesData || []);

      // Recalculate balances
      const safeChargesData = chargesError ? [] : (chargesData || []);
      const safePaymentsData = paymentsError ? [] : (paymentsData || []);

      const userShares = safeChargesData
        .flatMap((charge: any) => charge.charge_shares || [])
        .filter((share: any) => share.user_id === user?.id);

      const totalOwed = userShares.reduce((sum: number, share: any) => sum + parseFloat(share.amount || 0), 0);
      const paymentsToUser = safePaymentsData.filter((p: any) => p.recipient_id === user?.id);
      const totalOwedTo = paymentsToUser.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
      const paymentsFromUser = safePaymentsData.filter((p: any) => p.payer_id === user?.id);
      const totalPaid = paymentsFromUser.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
      const netBalance = (totalOwed || 0) - (totalPaid || 0) - (totalOwedTo || 0);

      setBalanceData({ 
        totalOwed: totalOwed || 0, 
        totalOwedTo: totalOwedTo || 0, 
        netBalance: netBalance || 0,
        balances: []
      });
    } catch (error) {
      console.error("Error refreshing house data:", error);
    }
  };

  const handleLogout = async () => {
    const supabaseClient = createClient();
    await supabaseClient.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // Show loading state - wait for contexts and initial data to load
  if (loading || !dataLoaded || userLoading || houseLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // No houses - redirect to onboarding (only after data has loaded)
  if (dataLoaded && houses.length === 0) {
    // Redirect will be handled by the useEffect above
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to onboarding...</p>
        </div>
      </div>
    );
  }

  // Multiple houses - show selector
  if (houses.length > 1 && !house) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold font-serif">Select a House</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {houses.map((h) => (
              <Card
                key={h.id}
                className="cursor-pointer hover:border-foreground/30 transition-colors frosted-glass bg-card/40"
                onClick={() => setSelectedHouse(h.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg font-normal">{h.name}</CardTitle>
                  {h.address && (
                    <CardDescription className="text-sm">{h.address}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))}
            <Card 
              className="border-dashed cursor-pointer hover:border-foreground/30 transition-colors frosted-glass bg-card/40"
              onClick={() => router.push("/onboarding")}
            >
              <CardHeader>
                <CardTitle className="text-lg font-normal">Create New House</CardTitle>
                <CardDescription className="text-sm">Start tracking a new house</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Single house or selected house - show dashboard
  if (!house) return null;
  const upcomingCharges = charges
    .filter((c: any) => new Date(c.due_date) >= new Date())
    .slice(0, 5);
  const recentPayments = payments.slice(0, 5);

  // Get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user?.user_metadata?.first_name || user?.user_metadata?.name?.split(" ")[0] || "there";
    
    if (hour >= 5 && hour < 12) {
      return `Good Morning, ${firstName}`;
    } else if (hour >= 12 && hour < 17) {
      return `Good Afternoon, ${firstName}`;
    } else if (hour >= 17 && hour < 21) {
      return `Good Evening, ${firstName}`;
    } else {
      return `Good Night, ${firstName}`;
    }
  };

  return (
    <>
        {/* Dashboard Header */}
        <div className="px-8 py-6 bg-card/30">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-light tracking-tight font-serif">{getTimeBasedGreeting()}</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Track, split and manage your rent and utilities with ease.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setAddChargeOpen(true)}
                className="gap-2 font-normal h-9"
              >
                <Plus className="h-4 w-4 stroke-[1.5]" />
                Add Charge
              </Button>
              <Button 
                onClick={() => setRecordPaymentOpen(true)}
                variant="outline" 
                className="gap-2 font-normal h-9"
              >
                <Plus className="h-4 w-4 stroke-[1.5]" />
                Record Payment
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="frosted-glass bg-muted/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-normal text-muted-foreground">
                    Total Owed
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-destructive stroke-[1.5]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-light tracking-tight mb-2">
                  ${balanceData.totalOwed.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">From unpaid charges</p>
              </CardContent>
            </Card>

            <Card className="frosted-glass bg-card/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-normal text-muted-foreground">
                    Owed To You
                  </CardTitle>
                  <TrendingDown className="h-4 w-4 text-green-500 stroke-[1.5]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-light tracking-tight mb-2">
                  ${balanceData.totalOwedTo.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">From payments received</p>
              </CardContent>
            </Card>

            <Card className="frosted-glass bg-card/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-normal text-muted-foreground">
                    Net Balance
                  </CardTitle>
                  <DollarSign className={cn(
                    "h-4 w-4 stroke-[1.5]",
                    balanceData.netBalance > 0 ? "text-destructive" : balanceData.netBalance < 0 ? "text-green-500" : "text-muted-foreground"
                  )} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-3xl font-light tracking-tight mb-2",
                  balanceData.netBalance > 0 ? "text-destructive" : balanceData.netBalance < 0 ? "text-green-500" : ""
                )}>
                  {balanceData.netBalance > 0 ? "-" : balanceData.netBalance < 0 ? "+" : ""}${Math.abs(balanceData.netBalance || 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {balanceData.netBalance > 0 ? "You owe" : balanceData.netBalance < 0 ? "You're owed" : "All settled"}
                </p>
              </CardContent>
            </Card>

            <Card className="frosted-glass bg-card/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-normal text-muted-foreground">
                    Upcoming Charges
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-light tracking-tight mb-2">
                  {upcomingCharges.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {upcomingCharges.length === 1 ? "charge" : "charges"} due soon
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="space-y-6">
            {/* Charges List */}
            <Card className="frosted-glass bg-card/40">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-normal">Charges</CardTitle>
                    <CardDescription>Upcoming and recent charges</CardDescription>
                  </div>
                  <Button 
                    onClick={() => setAddChargeOpen(true)}
                    variant="ghost" 
                    size="sm" 
                    className="gap-2 text-xs"
                  >
                    <Plus className="h-3 w-3 stroke-[1.5]" />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingCharges.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50 stroke-[1]" />
                    <p className="text-sm mb-3">No charges yet</p>
                    <Button 
                      onClick={() => setAddChargeOpen(true)}
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                    >
                      Add Your First Charge
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingCharges.map((charge: any) => {
                      const dueDate = new Date(charge.due_date);
                      const isPastDue = dueDate < new Date();
                      const isDueToday = dueDate.toDateString() === new Date().toDateString();
                      const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      
                      // Get category icon based on name
                      const getCategoryIcon = (categoryName: string) => {
                        const name = categoryName?.toLowerCase() || "";
                        if (name.includes("rent")) return Home;
                        if (name.includes("electric")) return Zap;
                        if (name.includes("water") || name.includes("sewage")) return Droplet;
                        if (name.includes("trash")) return Trash2;
                        if (name.includes("wifi") || name.includes("internet")) return Wifi;
                        return Receipt;
                      };

                      const CategoryIcon = getCategoryIcon(charge.category?.name);

                      // Get category color based on type
                      const getCategoryColor = (categoryType: string) => {
                        switch (categoryType) {
                          case "rent": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
                          case "utility": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
                          default: return "bg-primary/10 text-primary border-primary/20";
                        }
                      };

                      const categoryColor = getCategoryColor(charge.category?.type || "other");

                      // Get user's share for this charge
                      const userShare = charge.charge_shares?.find((s: any) => s.user_id === user?.id);
                      const userAmount = userShare ? parseFloat(userShare.amount) : 0;
                      const totalAmount = parseFloat(charge.total_amount);

                      return (
                        <div
                          key={charge.id}
                          className="flex items-center gap-3 p-3 rounded-md bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer"
                        >
                          <div className={cn("h-10 w-10 rounded-md flex items-center justify-center flex-shrink-0", categoryColor)}>
                            <CategoryIcon className="h-5 w-5 stroke-[1.5]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-normal truncate">{charge.description}</div>
                              {userAmount > 0 && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  (Your share: ${userAmount.toFixed(2)})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {charge.category?.name || "Uncategorized"} • Due {dueDate.toLocaleDateString()}
                              </span>
                              {isPastDue && (
                                <span className="px-2 py-0.5 rounded text-xs bg-destructive/10 text-destructive font-normal">
                                  Past Due
                                </span>
                              )}
                              {!isPastDue && isDueToday && (
                                <span className="px-2 py-0.5 rounded text-xs bg-orange-500/10 text-orange-500 font-normal">
                                  Due Today
                                </span>
                              )}
                              {!isPastDue && !isDueToday && daysUntilDue <= 7 && (
                                <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-500 font-normal">
                                  Due Soon
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-normal">
                              ${totalAmount.toFixed(2)}
                            </div>
                            {userAmount > 0 && userAmount !== totalAmount && (
                              <div className="text-xs text-muted-foreground">
                                ${userAmount.toFixed(2)} yours
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card className="frosted-glass bg-card/40">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-normal">Recent Payments</CardTitle>
                    <CardDescription>Latest activity</CardDescription>
                  </div>
                  <Button 
                    onClick={() => setRecordPaymentOpen(true)}
                    variant="ghost" 
                    size="sm" 
                    className="gap-2 text-xs"
                  >
                    <Plus className="h-3 w-3 stroke-[1.5]" />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentPayments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50 stroke-[1]" />
                    <p className="text-sm mb-3">No payments yet</p>
                    <Button 
                      onClick={() => setRecordPaymentOpen(true)}
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                    >
                      Record Payment
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentPayments.map((payment: any) => {
                      const isUserPayer = payment.payer_id === user?.id;
                      const isUserRecipient = payment.recipient_id === user?.id;
                      
                      // Get payer and recipient identifiers
                      const payerId = payment.payer_id;
                      const recipientId = payment.recipient_id;
                      
                      // For now, use simple identifiers (will be improved with member lookup)
                      const payerName = isUserPayer ? "You" : "Member";
                      const recipientName = isUserRecipient ? "you" : recipientId ? "Member" : payment.category?.name || "Provider";

                      return (
                        <div
                          key={payment.id}
                          className="flex items-center gap-3 p-3 rounded-md bg-muted/10 hover:bg-muted/20 transition-colors"
                        >
                          <div className={cn(
                            "h-10 w-10 rounded-md flex items-center justify-center flex-shrink-0",
                            isUserRecipient 
                              ? "bg-green-500/10 text-green-500"
                              : "bg-blue-500/10 text-blue-500"
                          )}>
                            {isUserRecipient ? (
                              <TrendingDown className="h-5 w-5 stroke-[1.5]" />
                            ) : (
                              <TrendingUp className="h-5 w-5 stroke-[1.5]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-normal truncate">
                              {isUserPayer ? (
                                <>You paid {isUserRecipient ? "yourself" : recipientName}</>
                              ) : isUserRecipient ? (
                                <>{payerName} paid you</>
                              ) : (
                                <>{payerName} <ArrowRight className="inline h-3 w-3 mx-1" /> {recipientName}</>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {payment.payment_method_label && (
                                  <span className="px-1.5 py-0.5 rounded bg-muted/50 text-xs mr-1.5">
                                    {payment.payment_method_label}
                                  </span>
                                )}
                                {new Date(payment.date).toLocaleDateString()}
                                {payment.category?.name && ` • ${payment.category.name}`}
                              </span>
                            </div>
                            {payment.notes && (
                              <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                                {payment.notes}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={cn(
                              "text-sm font-normal",
                              isUserRecipient ? "text-green-500" : ""
                            )}>
                              {isUserRecipient ? "+" : ""}${parseFloat(payment.amount).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Categories Overview */}
            <Card className="frosted-glass bg-card/40">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-normal">Categories</CardTitle>
                    <CardDescription>Your utility and expense categories</CardDescription>
                  </div>
                  <Button 
                    onClick={() => setAddCategoryOpen(true)}
                    variant="ghost" 
                    size="sm" 
                    className="gap-2 text-xs"
                  >
                    <Plus className="h-3 w-3 stroke-[1.5]" />
                    Add Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Tag className="h-12 w-12 mx-auto mb-4 opacity-50 stroke-[1]" />
                    <p className="text-sm mb-3">No categories yet</p>
                    <Button 
                      onClick={() => setAddCategoryOpen(true)}
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                    >
                      Add Your First Category
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categories.map((category: any) => {
                      // Get category icon based on name
                      const getCategoryIcon = (categoryName: string) => {
                        const name = categoryName?.toLowerCase() || "";
                        if (name.includes("rent")) return Home;
                        if (name.includes("electric")) return Zap;
                        if (name.includes("water") || name.includes("sewage")) return Droplet;
                        if (name.includes("trash")) return Trash2;
                        if (name.includes("wifi") || name.includes("internet")) return Wifi;
                        return Tag;
                      };

                      const CategoryIcon = getCategoryIcon(category.name);

                      // Use theme colors instead of category-specific colors
                      const categoryColor = "bg-muted/20 text-foreground";

                      return (
                        <div
                          key={category.id}
                          className="flex items-center gap-3 p-3 rounded-md bg-muted/10 hover:bg-muted/20 transition-colors"
                        >
                          <div className={cn("h-10 w-10 rounded-md flex items-center justify-center flex-shrink-0", categoryColor)}>
                            <CategoryIcon className="h-5 w-5 stroke-[1.5]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-normal">{category.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                              {category.type || "other"}
                              {category.recurrence && ` • ${category.recurrence}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {category.is_free && (
                              <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-500 font-normal">
                                Free
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCategoryToEdit(category);
                                setEditCategoryOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      
      {/* Modals */}
      {house && (
        <>
          <AddChargeModal
            open={addChargeOpen}
            onOpenChange={setAddChargeOpen}
            house={house}
            onSuccess={refreshHouseData}
            onOpenAddCategory={() => setAddCategoryOpen(true)}
          />
          <RecordPaymentModal
            open={recordPaymentOpen}
            onOpenChange={setRecordPaymentOpen}
            house={house}
            onSuccess={refreshHouseData}
          />
          <AddCategoryModal
            open={addCategoryOpen}
            onOpenChange={setAddCategoryOpen}
            house={house}
            onSuccess={refreshHouseData}
          />
          <EditCategoryModal
            open={editCategoryOpen}
            onOpenChange={(open) => {
              setEditCategoryOpen(open);
              if (!open) setCategoryToEdit(null);
            }}
            house={house}
            category={categoryToEdit}
            onSuccess={refreshHouseData}
          />
        </>
      )}
    </>
  );
}
