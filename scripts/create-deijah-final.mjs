#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.development.local');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  Object.assign(process.env, envConfig);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('[v0] Missing SUPABASE_URL or SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('[v0] Creating Deijah Blanks account...');
console.log('[v0] Supabase URL:', SUPABASE_URL);

async function createDeijahAccount() {
  try {
    // First check if user exists
    console.log('[v0] Checking if Deijah already exists...');
    
    const listResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!listResponse.ok) {
      const error = await listResponse.text();
      console.error('[v0] List users error:', error);
    } else {
      const usersData = await listResponse.json();
      const deijah = usersData.users?.find(u => u.email === 'deijah@byred.io');
      if (deijah) {
        console.log('[v0] ✓ Deijah already exists!');
        console.log('[v0] Email:', deijah.email);
        console.log('[v0] ID:', deijah.id);
        console.log('[v0] Created at:', deijah.created_at);
        return;
      }
    }

    // Create new user
    console.log('[v0] Creating new account for Deijah Blanks...');
    
    const createResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'deijah@byred.io',
        password: 'Lantern26',
        email_confirm: true,
        user_metadata: {
          name: 'Deijah Blanks',
          role: 'employee',
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      console.error('[v0] Create user error:', error);
      process.exit(1);
    }

    const newUser = await createResponse.json();
    console.log('\n[v0] ✓ ACCOUNT CREATED SUCCESSFULLY\n');
    console.log('[v0] Email: deijah@byred.io');
    console.log('[v0] Password: Lantern26');
    console.log('[v0] User ID:', newUser.id);
    console.log('[v0] Email confirmed: true');
    console.log('\n[v0] Deijah can now login at /login\n');

  } catch (error) {
    console.error('[v0] Error:', error.message);
    process.exit(1);
  }
}

createDeijahAccount();
