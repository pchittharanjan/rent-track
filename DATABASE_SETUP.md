# Database Setup Instructions

## Quick Setup Guide

1. **Go to your Supabase project dashboard**
   - Visit: https://supabase.com/dashboard/project/dclkdhfmiyqtripczito

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query" button

3. **Copy and paste the SQL below**

4. **Run the SQL**
   - Click the "Run" button (or press Cmd+Enter / Ctrl+Enter)
   - Wait for it to complete (should take a few seconds)

5. **Verify tables were created**
   - Go to "Table Editor" in the left sidebar
   - You should see these tables:
     - houses
     - house_members
     - categories
     - providers
     - charges
     - charge_shares
     - payments
     - payment_charge_links
     - invites
     - rent_configurations

## The SQL Script

The complete SQL script is in `database/schema.sql` - just copy the entire file contents and paste into the SQL Editor.

## After Running the Schema

Once the SQL has run successfully, you can:

1. **Test the app:**
   ```bash
   npm run dev
   ```

2. **Visit http://localhost:3000**

3. **Try signing up** - create an account and go through onboarding

## Troubleshooting

- If you get errors, make sure you're in the SQL Editor (not the query builder)
- The SQL uses `CREATE EXTENSION IF NOT EXISTS` so it's safe to run multiple times
- If a table already exists, you might need to drop it first (but usually not necessary on a fresh project)
