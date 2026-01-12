# Supabase Setup Guide

## Getting Your Supabase Credentials

1. **Go to your Supabase Dashboard:**
   - Visit https://supabase.com/dashboard
   - Select your "rent tracking" project

2. **Get Your Project URL:**
   - Go to **Settings** → **API**
   - Copy the **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)

3. **Get Your Anon/Public Key:**
   - Still in **Settings** → **API**
   - Copy the **anon public** key (starts with `eyJhbGc...`)

## Setting Up Environment Variables

1. **Create `.env.local` file** in the project root:
   ```bash
   touch .env.local
   ```

2. **Add your credentials** to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   ⚠️ **Important:** Never commit `.env.local` to git (it's already in `.gitignore`)

## Setting Up the Database Schema

1. **Open SQL Editor in Supabase:**
   - Go to your project dashboard
   - Click on **SQL Editor** in the left sidebar

2. **Run the Schema:**
   - Open the file `database/schema.sql` in this project
   - Copy the entire SQL script
   - Paste it into the SQL Editor in Supabase
   - Click **Run** (or press Cmd/Ctrl + Enter)

3. **Verify Tables Were Created:**
   - Go to **Table Editor** in Supabase
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

## Testing the Connection

Once you've set up `.env.local`, you can test the connection by:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Try signing up:**
   - Go to http://localhost:3000
   - Click "Create Account"
   - Fill in the form and submit
   - You should be redirected to the onboarding wizard

## Security Notes

- The **anon key** is safe to use in client-side code (it's public)
- Row Level Security (RLS) policies protect your data
- Never share your **service_role** key (we don't need it for this app)

## Need Help?

If you run into any issues:
1. Check that your `.env.local` file exists and has the correct values
2. Make sure the SQL schema ran successfully
3. Check the browser console for any errors
4. Check Supabase logs in the dashboard
