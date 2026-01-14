"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Users, Home, Edit, Save, X, User } from "lucide-react";
import { ManageRoommatesModal } from "@/components/dashboard/ManageRoommatesModal";
import { useUser } from "@/contexts/UserContext";
import { useHouse } from "@/contexts/HouseContext";

export default function SettingsPage() {
  const router = useRouter();
  const { user, updateUserMetadata } = useUser();
  const { house, updateHouse, loading: houseLoading } = useHouse();
  const mountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [manageRoommatesOpen, setManageRoommatesOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Personal settings state
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Edit form state
  const [houseName, setHouseName] = useState("");
  const [houseAddress, setHouseAddress] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const lastHouseIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Set personal info - try multiple sources
    const metadata = user.user_metadata || {};
    let first = metadata.first_name || "";
    let last = metadata.last_name || "";
    
    // If no first/last name, try to split the name field
    if (!first && !last && metadata.name) {
      const nameParts = metadata.name.trim().split(/\s+/);
      first = nameParts[0] || "";
      last = nameParts.slice(1).join(" ") || "";
    }
    
    // If still no first name, try email prefix as fallback
    if (!first && user.email) {
      first = user.email.split("@")[0];
    }
    
    setFirstName(first);
    setLastName(last);

    setLoading(false);
  }, [user, router]);

  // Initialize house form values only when house ID changes (new house loaded)
  // Never update form values while editing, and only when house ID actually changes
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7504ed3b-0565-4935-875c-418aeb6d4a16',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings/page.tsx:useEffect',message:'useEffect triggered',data:{houseId:house?.id,isEditing,lastHouseId:lastHouseIdRef.current,houseName:house?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Don't update if we're editing or if this is the same house we've already initialized
    if (house && !isEditing) {
      const currentHouseId = house.id;
      // Only update if this is a different house than we've seen
      // This prevents flickering when the same house object gets refreshed after updates
      if (lastHouseIdRef.current !== currentHouseId) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/7504ed3b-0565-4935-875c-418aeb6d4a16',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings/page.tsx:useEffect',message:'INITIALIZING form values - different house',data:{currentHouseId,lastHouseId:lastHouseIdRef.current,houseName:house.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        setHouseName(house.name || "");
        setHouseAddress(house.address || "");
        setTimezone(house.timezone || "America/Los_Angeles");
        lastHouseIdRef.current = currentHouseId;
      }
    }
  }, [house?.id, isEditing]); // Only depend on house.id and isEditing

  const handleSave = async () => {
    if (!house) return;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7504ed3b-0565-4935-875c-418aeb6d4a16',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings/page.tsx:handleSave',message:'handleSave START',data:{houseId:house.id,houseName,houseAddress,timezone,currentIsEditing:isEditing},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    setEditError(null);
    setSaving(true);

    try {
      if (!houseName.trim()) {
        setEditError("House name is required");
        setSaving(false);
        return;
      }

      // Store the house ID and update the ref BEFORE exiting edit mode
      // This prevents the useEffect from resetting form values when isEditing changes
      const currentHouseId = house.id;
      lastHouseIdRef.current = currentHouseId;

      // Exit edit mode - the ref update above ensures useEffect won't reset values
      setIsEditing(false);

      // Use context's updateHouse method
      await updateHouse({
        name: houseName.trim(),
        address: houseAddress.trim() || null,
        timezone,
      });
      
      // Ref is already updated, so useEffect won't reset values
    } catch (error: any) {
      console.error("Error updating house:", error);
      setEditError(error.message || "Failed to update house information");
      // Re-enter edit mode on error so user can try again
      setIsEditing(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (house) {
      setHouseName(house.name || "");
      setHouseAddress(house.address || "");
      setTimezone(house.timezone || "America/Los_Angeles");
    }
    setIsEditing(false);
    setEditError(null);
  };

  const handleSavePersonal = async () => {
    if (!user) return;

    setPersonalError(null);
    setSavingPersonal(true);

    try {
      const newFirstName = firstName.trim();
      const newLastName = lastName.trim();
      const newName = `${newFirstName} ${newLastName}`.trim();
      
      // Use the context's updateUserMetadata which handles optimistic updates
      // and syncs across all components automatically
      await updateUserMetadata({
        first_name: newFirstName,
        last_name: newLastName,
        name: newName,
      });
      
      // Update local form state
      setFirstName(newFirstName);
      setLastName(newLastName);
      
      // Exit edit mode
      setIsEditingPersonal(false);
      
    } catch (error: any) {
      console.error("Error updating personal info:", error);
      setPersonalError(error.message || "Failed to update personal information");
      // Keep edit mode open on error so user can try again
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleCancelPersonal = () => {
    // Reset to original values
    if (user) {
      setFirstName(user.user_metadata?.first_name || "");
      setLastName(user.user_metadata?.last_name || "");
    }
    setIsEditingPersonal(false);
    setPersonalError(null);
  };

  if (loading) {
    return (
      <div className="px-8 py-6">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!house) {
    return (
      <div className="px-8 py-6">
        <div className="text-center">
          <p className="text-muted-foreground">No house found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6 bg-card/30">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight font-serif mb-2">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal information and house settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Personal Settings Card */}
        <Card className="frosted-glass bg-card/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-normal flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Settings
              </CardTitle>
              {!isEditingPersonal && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    // Refresh values from user when entering edit mode
                    if (user) {
                      const metadata = user.user_metadata || {};
                      let first = metadata.first_name || "";
                      let last = metadata.last_name || "";
                      
                      if (!first && !last && metadata.name) {
                        const nameParts = metadata.name.trim().split(/\s+/);
                        first = nameParts[0] || "";
                        last = nameParts.slice(1).join(" ") || "";
                      }
                      
                      if (!first && user.email) {
                        first = user.email.split("@")[0];
                      }
                      
                      setFirstName(first);
                      setLastName(last);
                    }
                    setIsEditingPersonal(true);
                  }}
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {personalError && (
              <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-light">
                {personalError}
              </div>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="first-name" className="text-sm font-normal">
                  First Name
                </FieldLabel>
                {isEditingPersonal ? (
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 font-light"
                  />
                ) : (
                  <div className="text-sm font-normal">
                    {firstName || (() => {
                      const metadata = user?.user_metadata || {};
                      if (metadata.first_name) return metadata.first_name;
                      if (metadata.name) {
                        const parts = metadata.name.trim().split(/\s+/);
                        return parts[0] || "";
                      }
                      if (user?.email) return user.email.split("@")[0];
                      return "Not set";
                    })()}
                  </div>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="last-name" className="text-sm font-normal">
                  Last Name
                </FieldLabel>
                {isEditingPersonal ? (
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11 font-light"
                  />
                ) : (
                  <div className="text-sm font-normal">
                    {lastName || (() => {
                      const metadata = user?.user_metadata || {};
                      if (metadata.last_name) return metadata.last_name;
                      if (metadata.name) {
                        const parts = metadata.name.trim().split(/\s+/);
                        return parts.slice(1).join(" ") || "";
                      }
                      return "Not set";
                    })()}
                  </div>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="email" className="text-sm font-normal">
                  Email
                </FieldLabel>
                <div className="text-sm font-normal text-muted-foreground">
                  {user?.email}
                </div>
                <FieldDescription>
                  Email cannot be changed here
                </FieldDescription>
              </Field>
            </FieldGroup>
            {isEditingPersonal && (
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleCancelPersonal}
                  disabled={savingPersonal}
                  className="flex-1 font-normal"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePersonal}
                  disabled={savingPersonal}
                  className="flex-1 font-normal"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingPersonal ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* House Info Card */}
        <Card className="frosted-glass bg-card/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-normal flex items-center gap-2">
                <Home className="h-5 w-5" />
                House Information
              </CardTitle>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    // Initialize form values from current house data when entering edit mode
                    if (house) {
                      setHouseName(house.name || "");
                      setHouseAddress(house.address || "");
                      setTimezone(house.timezone || "America/Los_Angeles");
                    }
                    setIsEditing(true);
                  }}
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editError && (
              <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-light">
                {editError}
              </div>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="house-name" className="text-sm font-normal">
                  House Name *
                </FieldLabel>
                {isEditing ? (
                  <Input
                    id="house-name"
                    value={houseName}
                    onChange={(e) => setHouseName(e.target.value)}
                    className="h-11 font-light"
                    required
                  />
                ) : (
                  <div className="text-sm font-normal">
                    {house.name}
                  </div>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="house-address" className="text-sm font-normal">
                  Address (optional)
                </FieldLabel>
                {isEditing ? (
                  <Input
                    id="house-address"
                    value={houseAddress}
                    onChange={(e) => setHouseAddress(e.target.value)}
                    placeholder="123 Main St, Apt 4B, City, State"
                    className="h-11 font-light"
                  />
                ) : (
                  <div className="text-sm font-normal text-muted-foreground">
                    {house.address || "No address set"}
                  </div>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="timezone" className="text-sm font-normal">
                  Timezone
                </FieldLabel>
                {isEditing ? (
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
                ) : (
                  <div className="text-sm font-normal">
                    {timezone === "America/Los_Angeles" && "Pacific Time"}
                    {timezone === "America/Denver" && "Mountain Time"}
                    {timezone === "America/Chicago" && "Central Time"}
                    {timezone === "America/New_York" && "Eastern Time"}
                  </div>
                )}
              </Field>
            </FieldGroup>
            {isEditing && (
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 font-normal"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 font-normal"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Roommates Card */}
        <Card className="frosted-glass bg-card/40">
          <CardHeader>
            <CardTitle className="text-lg font-normal flex items-center gap-2">
              <Users className="h-5 w-5" />
              Roommates
            </CardTitle>
            <CardDescription>
              Manage who has access to this house
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setManageRoommatesOpen(true)}
              className="w-full font-normal"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Roommates
            </Button>
          </CardContent>
        </Card>
      </div>

      {house && user && (
        <ManageRoommatesModal
          open={manageRoommatesOpen}
          onOpenChange={setManageRoommatesOpen}
          house={house}
          currentUserId={user.id}
          onSuccess={() => {
            // Refresh data if needed
          }}
        />
      )}
    </div>
  );
}
