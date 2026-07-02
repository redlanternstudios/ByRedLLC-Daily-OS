#!/usr/bin/env node

/**
 * Script to create Deijah Blanks employee account
 * Usage: node scripts/create-employee-deijah.mjs
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
  process.exit(1)
}

// Import Supabase admin client
const { createClient } = await import("@supabase/supabase-js")

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const EMPLOYEE_ACCOUNT = {
  email: "deijah@byred.io",
  password: "Lantern26",
  name: "Deijah Blanks",
  role: "member",
  tenantIds: [], // Will be assigned after creation
}

async function createDeijahAccount() {
  try {
    console.log(`Creating account for ${EMPLOYEE_ACCOUNT.name}...`)

    // Create auth user
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: EMPLOYEE_ACCOUNT.email,
      password: EMPLOYEE_ACCOUNT.password,
      email_confirm: true,
    })

    if (authError) {
      console.error("Auth creation error:", authError.message)
      process.exit(1)
    }

    console.log(`✓ Auth user created: ${authUser.id}`)

    // Create byred_users profile
    const { data: profile, error: profileError } = await admin
      .from("byred_users")
      .insert({
        auth_user_id: authUser.id,
        name: EMPLOYEE_ACCOUNT.name,
        email: EMPLOYEE_ACCOUNT.email,
        role: EMPLOYEE_ACCOUNT.role,
        active: true,
      })
      .select()
      .single()

    if (profileError) {
      console.error("Profile creation error:", profileError.message)
      process.exit(1)
    }

    console.log(`✓ Profile created: ${profile.id}`)

    // Fetch all tenants to assign
    const { data: tenants, error: tenantError } = await admin
      .from("byred_tenants")
      .select("id, name")
      .eq("active", true)

    if (tenantError) {
      console.error("Tenant fetch error:", tenantError.message)
      process.exit(1)
    }

    console.log(`Found ${tenants.length} active tenants`)

    // Assign to all active tenants
    if (tenants.length > 0) {
      const assignments = tenants.map((tenant) => ({
        user_id: profile.id,
        tenant_id: tenant.id,
        role: "member",
      }))

      const { error: assignError } = await admin
        .from("byred_user_tenants")
        .insert(assignments)

      if (assignError) {
        console.error("Tenant assignment error:", assignError.message)
        process.exit(1)
      }

      console.log(`✓ Assigned to ${tenants.length} tenants:`)
      tenants.forEach((t) => console.log(`  - ${t.name}`))
    }

    console.log("\n=== DEIJAH BLANKS ACCOUNT CREATED ===")
    console.log(`Email: ${EMPLOYEE_ACCOUNT.email}`)
    console.log(`Password: ${EMPLOYEE_ACCOUNT.password}`)
    console.log(`Name: ${EMPLOYEE_ACCOUNT.name}`)
    console.log(`User ID: ${profile.id}`)
    console.log(`Auth ID: ${authUser.id}`)
    console.log("\nAccount is ready to use!")
  } catch (error) {
    console.error("Error:", error.message)
    process.exit(1)
  }
}

createDeijahAccount()
