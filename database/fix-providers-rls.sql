-- Fix RLS Policies for providers table
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view providers in their houses" ON providers;
DROP POLICY IF EXISTS "Admins can manage providers" ON providers;
DROP POLICY IF EXISTS "Members can create providers" ON providers;

-- Policy: Users can view providers in their houses
CREATE POLICY "Users can view providers in their houses"
  ON providers FOR SELECT
  USING (
    house_id IN (
      SELECT house_id FROM house_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Members can create providers for their houses
CREATE POLICY "Members can create providers"
  ON providers FOR INSERT
  WITH CHECK (
    house_id IN (
      SELECT house_id FROM house_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can update providers in their houses
CREATE POLICY "Admins can update providers"
  ON providers FOR UPDATE
  USING (
    house_id IN (
      SELECT house_id FROM house_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete providers in their houses
CREATE POLICY "Admins can delete providers"
  ON providers FOR DELETE
  USING (
    house_id IN (
      SELECT house_id FROM house_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
