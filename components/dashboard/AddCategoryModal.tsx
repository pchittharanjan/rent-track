"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface AddCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: any;
  onSuccess?: () => void;
}

export function AddCategoryModal({ open, onOpenChange, house, onSuccess }: AddCategoryModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState("utility");
  const [billingType, setBillingType] = useState("flat");
  const [isFree, setIsFree] = useState(false);
  const [recurrence, setRecurrence] = useState("monthly");
  const [isRecurring, setIsRecurring] = useState(true);
  const [provider, setProvider] = useState("");

  useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setName("");
      setType("utility");
      setBillingType("flat");
      setIsFree(false);
      setRecurrence("monthly");
      setIsRecurring(true);
      setProvider("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!house) {
        throw new Error("House not found");
      }

      if (!name.trim()) {
        throw new Error("Please enter a category name");
      }

      // Create category
      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .insert({
          house_id: house.id,
          name: name.trim(),
          type,
          billing_type: billingType,
          recurrence: isRecurring ? recurrence : null,
          is_free: isFree,
        })
        .select()
        .single();

      if (categoryError) throw categoryError;

      // Create provider if specified (non-blocking - category is already created)
      let providerWarning = null;
      if (provider.trim()) {
        const { error: providerError } = await supabase.from("providers").insert({
          house_id: house.id,
          category_id: category.id,
          label: provider.trim(),
        });

        if (providerError) {
          // Log the error but don't block category creation
          console.warn("Failed to create provider (category was created successfully):", providerError);
          providerWarning = `Note: Category created successfully, but provider "${provider.trim()}" could not be saved. You can add it later from the category settings.`;
        }
      }

      // Show warning if provider failed, but still proceed
      if (providerWarning) {
        setError(providerWarning);
        // Still call onSuccess and close after a brief delay so user can see the message
        setTimeout(() => {
          onSuccess?.();
          onOpenChange(false);
        }, 3000);
      } else {
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("Error creating category:", error);
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
          <DialogTitle className="text-2xl font-light tracking-tight font-serif">Add Category</DialogTitle>
          <DialogDescription className="text-base font-light">
            Create a new category for {house.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-light">
                {error}
              </div>
            )}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name" className="text-sm font-normal">
                  Category Name *
                </FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Internet, Parking, HOA Fees"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11 font-light"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="type" className="text-sm font-normal">
                    Type *
                  </FieldLabel>
                  <NativeSelect
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    required
                  >
                    <option value="rent">Rent</option>
                    <option value="utility">Utility</option>
                    <option value="other">Other</option>
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="billingType" className="text-sm font-normal">
                    Billing Type *
                  </FieldLabel>
                  <NativeSelect
                    id="billingType"
                    value={billingType}
                    onChange={(e) => setBillingType(e.target.value)}
                    required
                  >
                    <option value="flat">Flat Rate</option>
                    <option value="usage">Usage-Based</option>
                    <option value="mixed">Mixed</option>
                  </NativeSelect>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="provider" className="text-sm font-normal">
                  Provider/Company (optional)
                </FieldLabel>
                <Input
                  id="provider"
                  type="text"
                  placeholder="e.g., Comcast, PG&E, Landlord Name"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="h-11 font-light"
                />
              </Field>
            </FieldGroup>

            <div className="flex items-center space-x-2">
                <Checkbox
                  id="isFree"
                  checked={isFree}
                  onCheckedChange={(checked) => setIsFree(checked === true)}
                />
              <Label htmlFor="isFree" className="cursor-pointer text-sm font-normal">
                This is a free service (no cost)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked === true)}
                />
              <Label htmlFor="isRecurring" className="cursor-pointer text-sm font-normal">
                This is a recurring charge
              </Label>
            </div>

            {isRecurring && (
              <Field>
                <FieldLabel htmlFor="recurrence" className="text-sm font-normal">
                  Recurrence *
                </FieldLabel>
                <NativeSelect
                  id="recurrence"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  required
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </NativeSelect>
              </Field>
            )}

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
                {loading ? "Creating..." : "Create Category"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
