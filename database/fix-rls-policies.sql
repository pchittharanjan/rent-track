-- Fix RLS Policies for house_members (fix infinite recursion)
-- Run this in Supabase SQL Editor after the main schema

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view members of their houses" ON house_members;
DROP POLICY IF EXISTS "Admins can add members" ON house_members;
DROP POLICY IF EXISTS "Admins can update members" ON house_members;

-- Create a helper function to check if user is member of a house
-- This avoids recursion by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_house_member(house_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM house_members 
    WHERE house_id = house_uuid AND user_id = user_uuid
  );
$$;

-- Create a helper function to check if user is admin of a house
CREATE OR REPLACE FUNCTION is_house_admin(house_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM house_members 
    WHERE house_id = house_uuid AND user_id = user_uuid AND role = 'admin'
  );
$$;

-- New policy: Users can view members of houses they belong to
CREATE POLICY "Users can view members of their houses"
  ON house_members FOR SELECT
  USING (is_house_member(house_id, auth.uid()));

-- New policy: Allow users to see their own membership (needed for initial house creation)
CREATE POLICY "Users can see their own membership"
  ON house_members FOR SELECT
  USING (user_id = auth.uid());

-- New policy: Admins can add members (uses function to avoid recursion)
CREATE POLICY "Admins can add members"
  ON house_members FOR INSERT
  WITH CHECK (is_house_admin(house_id, auth.uid()));

-- New policy: House creators can add themselves (for initial setup)
CREATE POLICY "House creators can add themselves"
  ON house_members FOR INSERT
  WITH CHECK (
    house_id IN (
      SELECT id FROM houses WHERE created_by = auth.uid()
    ) AND user_id = auth.uid()
  );

-- New policy: Admins can update members
CREATE POLICY "Admins can update members"
  ON house_members FOR UPDATE
  USING (is_house_admin(house_id, auth.uid()));
