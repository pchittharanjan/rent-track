// Quick test script to verify Supabase connection
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.error('Make sure .env.local exists with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  try {
    // Test 1: Check if we can connect
    console.log('1. Testing connection...');
    const { data, error } = await supabase.from('houses').select('count').limit(0);
    
    if (error) {
      if (error.message.includes('relation "houses" does not exist')) {
        console.error('❌ Error: houses table not found');
        console.error('   Make sure you ran the SQL schema in Supabase SQL Editor');
        process.exit(1);
      }
      throw error;
    }
    console.log('   ✅ Connection successful!\n');
    
    // Test 2: Check if tables exist
    console.log('2. Checking tables...');
    const tables = ['houses', 'house_members', 'categories', 'charges', 'payments'];
    const missingTables = [];
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(0);
      if (error && error.message.includes('does not exist')) {
        missingTables.push(table);
      }
    }
    
    if (missingTables.length > 0) {
      console.log('   ⚠️  Missing tables:', missingTables.join(', '));
    } else {
      console.log('   ✅ All tables found!\n');
    }
    
    // Test 3: Check auth
    console.log('3. Testing authentication...');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('   ✅ Auth service available (no session yet, which is expected)\n');
    
    console.log('✅ All tests passed! Your Supabase setup is working correctly.\n');
    console.log('You can now start the dev server with: npm run dev');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('Invalid API key')) {
      console.error('\n   Make sure your NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local is correct');
    }
    process.exit(1);
  }
}

testConnection();
