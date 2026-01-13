"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./UserContext";

interface House {
  id: string;
  name: string;
  address: string | null;
  timezone: string;
  created_by: string;
  created_at: string;
}

interface HouseMember {
  id: string;
  house_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  can_see_others_balances: boolean;
}

interface HouseContextType {
  house: House | null;
  houses: House[];
  houseMembers: HouseMember[];
  loading: boolean;
  refreshHouse: () => Promise<void>;
  refreshHouseMembers: () => Promise<void>;
  updateHouse: (updates: Partial<House>) => Promise<void>;
  updateHouseMember: (memberId: string, updates: Partial<HouseMember>) => Promise<void>;
  addHouseMember: (memberData: Omit<HouseMember, "id" | "joined_at">) => Promise<void>;
  removeHouseMember: (memberId: string) => Promise<void>;
  setSelectedHouse: (houseId: string | null) => void;
}

const HouseContext = createContext<HouseContextType | undefined>(undefined);

export function HouseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [house, setHouse] = useState<House | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [houseMembers, setHouseMembers] = useState<HouseMember[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const currentHouseIdRef = useRef<string | null>(null);

  const refreshHouse = useCallback(async () => {
    if (!user) {
      setHouse(null);
      setHouses([]);
      setHouseMembers([]);
      currentHouseIdRef.current = null;
      return;
    }

    try {
      // Get user's houses via house_members
      const { data: memberships, error: membersError } = await supabase
        .from("house_members")
        .select("house_id, role, house:houses(*)")
        .eq("user_id", user.id);

      if (membersError) throw membersError;

      const userHouses = (memberships || [])
        .map((m: any) => m.house)
        .filter(Boolean) as House[];

      setHouses(userHouses);

      // If we have a selected house, make sure it's still in the list
      // Otherwise, select the first house
      if (userHouses.length > 0) {
        const currentHouseId = currentHouseIdRef.current;
        const foundHouse = userHouses.find((h) => h.id === currentHouseId);
        if (currentHouseId && foundHouse) {
          // Current house still exists, use the NEW house object from the database
          // This ensures we have the latest data, not stale closure data
          setHouse(foundHouse);
          currentHouseIdRef.current = foundHouse.id;
        } else {
          // Select first house
          setHouse(userHouses[0]);
          currentHouseIdRef.current = userHouses[0].id;
        }
      } else {
        setHouse(null);
        currentHouseIdRef.current = null;
      }
    } catch (error) {
      console.error("Error refreshing house:", error);
      setHouse(null);
      setHouses([]);
      currentHouseIdRef.current = null;
    }
  }, [user, supabase]);

  const refreshHouseMembers = useCallback(async () => {
    if (!house) {
      setHouseMembers([]);
      return;
    }

    try {
      const { data: members, error: membersError } = await supabase
        .from("house_members")
        .select("*")
        .eq("house_id", house.id)
        .order("joined_at", { ascending: true });

      if (membersError) throw membersError;

      setHouseMembers((members || []) as HouseMember[]);
    } catch (error) {
      console.error("Error refreshing house members:", error);
      setHouseMembers([]);
    }
  }, [house, supabase]);

  const updateHouse = useCallback(
    async (updates: Partial<House>) => {
      if (!house) return;

      // Store the previous house state for rollback on error
      const previousHouse = house;
      const previousHouses = houses;

      try {
        // Optimistically update local state
        const updatedHouse = { ...house, ...updates };
        setHouse(updatedHouse);
        setHouses((prev) =>
          prev.map((h) => (h.id === house.id ? updatedHouse : h))
        );

        // Update in Supabase
        const { error: updateError } = await supabase
          .from("houses")
          .update(updates)
          .eq("id", house.id);

        if (updateError) {
          throw updateError;
        }

        // Don't refresh - we've already optimistically updated
        // This prevents unnecessary state changes that cause flickering
      } catch (error) {
        console.error("Error updating house:", error);
        // Revert optimistic update on error
        setHouse(previousHouse);
        setHouses(previousHouses);
        throw error;
      }
    },
    [house, houses, supabase]
  );

  const updateHouseMember = useCallback(
    async (memberId: string, updates: Partial<HouseMember>) => {
      try {
        // Optimistically update local state
        setHouseMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, ...updates } : m))
        );

        // Update in Supabase
        const { error: updateError } = await supabase
          .from("house_members")
          .update(updates)
          .eq("id", memberId);

        if (updateError) {
          throw updateError;
        }

        // Refresh to get server response
        await refreshHouseMembers();
      } catch (error) {
        console.error("Error updating house member:", error);
        // Revert optimistic update on error
        await refreshHouseMembers();
        throw error;
      }
    },
    [supabase, refreshHouseMembers]
  );

  const addHouseMember = useCallback(
    async (memberData: Omit<HouseMember, "id" | "joined_at">) => {
      try {
        // Add to Supabase
        const { data: newMember, error: insertError } = await supabase
          .from("house_members")
          .insert(memberData)
          .select()
          .single();

        if (insertError) throw insertError;

        // Refresh to get all members
        await refreshHouseMembers();
      } catch (error) {
        console.error("Error adding house member:", error);
        throw error;
      }
    },
    [supabase, refreshHouseMembers]
  );

  const removeHouseMember = useCallback(
    async (memberId: string) => {
      try {
        // Remove from Supabase
        const { error: deleteError } = await supabase
          .from("house_members")
          .delete()
          .eq("id", memberId);

        if (deleteError) throw deleteError;

        // Optimistically update local state
        setHouseMembers((prev) => prev.filter((m) => m.id !== memberId));

        // Refresh to ensure consistency
        await refreshHouseMembers();
      } catch (error) {
        console.error("Error removing house member:", error);
        // Revert optimistic update on error
        await refreshHouseMembers();
        throw error;
      }
    },
    [supabase, refreshHouseMembers]
  );

  const setSelectedHouse = useCallback((houseId: string | null) => {
    if (houseId === null) {
      setHouse(null);
      setHouseMembers([]);
      currentHouseIdRef.current = null;
      return;
    }

    const selected = houses.find((h) => h.id === houseId);
    if (selected) {
      setHouse(selected);
      currentHouseIdRef.current = houseId;
    }
  }, [houses]);

  // Load houses when user is available
  useEffect(() => {
    let mounted = true;
    
    if (!user) {
      setHouse(null);
      setHouses([]);
      setHouseMembers([]);
      setLoading(false);
      return;
    }

    async function loadData() {
      setLoading(true);
      try {
        await refreshHouse();
      } catch (error) {
        console.error("Error loading house data:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    
    return () => {
      mounted = false;
    };
  }, [user, refreshHouse]);

  // Load house members when house changes
  useEffect(() => {
    if (house) {
      refreshHouseMembers();
    } else {
      setHouseMembers([]);
    }
  }, [house, refreshHouseMembers]);

  return (
    <HouseContext.Provider
      value={{
        house,
        houses,
        houseMembers,
        loading,
        refreshHouse,
        refreshHouseMembers,
        updateHouse,
        updateHouseMember,
        addHouseMember,
        removeHouseMember,
        setSelectedHouse,
      }}
    >
      {children}
    </HouseContext.Provider>
  );
}

export function useHouse() {
  const context = useContext(HouseContext);
  if (context === undefined) {
    throw new Error("useHouse must be used within a HouseProvider");
  }
  return context;
}
