# Fix RLS Policy Recursion Issue

## Problem
The RLS policies for `house_members` table were causing infinite recursion because they were checking the `house_members` table to determine if users could access the `house_members` table.

## Solution
Run the fix SQL script that uses SECURITY DEFINER functions to avoid recursion.

## Steps to Fix

1. **Go to Supabase SQL Editor**
   - Open your project dashboard
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

2. **Run the fix script**
   - Open the file `database/fix-rls-policies.sql`
   - Copy all the SQL
   - Paste it into the SQL Editor
   - Click "Run" (or press Cmd+Enter / Ctrl+Enter)

3. **Verify it worked**
   - You should see "Success. No rows returned"
   - Try running the test again or start the dev server

## What the Fix Does

The fix:
- Drops the problematic recursive policies
- Creates helper functions (`is_house_member` and `is_house_admin`) that use SECURITY DEFINER to bypass RLS
- Creates new policies that use these functions instead of direct table queries
- Adds a policy for house creators to add themselves (needed for onboarding)

This resolves the recursion issue while maintaining security.
