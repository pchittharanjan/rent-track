"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useHouse(houseId: string | null) {
  const [house, setHouse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!houseId) {
      setLoading(false);
      return;
    }

    async function fetchHouse() {
      try {
        const { data, error } = await supabase
          .from("houses")
          .select("*")
          .eq("id", houseId)
          .single();

        if (error) throw error;
        setHouse(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchHouse();
  }, [houseId, supabase]);

  return { house, loading, error };
}
