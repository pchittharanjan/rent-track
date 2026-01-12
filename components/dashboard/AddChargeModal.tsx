"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";

interface AddChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: any;
  onSuccess?: () => void;
  onOpenAddCategory?: () => void;
}

export function AddChargeModal({ open, onOpenChange, house, onSuccess, onOpenAddCategory }: AddChargeModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [billPeriodStart, setBillPeriodStart] = useState("");
  const [billPeriodEnd, setBillPeriodEnd] = useState("");

  useEffect(() => {
    if (open && house) {
      loadCategories();
      // Set default due date to today + 7 days
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 7);
      setDueDate(defaultDueDate.toISOString().split("T")[0]);
    } else {
      // Reset form when modal closes
      setCategoryId("");
      setDescription("");
      setTotalAmount("");
      setDueDate("");
      setBillPeriodStart("");
      setBillPeriodEnd("");
      setError(null);
    }
  }, [open, house]);

  async function loadCategories() {
    if (!house) return;
    try {
      const { data: cats, error: catsError } = await supabase
        .from("categories")
        .select("*")
        .eq("house_id", house.id)
        .order("name");

      if (catsError) throw catsError;
      setCategories(cats || []);
    } catch (error: any) {
      console.error("Error loading categories:", error);
      setError(error.message || "An error occurred");
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !house) {
        throw new Error("User or house not found");
      }

      if (!categoryId || !description || !totalAmount || !dueDate) {
        throw new Error("Please fill in all required fields");
      }

      // Create charge
      const { data: charge, error: chargeError } = await supabase
        .from("charges")
        .insert({
          house_id: house.id,
          category_id: categoryId,
          created_by: user.id,
          description,
          total_amount: parseFloat(totalAmount),
          due_date: dueDate,
          bill_period_start: billPeriodStart || null,
          bill_period_end: billPeriodEnd || null,
          split_method: "equal",
        })
        .select()
        .single();

      if (chargeError) throw chargeError;

      // Get all house members
      const { data: members, error: membersError } = await supabase
        .from("house_members")
        .select("user_id")
        .eq("house_id", house.id);

      if (membersError) throw membersError;

      // Create charge shares (equal split by default)
      const amountPerPerson = parseFloat(totalAmount) / (members?.length || 1);
      const percentage = 100 / (members?.length || 1);

      if (members) {
        const chargeShares = members.map((member: any) => ({
          charge_id: charge.id,
          user_id: member.user_id,
          amount: amountPerPerson,
          percentage,
        }));

        const { error: sharesError } = await supabase
          .from("charge_shares")
          .insert(chargeShares);

        if (sharesError) throw sharesError;
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating charge:", error);
      setError(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!house) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl frosted-glass bg-card/90 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light tracking-tight font-serif">Add Charge</DialogTitle>
          <DialogDescription className="text-base font-light">
            Create a new charge for {house.name}
          </DialogDescription>
        </DialogHeader>
        
        {categories.length === 0 ? (
          <div className="space-y-4 py-4">
            <p className="text-center text-muted-foreground">
              No categories found. Please create categories first.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="font-normal">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  onOpenChange(false);
                  onOpenAddCategory?.();
                }}
                className="font-normal"
              >
                Create Category
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-light">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-normal">
                  Category *
                </Label>
                <NativeSelect
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-normal">
                  Description *
                </Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="e.g., January Rent"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="h-11 font-light"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-normal">
                    Total Amount *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    required
                    className="h-11 font-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-sm font-normal">
                    Due Date *
                  </Label>
                  <DatePicker
                    id="dueDate"
                    value={dueDate}
                    onChange={(value) => setDueDate(value)}
                    placeholder="Select due date"
                    className="h-11 font-light"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billPeriodStart" className="text-sm font-normal">
                    Bill Period Start (optional)
                  </Label>
                  <DatePicker
                    id="billPeriodStart"
                    value={billPeriodStart}
                    onChange={(value) => setBillPeriodStart(value)}
                    placeholder="Select start date"
                    className="h-11 font-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billPeriodEnd" className="text-sm font-normal">
                    Bill Period End (optional)
                  </Label>
                  <DatePicker
                    id="billPeriodEnd"
                    value={billPeriodEnd}
                    onChange={(value) => setBillPeriodEnd(value)}
                    placeholder="Select end date"
                    className="h-11 font-light"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 font-normal"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 font-normal">
                  {loading ? "Creating..." : "Create Charge"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
