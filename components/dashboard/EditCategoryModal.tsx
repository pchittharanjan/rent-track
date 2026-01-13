"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface EditCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: any;
  category: any;
  onSuccess?: () => void;
  onDelete?: () => void;
}

export function EditCategoryModal({ open, onOpenChange, house, category, onSuccess, onDelete }: EditCategoryModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState("utility");
  const [billingType, setBillingType] = useState("flat");
  const [isFree, setIsFree] = useState(false);
  const [recurrence, setRecurrence] = useState("monthly");
  const [isRecurring, setIsRecurring] = useState(true);
  const [provider, setProvider] = useState("");

  // Load category data when modal opens
  useEffect(() => {
    if (open && category) {
      setName(category.name || "");
      setType(category.type || "utility");
      setBillingType(category.billing_type || "flat");
      setIsFree(category.is_free || false);
      setRecurrence(category.recurrence || "monthly");
      setIsRecurring(!!category.recurrence);
      setProvider("");
      setError(null);

      // Load provider if exists
      if (category.id) {
        loadProvider();
      }
    } else if (!open) {
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
  }, [open, category]);

  const loadProvider = async () => {
    if (!category.id) return;
    
    try {
      const { data: providers, error: providerError } = await supabase
        .from("providers")
        .select("*")
        .eq("category_id", category.id)
        .limit(1);

      if (!providerError && providers && providers.length > 0) {
        setProvider(providers[0].label || "");
      }
    } catch (error) {
      console.error("Error loading provider:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!house || !category) {
        throw new Error("House or category not found");
      }

      if (!name.trim()) {
        throw new Error("Please enter a category name");
      }

      // Update category
      const { error: categoryError } = await supabase
        .from("categories")
        .update({
          name: name.trim(),
          type,
          billing_type: billingType,
          recurrence: isRecurring ? recurrence : null,
          is_free: isFree,
        })
        .eq("id", category.id);

      if (categoryError) throw categoryError;

      // Update or create provider if specified
      if (provider.trim()) {
        // Check if provider exists
        const { data: existingProviders } = await supabase
          .from("providers")
          .select("*")
          .eq("category_id", category.id)
          .limit(1);

        if (existingProviders && existingProviders.length > 0) {
          // Update existing provider
          const { error: providerError } = await supabase
            .from("providers")
            .update({
              label: provider.trim(),
            })
            .eq("id", existingProviders[0].id);

          if (providerError) {
            console.warn("Failed to update provider:", providerError);
          }
        } else {
          // Create new provider
          const { error: providerError } = await supabase.from("providers").insert({
            house_id: house.id,
            category_id: category.id,
            label: provider.trim(),
          });

          if (providerError) {
            console.warn("Failed to create provider:", providerError);
          }
        }
      } else {
        // Remove provider if it exists and field is empty
        const { error: deleteError } = await supabase
          .from("providers")
          .delete()
          .eq("category_id", category.id);

        if (deleteError) {
          console.warn("Failed to delete provider:", deleteError);
        }
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating category:", error);
      setError(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!category) return;
    
    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(true);
    setError(null);

    try {
      // Delete category (cascade will handle related records)
      const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .eq("id", category.id);

      if (deleteError) throw deleteError;

      onDelete?.();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error deleting category:", error);
      setError(error.message || "An error occurred while deleting");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!house || !category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl frosted-glass bg-card/90 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light tracking-tight font-serif">Edit Category</DialogTitle>
          <DialogDescription className="text-base font-light">
            Update category settings for {house.name}
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

              <Field orientation="horizontal">
                <Checkbox
                  id="isFree"
                  checked={isFree}
                  onCheckedChange={(checked) => setIsFree(checked === true)}
                />
                <FieldLabel htmlFor="isFree" className="cursor-pointer text-sm font-normal">
                  This is a free service (no cost)
                </FieldLabel>
              </Field>

              <Field orientation="horizontal">
                <Checkbox
                  id="isRecurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked === true)}
                />
                <FieldLabel htmlFor="isRecurring" className="cursor-pointer text-sm font-normal">
                  This is a recurring charge
                </FieldLabel>
              </Field>

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
            </FieldGroup>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading || deleteLoading}
                className="flex-1 font-normal"
              >
                {deleteLoading ? "Deleting..." : "Delete Category"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 font-normal"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || deleteLoading} className="flex-1 font-normal">
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
