"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: any;
  onSuccess?: () => void;
}

export function RecordPaymentModal({ open, onOpenChange, house, onSuccess }: RecordPaymentModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [payerId, setPayerId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && house) {
      loadData();
      // Set default date to today
      setDate(new Date().toISOString().split("T")[0]);
    } else {
      // Reset form when modal closes
      setPayerId("");
      setRecipientId("");
      setCategoryId("");
      setAmount("");
      setDate("");
      setPaymentMethod("");
      setNotes("");
      setError(null);
    }
  }, [open, house]);

  async function loadData() {
    if (!house) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get categories for this house
      const { data: cats, error: catsError } = await supabase
        .from("categories")
        .select("*")
        .eq("house_id", house.id)
        .order("name");

      if (catsError) throw catsError;
      setCategories(cats || []);

      // Get house members
      const { data: mems, error: memsError } = await supabase
        .from("house_members")
        .select("user_id")
        .eq("house_id", house.id);

      if (memsError) throw memsError;

      // Format members for display
      const formattedMembers = (mems || []).map((m: any) => ({
        id: m.user_id,
        name: m.user_id === user.id 
          ? (user.user_metadata?.first_name || user.email?.split("@")[0] || "You")
          : `Member ${m.user_id.slice(0, 8)}`,
      }));

      setMembers(formattedMembers);
      setPayerId(user.id); // Default to current user as payer
    } catch (error: any) {
      console.error("Error loading data:", error);
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

      if (!payerId || !amount || !date) {
        throw new Error("Please fill in all required fields");
      }

      // Create payment
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          house_id: house.id,
          created_by: user.id,
          payer_id: payerId,
          recipient_id: recipientId || null,
          category_id: categoryId || null,
          date,
          amount: parseFloat(amount),
          payment_method_label: paymentMethod || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error recording payment:", error);
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
          <DialogTitle className="text-2xl font-light tracking-tight font-serif">Record Payment</DialogTitle>
          <DialogDescription className="text-base font-light">
            Record a payment for {house.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-light">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payer" className="text-sm font-normal">
                  Paid By *
                </Label>
                <NativeSelect
                  id="payer"
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  required
                >
                  <option value="">Select payer</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient" className="text-sm font-normal">
                  Paid To (optional)
                </Label>
                <NativeSelect
                  id="recipient"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                >
                  <option value="">Payment to provider</option>
                  {members
                    .filter((m) => m.id !== payerId)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                </NativeSelect>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-normal">
                  Amount *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="h-11 font-light"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-normal">
                  Payment Date *
                </Label>
                <DatePicker
                  id="date"
                  value={date}
                  onChange={(value) => setDate(value)}
                  placeholder="Select payment date"
                  className="h-11 font-light"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-normal">
                  Category (optional)
                </Label>
                <NativeSelect
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod" className="text-sm font-normal">
                  Payment Method (optional)
                </Label>
                <Input
                  id="paymentMethod"
                  type="text"
                  placeholder="e.g., Venmo, Zelle, Cash"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-11 font-light"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-normal">
                Notes (optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={(e) => {
                  // Allow Ctrl+Enter or Cmd+Enter to submit from textarea
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                rows={3}
                className="font-light resize-none"
              />
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
                {loading ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
