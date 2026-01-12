-- Fix RLS Policy for House Creation
-- Run this in Supabase SQL Editor

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Users can create houses" ON houses;

-- Recreate the policy to ensure it works correctly
CREATE POLICY "Users can create houses"
  ON houses FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Also need to ensure users can SELECT their newly created house
-- before they're added as a member (for the .select() after insert)
DROP POLICY IF EXISTS "Users can view houses they created" ON houses;

CREATE POLICY "Users can view houses they created"
  ON houses FOR SELECT
  USING (created_by = auth.uid() OR id IN (
    SELECT house_id FROM house_members WHERE user_id = auth.uid()
  ));
