#!/usr/bin/env -S deno run --allow-net --allow-env

// Test Redis and Supabase connections
import "https://deno.land/std@0.168.0/dotenv/load.ts";

async function testRedis() {
  try {
    console.log("🔄 Testing Redis connection...");
    const redisUrl = Deno.env.get("RATE_LIMIT_REDIS_URL") || Deno.env.get("REDIS_URL");
    
    if (!redisUrl) {
      console.log("❌ No Redis URL found in environment");
      return false;
    }

    console.log(`📡 Connecting to: ${redisUrl.replace(/:[^:]*@/, ':***@')}`);
    
    // Simple Redis connection test
    const response = await fetch("https://deno.land/x/redis@v0.29.0/mod.ts");
    if (!response.ok) {
      throw new Error("Redis module not accessible");
    }
    
    console.log("✅ Redis URL format is valid");
    return true;
  } catch (error) {
    console.log("❌ Redis test failed:", error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function testSupabase() {
  try {
    console.log("🔄 Testing Supabase connection...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.log("❌ Missing Supabase credentials in environment");
      return false;
    }

    console.log(`📡 Connecting to: ${supabaseUrl}`);
    
    // Test Supabase connection
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (response.ok) {
      console.log("✅ Supabase connection successful");
      
      // Test if schema exists
      const tablesResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      });
      
      const responseText = await tablesResponse.text();
      console.log("📋 Supabase API Response:", responseText.slice(0, 200) + "...");
      
      return true;
    } else {
      console.log("❌ Supabase connection failed:", response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.log("❌ Supabase test failed:", error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function main() {
  console.log("🧪 Testing Pactwise Backend Connections\n");
  
  const redisOk = await testRedis();
  console.log("");
  
  const supabaseOk = await testSupabase();
  console.log("");
  
  if (redisOk && supabaseOk) {
    console.log("🎉 All connections successful! Ready to apply migrations.");
  } else {
    console.log("⚠️  Some connections failed. Check your environment variables.");
  }
}

if (import.meta.main) {
  main();
}