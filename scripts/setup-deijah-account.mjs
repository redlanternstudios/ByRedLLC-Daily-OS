#!/usr/bin/env node

/**
 * Setup Deijah Blanks account in Supabase Auth
 * Run: node scripts/setup-deijah-account.mjs
 */

import { createAdminClient } from '../lib/supabase/admin.ts';

const DEIJAH_EMAIL = 'deijah@byred.io';
const DEIJAH_PASSWORD = 'Lantern26';

async function setupDeijahAccount() {
  try {
    console.log('[v0] Setting up Deijah Blanks account...');
    
    const admin = createAdminClient();
    
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
      return existingDeijah;
    }
    
    // Create new account
    console.log('[v0] Creating new Deijah Blanks account...');
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: DEIJAH_EMAIL,
      password: DEIJAH_PASSWORD,
      email_confirm: true, // Auto-confirm email
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
