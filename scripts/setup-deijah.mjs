#!/usr/bin/env node

/**
 * Setup Deijah Blanks account using Supabase Admin API
 * Run: node scripts/setup-deijah.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEIJAH_EMAIL = 'deijah@byred.io';
const DEIJAH_PASSWORD = 'Lantern26';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[v0] Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function setupDeijahAccount() {
  try {
    console.log('[v0] Setting up Deijah Blanks account...');
    
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Check if account already exists
    console.log('[v0] Checking if account exists...');
    const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }
    
    const existingDeijah = existingUsers.users.find(u => u.email === DEIJAH_EMAIL);
    
    if (existingDeijah) {
      console.log('[v0] ✓ Deijah account already exists');
      console.log(`  Email: ${existingDeijah.email}`);
      console.log(`  UID: ${existingDeijah.id}`);
      console.log(`  Created: ${existingDeijah.created_at}`);
      console.log(`  Email confirmed: ${existingDeijah.email_confirmed_at ? 'YES' : 'NO'}`);
      console.log('');
      console.log('Login details:');
      console.log(`  Email: ${DEIJAH_EMAIL}`);
      console.log(`  Password: ${DEIJAH_PASSWORD}`);
      console.log('');
      console.log('✓ Ready to login at: /login');
      return existingDeijah;
    }
    
    // Create new account
    console.log('[v0] Creating new Deijah Blanks account...');
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: DEIJAH_EMAIL,
      password: DEIJAH_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: 'Deijah Blanks',
        role: 'employee',
      },
    });
    
    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }
    
    console.log('[v0] ✓ Account created successfully');
    console.log(`  Email: ${newUser.email}`);
    console.log(`  UID: ${newUser.id}`);
    console.log(`  Password: ${DEIJAH_PASSWORD}`);
    console.log(`  Email confirmed: YES`);
    console.log('');
    console.log('Login details:');
    console.log(`  Email: ${DEIJAH_EMAIL}`);
    console.log(`  Password: ${DEIJAH_PASSWORD}`);
    console.log('');
    console.log('✓ Ready to login at: /login');
    
    return newUser;
  } catch (error) {
    console.error('[v0] Error setting up account:', error.message);
    process.exit(1);
  }
}

setupDeijahAccount();
