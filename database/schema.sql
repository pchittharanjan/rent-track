-- Rent Tracking Database Schema
-- This SQL should be run in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Houses table
CREATE TABLE houses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- House members table
CREATE TABLE house_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  can_see_others_balances BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(house_id, user_id)
);

-- Categories table (rent, utilities, etc.)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'utility' CHECK (type IN ('rent', 'utility', 'other')),
  billing_type TEXT NOT NULL DEFAULT 'flat' CHECK (billing_type IN ('flat', 'usage', 'mixed')),
  recurrence TEXT, -- e.g., 'monthly', 'weekly', null for one-time
  is_free BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Providers table
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  external_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Charges table
CREATE TABLE charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  description TEXT NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  bill_period_start DATE,
  bill_period_end DATE,
  split_method TEXT NOT NULL DEFAULT 'equal' CHECK (split_method IN ('equal', 'custom_fixed', 'custom_percentage', 'one_person')),
  recurrence_id UUID, -- Reference to a recurring charge template (future feature)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Charge shares table (per-person splits for each charge)
CREATE TABLE charge_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  charge_id UUID NOT NULL REFERENCES charges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  percentage DECIMAL(5, 2), -- Nullable, calculated for display
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(charge_id, user_id)
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  payer_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_id UUID REFERENCES auth.users(id), -- NULL if payment to provider
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method_label TEXT, -- e.g., "Venmo", "Zelle", "Portal", "Check"
  link_to_external_payment_page TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment-Charge links table (many-to-many)
CREATE TABLE payment_charge_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  charge_id UUID NOT NULL REFERENCES charges(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payment_id, charge_id)
);

-- Invites table
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  email TEXT,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rent configurations table (per-roommate rent amounts set during onboarding)
CREATE TABLE rent_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  percentage DECIMAL(5, 2), -- Calculated percentage of total
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(house_id, category_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_house_members_house_id ON house_members(house_id);
CREATE INDEX idx_house_members_user_id ON house_members(user_id);
CREATE INDEX idx_categories_house_id ON categories(house_id);
CREATE INDEX idx_providers_house_id ON providers(house_id);
CREATE INDEX idx_providers_category_id ON providers(category_id);
CREATE INDEX idx_charges_house_id ON charges(house_id);
CREATE INDEX idx_charges_category_id ON charges(category_id);
CREATE INDEX idx_charges_due_date ON charges(due_date);
CREATE INDEX idx_charge_shares_charge_id ON charge_shares(charge_id);
CREATE INDEX idx_charge_shares_user_id ON charge_shares(user_id);
CREATE INDEX idx_payments_house_id ON payments(house_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_recipient_id ON payments(recipient_id);
CREATE INDEX idx_payments_category_id ON payments(category_id);
CREATE INDEX idx_payments_date ON payments(date);
CREATE INDEX idx_payment_charge_links_payment_id ON payment_charge_links(payment_id);
CREATE INDEX idx_payment_charge_links_charge_id ON payment_charge_links(charge_id);
CREATE INDEX idx_invites_house_id ON invites(house_id);
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_status ON invites(status);
CREATE INDEX idx_rent_configurations_house_id ON rent_configurations(house_id);
CREATE INDEX idx_rent_configurations_category_id ON rent_configurations(category_id);
CREATE INDEX idx_rent_configurations_user_id ON rent_configurations(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE charge_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_charge_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for houses
CREATE POLICY "Users can view houses they are members of"
  ON houses FOR SELECT
  USING (
    id IN (
      SELECT house_id FROM house_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create houses"
  ON houses FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their houses"
  ON houses FOR UPDATE
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT house_id FROM house_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for house_members
CREATE POLICY "Users can view members of their houses"
  ON house_members FOR SELECT
  USING (
    house_id IN (
      SELECT house_id FROM house_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can add members"
  ON house_members FOR INSERT
  WITH CHECK (
    house_id IN (
      SELECT house_id FROM house_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update members"
  ON house_members FOR UPDATE
  USING (
    house_id IN (
      SELECT house_id FROM house_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for categories
CREATE POLICY "Users can view categories in their houses"
  ON categories FOR SELECT
  USING (
    house_id IN (
      SELECT house_id FROM house_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (
    house_id IN (
      SELECT house_id FROM house_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Similar RLS policies for other tables...
-- (Full RLS implementation would continue for providers, charges, payments, etc.)
-- For brevity, I'll add a few key ones:

-- RLS Policies for charges
CREATE POLICY "Users can view charges in their houses"
  ON charges FOR SELECT
  USING (
    house_id IN (
      SELECT house_id FROM house_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create charges"
  ON charges FOR INSERT
  WITH CHECK (
    house_id IN (
      SELECT house_id FROM house_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for payments
CREATE POLICY "Users can view payments in their houses"
  ON payments FOR SELECT
  USING (
    house_id IN (
      SELECT house_id FROM house_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create payments"
  ON payments FOR INSERT
  WITH CHECK (
    house_id IN (
      SELECT house_id FROM house_members WHERE user_id = auth.uid()
    ) AND
    payer_id = auth.uid()
  );

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_houses_updated_at BEFORE UPDATE ON houses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_charges_updated_at BEFORE UPDATE ON charges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rent_configurations_updated_at BEFORE UPDATE ON rent_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
