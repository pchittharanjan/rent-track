"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Home, Zap, Droplet, Trash2, Wifi, FileText, LucideIcon, X } from "lucide-react";

type UtilityType = {
  id: string;
  name: string;
  icon: LucideIcon;
  selected: boolean;
  isFree: boolean;
  isRecurring: boolean;
  billingType: "flat" | "usage" | "mixed";
  provider: string;
  recurrence: string;
};

const UTILITIES = [
  { id: "rent", name: "Rent", icon: Home },
  { id: "electricity", name: "Electricity", icon: Zap },
  { id: "water", name: "Water & Sewage", icon: Droplet },
  { id: "trash", name: "Trash", icon: Trash2 },
  { id: "wifi", name: "WiFi", icon: Wifi },
  { id: "other", name: "Custom", icon: FileText },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [houseNameError, setHouseNameError] = useState<string | null>(null);
  const [utilityError, setUtilityError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Step 1: House Info
  const [houseName, setHouseName] = useState("");
  const [houseAddress, setHouseAddress] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");

  // Step 2: Utilities
  const [utilities, setUtilities] = useState<UtilityType[]>(
    UTILITIES.map((u) => ({
      ...u,
      selected: false,
      isFree: false,
      isRecurring: true,
      billingType: "flat" as const,
      provider: "",
      recurrence: "monthly",
    }))
  );

  // Step 4: Rent Configuration
  const [configureRent, setConfigureRent] = useState(false);
  const [rentAmounts, setRentAmounts] = useState<Record<string, number>>({});

  // Step 5: Roommates
  const [roommateEmails, setRoommateEmails] = useState<string[]>([""]);
  const [visibilitySettings, setVisibilitySettings] = useState(true);

  // Ensure step always starts at 1 when page loads
  useEffect(() => {
    setStep(1);
  }, []);

  // Handle Enter key to trigger Next button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !loading && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Don't trigger if user is typing in a textarea or multi-line input
        const target = e.target as HTMLElement;
        if (target.tagName === "TEXTAREA") {
          return;
        }
        // Prevent default form submission if inside a form
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, loading]);

  const handleUtilityToggle = (id: string) => {
    setUtilities((prev) =>
      prev.map((u) => (u.id === id ? { ...u, selected: !u.selected } : u))
    );
  };

  const updateUtility = (id: string, updates: Partial<UtilityType>) => {
    setUtilities((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!houseName.trim()) {
        setHouseNameError("Please enter a house nickname");
        return;
      }
      setHouseNameError(null);
    }

    if (step === 2) {
      const hasSelected = utilities.some((u) => u.selected);
      if (!hasSelected) {
        setUtilityError("Please select at least one utility");
        return;
      }
      setUtilityError(null);
    }

    if (step === 6) {
      await handleComplete();
      return;
    }

    setStep(step + 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Create house
      const { data: house, error: houseError } = await supabase
        .from("houses")
        .insert({
          name: houseName,
          address: houseAddress || null,
          timezone,
          created_by: user.id,
        })
        .select()
        .single();

      if (houseError) throw houseError;

      // Add creator as admin
      await supabase.from("house_members").insert({
        house_id: house.id,
        user_id: user.id,
        role: "admin",
        can_see_others_balances: visibilitySettings,
      });

      // Create categories for selected utilities
      const selectedUtilities = utilities.filter((u) => u.selected);
      for (const utility of selectedUtilities) {
        const { data: category, error: categoryError } = await supabase
          .from("categories")
          .insert({
            house_id: house.id,
            name: utility.name,
            type: utility.id === "rent" ? "rent" : "utility",
            billing_type: utility.billingType,
            recurrence: utility.isRecurring ? utility.recurrence : null,
            is_free: utility.isFree,
          })
          .select()
          .single();

        if (categoryError) throw categoryError;

        // Create provider if specified
        if (utility.provider) {
          await supabase.from("providers").insert({
            house_id: house.id,
            category_id: category.id,
            label: utility.provider,
          });
        }

        // If rent and configure rent is enabled, create rent configurations
        if (utility.id === "rent" && configureRent) {
          // This will be populated when roommates are added
        }
      }

      // Send invites for roommates
      const validEmails = roommateEmails.filter((email) => email.trim());
      for (const email of validEmails) {
        const token = crypto.randomUUID();
        await supabase.from("invites").insert({
          house_id: house.id,
          email: email.trim(),
          token,
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });
        // TODO: Send email invite
      }

      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      setGeneralError(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CardHeader>
              <CardTitle className="text-3xl">Create your first house</CardTitle>
              <CardDescription>
                Let&apos;s start by setting up your house information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="house-name">House Nickname *</Label>
                <Input
                  id="house-name"
                  placeholder="1234 Berkeley Ave"
                  value={houseName}
                  onChange={(e) => {
                    setHouseName(e.target.value);
                    if (houseNameError) setHouseNameError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) {
                      e.preventDefault();
                      handleNext();
                    }
                  }}
                  required
                />
                {houseNameError && (
                  <p className="text-xs text-destructive font-light mt-1">{houseNameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address (optional)</Label>
                <Input
                  id="address"
                  placeholder="123 Main St, Apt 4B, City, State"
                  value={houseAddress}
                  onChange={(e) => setHouseAddress(e.target.value)}
                />
                <p className="text-xs text-muted-foreground font-light">
                  Include apartment, suite, or unit number if applicable
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <NativeSelect
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/New_York">Eastern Time</option>
                </NativeSelect>
              </div>
            </CardContent>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CardHeader>
              <CardTitle className="text-3xl">Add utilities & categories</CardTitle>
              <CardDescription>
                Select the utilities and categories you want to track
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {utilityError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-light">
                  {utilityError}
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {utilities.map((utility) => (
                  <Card
                    key={utility.id}
                    className={`cursor-pointer transition-all ${
                      utility.selected
                        ? "border-foreground bg-muted"
                        : "hover:border-border"
                    }`}
                    onClick={() => handleUtilityToggle(utility.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="flex justify-center mb-2">
                        <utility.icon className="h-8 w-8 stroke-[1]" />
                      </div>
                      <div className="text-sm font-normal">{utility.name}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {utilities.filter((u) => u.selected).length > 0 && (
                <div className="space-y-4 pt-4 border-t border-border/20">
                  <h3 className="text-lg font-light tracking-tight font-serif">Configure Selected Utilities</h3>
                  {utilities
                    .filter((u) => u.selected)
                    .map((utility) => (
                      <Card key={utility.id} className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <utility.icon className="h-5 w-5 stroke-[1]" />
                              <span className="text-sm font-normal">{utility.name}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`recurring-${utility.id}`}
                              checked={utility.isRecurring}
                              onCheckedChange={(checked) =>
                                updateUtility(utility.id, {
                                  isRecurring: checked === true,
                                })
                              }
                            />
                            <Label
                              htmlFor={`recurring-${utility.id}`}
                              className="cursor-pointer"
                            >
                              Recurring bill
                            </Label>
                          </div>

                          {utility.isRecurring && (
                            <div className="space-y-2">
                              <Label>Recurrence</Label>
                              <NativeSelect
                                value={utility.recurrence}
                                onChange={(e) =>
                                  updateUtility(utility.id, {
                                    recurrence: e.target.value,
                                  })
                                }
                              >
                                <option value="monthly">Monthly</option>
                                <option value="weekly">Weekly</option>
                                <option value="yearly">Yearly</option>
                              </NativeSelect>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label>Billing Type</Label>
                            <NativeSelect
                              value={utility.billingType}
                              onChange={(e) =>
                                updateUtility(utility.id, {
                                  billingType: e.target.value as any,
                                })
                              }
                            >
                              <option value="flat">Flat Fee</option>
                              <option value="usage">Usage-Based</option>
                              <option value="mixed">Mixed</option>
                            </NativeSelect>
                          </div>

                          <div className="space-y-2">
                            <Label>Provider (optional)</Label>
                            <Input
                              placeholder="e.g., PG&E, Apartment Portal"
                              value={utility.provider}
                              onChange={(e) =>
                                updateUtility(utility.id, {
                                  provider: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`free-${utility.id}`}
                              checked={utility.isFree}
                              onCheckedChange={(checked) =>
                                updateUtility(utility.id, {
                                  isFree: checked === true,
                                })
                              }
                            />
                            <Label
                              htmlFor={`free-${utility.id}`}
                              className="cursor-pointer"
                            >
                              Not billed / Free
                            </Label>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CardHeader>
              <CardTitle className="text-3xl">Import history</CardTitle>
              <CardDescription>
                Add past charges and payments (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup defaultValue="skip">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      id="skip"
                      value="skip"
                    />
                    <Label htmlFor="skip" className="cursor-pointer">Skip for now</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      id="manual"
                      value="manual"
                    />
                    <Label htmlFor="manual" className="cursor-pointer">Add manually</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      id="csv"
                      value="csv"
                    />
                    <Label htmlFor="csv" className="cursor-pointer">Upload CSV</Label>
                  </div>
                </div>
              </RadioGroup>
              <p className="text-sm text-muted-foreground pt-4">
                You can always add charges and payments later from the dashboard.
              </p>
            </CardContent>
          </motion.div>
        );

      case 4:
        const rentUtility = utilities.find((u) => u.id === "rent" && u.selected);
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CardHeader>
              <CardTitle className="text-3xl">Set recurring & details</CardTitle>
              <CardDescription>
                Configure recurring charges and default settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rentUtility && (
                <Card className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <rentUtility.icon className="h-5 w-5" />
                          <span className="font-medium">{rentUtility.name}</span>
                        </div>
                      </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="configure-rent"
                        checked={configureRent}
                        onCheckedChange={(checked) => setConfigureRent(checked === true)}
                      />
                      <Label htmlFor="configure-rent" className="cursor-pointer">
                        Set custom rent amounts for roommates
                      </Label>
                    </div>
                    {configureRent && (
                      <p className="text-sm text-muted-foreground">
                        You&apos;ll configure rent amounts after adding roommates.
                      </p>
                    )}
                  </div>
                </Card>
              )}
              <p className="text-sm text-muted-foreground">
                Default split method and other settings can be configured later in
                house settings.
              </p>
            </CardContent>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CardHeader>
              <CardTitle className="text-3xl">Add roommates</CardTitle>
              <CardDescription>
                Invite roommates to join your house (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {roommateEmails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="roommate@example.com"
                      value={email}
                      onChange={(e) => {
                        const newEmails = [...roommateEmails];
                        newEmails[index] = e.target.value;
                        setRoommateEmails(newEmails);
                      }}
                    />
                    {roommateEmails.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setRoommateEmails(roommateEmails.filter((_, i) => i !== index));
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRoommateEmails([...roommateEmails, ""])}
                >
                  Add another email
                </Button>
              </div>

              <div className="pt-4 border-t space-y-4">
                <div className="space-y-2">
                  <Label>Visibility Settings</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="visibility"
                      checked={visibilitySettings}
                      onCheckedChange={(checked) => setVisibilitySettings(checked === true)}
                    />
                    <Label htmlFor="visibility" className="cursor-pointer">
                      Everyone can see everyone&apos;s per-person balances
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            key="step6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <CardHeader>
              <CardTitle className="text-3xl">You&apos;re all set! 🎉</CardTitle>
              <CardDescription>
                Your house has been created successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold font-serif">Summary</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>✓ House &quot;{houseName}&quot; created</li>
                  <li>
                    ✓ {utilities.filter((u) => u.selected).length} utilities configured
                  </li>
                  <li>
                    ✓ {roommateEmails.filter((e) => e.trim()).length} roommate
                    {roommateEmails.filter((e) => e.trim()).length !== 1 ? "s" : ""}{" "}
                    invited
                  </li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground pt-4">
                You can start tracking charges and payments from your dashboard.
              </p>
            </CardContent>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2 gap-4">
            <span className="text-sm font-medium whitespace-nowrap">Step {step} of 6</span>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {Math.round((step / 6) * 100)}%
            </span>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 6) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <Card className="frosted-glass border-border/20 shadow-xl relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="absolute top-4 right-4 h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
          <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>

          <div className="p-6 pt-0 flex justify-between">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                if (step > 1) {
                  setStep(step - 1);
                }
              }}
              disabled={step === 1}
            >
              Previous
            </Button>
            <Button onClick={handleNext} disabled={loading} type="button">
              {loading
                ? "Setting up..."
                : step === 6
                ? "Go to Dashboard"
                : "Next"}
            </Button>
          </div>
        </Card>
      </div>
      {generalError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4 frosted-glass border-border/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-light">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-light">{generalError}</p>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => setGeneralError(null)}
                className="w-full font-normal"
              >
                OK
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
