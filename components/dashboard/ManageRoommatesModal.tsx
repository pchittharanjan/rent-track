"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Mail, X, Crown, User, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHouse } from "@/contexts/HouseContext";

interface ManageRoommatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: any;
  currentUserId: string;
  onSuccess?: () => void;
}

interface Roommate {
  id: string;
  user_id: string;
  role: "admin" | "member";
  email?: string;
  name?: string;
  joined_at: string;
}

interface Invite {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired";
  created_at: string;
  expires_at: string;
}

export function ManageRoommatesModal({
  open,
  onOpenChange,
  house,
  currentUserId,
  onSuccess,
}: ManageRoommatesModalProps) {
  const supabase = createClient();
  const { houseMembers, refreshHouseMembers, removeHouseMember, updateHouseMember } = useHouse();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (open && house) {
      loadRoommates();
      loadInvites();
      checkAdminStatus();
    }
  }, [open, house, currentUserId, houseMembers]);

  const checkAdminStatus = async () => {
    if (!house || !currentUserId) return;
    
    const { data } = await supabase
      .from("house_members")
      .select("role")
      .eq("house_id", house.id)
      .eq("user_id", currentUserId)
      .single();
    
    setIsAdmin(data?.role === "admin");
  };

  const loadRoommates = async () => {
    if (!house || !houseMembers) return;
    
    try {
      // Use house members from context
      const roommatesWithInfo = houseMembers.map((member) => {
        // Use the current user's info if it matches
        const isCurrentUser = member.user_id === currentUserId;
        return {
          id: member.id,
          user_id: member.user_id,
          role: member.role,
          joined_at: member.joined_at,
          email: isCurrentUser ? "You" : `User ${member.user_id.slice(0, 8)}`,
          name: isCurrentUser ? "You" : `Roommate ${member.user_id.slice(0, 8)}`,
        };
      });

      setRoommates(roommatesWithInfo);
    } catch (error: any) {
      console.error("Error loading roommates:", error);
      setError(error.message || "Failed to load roommates");
    }
  };

  const loadInvites = async () => {
    if (!house) return;
    
    try {
      const { data: inviteData, error: inviteError } = await supabase
        .from("invites")
        .select("*")
        .eq("house_id", house.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (inviteError) throw inviteError;
      setInvites(inviteData || []);
    } catch (error: any) {
      console.error("Error loading invites:", error);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!inviteEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from("house_members")
        .select("user_id")
        .eq("house_id", house.id)
        .limit(1);

      // Note: In a production app, you'd want to check if the email belongs to an existing user
      // For now, we'll just check if there's already a member with this email pattern
      // This is a simplified check - in reality you'd need a profiles table or admin API

      // Check if there's already a pending invite
      const { data: existingInvite } = await supabase
        .from("invites")
        .select("id")
        .eq("house_id", house.id)
        .eq("email", inviteEmail.trim())
        .eq("status", "pending")
        .single();

      if (existingInvite) {
        setError("An invite has already been sent to this email");
        setLoading(false);
        return;
      }

      // Create invite
      const token = crypto.randomUUID();
      const { error: inviteError } = await supabase.from("invites").insert({
        house_id: house.id,
        email: inviteEmail.trim(),
        token,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      });

      if (inviteError) throw inviteError;

      setInviteEmail("");
      await loadInvites();
      // TODO: Send email invite
    } catch (error: any) {
      console.error("Error sending invite:", error);
      setError(error.message || "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRoommate = async (memberId: string, userId: string) => {
    if (!confirm("Are you sure you want to remove this roommate? This action cannot be undone.")) {
      return;
    }

    if (userId === currentUserId) {
      setError("You cannot remove yourself");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use context method which handles optimistic updates
      await removeHouseMember(memberId);
      await loadRoommates();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error removing roommate:", error);
      setError(error.message || "Failed to remove roommate");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error: cancelError } = await supabase
        .from("invites")
        .update({ status: "expired" })
        .eq("id", inviteId);

      if (cancelError) throw cancelError;

      await loadInvites();
    } catch (error: any) {
      console.error("Error canceling invite:", error);
      setError(error.message || "Failed to cancel invite");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: "admin" | "member") => {
    setLoading(true);
    setError(null);

    try {
      // Use context method which handles optimistic updates
      await updateHouseMember(memberId, { role: newRole });
      await loadRoommates();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error changing role:", error);
      setError(error.message || "Failed to change role");
    } finally {
      setLoading(false);
    }
  };

  if (!house) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto frosted-glass bg-card/90 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light tracking-tight font-serif">
            Manage Roommates
          </DialogTitle>
          <DialogDescription className="text-base font-light">
            Add and manage roommates for {house.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-light">
              {error}
            </div>
          )}

          {/* Add Roommate Section */}
          {isAdmin && (
            <Card className="frosted-glass bg-card/40">
              <CardHeader>
                <CardTitle className="text-lg font-normal flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Invite Roommate
                </CardTitle>
                <CardDescription>
                  Send an email invite to add a new roommate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendInvite} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder="roommate@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="h-11 font-light"
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="h-11 font-normal">
                    {loading ? "Sending..." : "Send Invite"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Current Roommates */}
          <Card className="frosted-glass bg-card/40">
            <CardHeader>
              <CardTitle className="text-lg font-normal">Current Roommates</CardTitle>
              <CardDescription>
                {roommates.length} {roommates.length === 1 ? "roommate" : "roommates"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roommates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No roommates yet
                </p>
              ) : (
                <div className="space-y-2">
                  {roommates.map((roommate) => (
                    <div
                      key={roommate.id}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/10 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-normal">
                            {roommate.name?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-normal truncate">
                              {roommate.name}
                            </span>
                            {roommate.role === "admin" && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {roommate.email}
                          </div>
                        </div>
                      </div>
                      {isAdmin && roommate.user_id !== currentUserId && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleChangeRole(
                                roommate.id,
                                roommate.role === "admin" ? "member" : "admin"
                              )
                            }
                            disabled={loading}
                            className="h-8 text-xs"
                          >
                            {roommate.role === "admin" ? (
                              <>
                                <User className="h-3 w-3 mr-1" />
                                Make Member
                              </>
                            ) : (
                              <>
                                <Crown className="h-3 w-3 mr-1" />
                                Make Admin
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRoommate(roommate.id, roommate.user_id)}
                            disabled={loading}
                            className="h-8 text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Invites */}
          {isAdmin && invites.length > 0 && (
            <Card className="frosted-glass bg-card/40">
              <CardHeader>
                <CardTitle className="text-lg font-normal flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Pending Invites
                </CardTitle>
                <CardDescription>
                  {invites.length} {invites.length === 1 ? "invite" : "invites"} pending
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/10"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-normal">{invite.email}</div>
                          <div className="text-xs text-muted-foreground">
                            Sent {new Date(invite.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvite(invite.id)}
                        disabled={loading}
                        className="h-8 text-xs"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
