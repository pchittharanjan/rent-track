"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

interface UserContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateUserMetadata: (metadata: Record<string, any>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(currentUser);
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
    }
  }, [supabase]);

  const updateUserMetadata = useCallback(async (metadata: Record<string, any>) => {
    try {
      // Optimistically update local state
      if (user) {
        setUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            ...metadata,
          },
        });
      }

      // Update in Supabase (fire and forget - we'll sync via auth state listener)
      supabase.auth.updateUser({ data: metadata }).then(({ data: updatedUser, error }) => {
        if (error) {
          console.error("Error updating user metadata:", error);
          // Revert optimistic update on error
          refreshUser();
        } else if (updatedUser?.user) {
          // Update with actual data from server
          setUser(updatedUser.user);
        }
      }).catch((error) => {
        console.error("Exception updating user metadata:", error);
        // Refresh to get correct state
        refreshUser();
      });
    } catch (error) {
      console.error("Error in updateUserMetadata:", error);
      refreshUser();
    }
  }, [user, supabase, refreshUser]);

  useEffect(() => {
    let mounted = true;
    
    // Initial load
    refreshUser().finally(() => {
      if (mounted) setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        if (session?.user) {
          setUser(session.user);
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, refreshUser]);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, updateUserMetadata }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
