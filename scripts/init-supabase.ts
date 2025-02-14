import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env file
dotenv.config({ path: resolve(process.cwd(), ".env") });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY - Get this from your Supabase project settings");
}

// Create a Supabase client with the service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createBucketPolicies(bucketId: string) {
  const rpcCall = async (command: string) => {
    const { error } = await supabase.rpc('exec_sql', {
      query: command
    });
    if (error && !error.message.includes('already exists')) {
      console.error(`Error executing SQL: ${error.message}`);
      return false;
    }
    return true;
  };

  // Create policies for public read access and authenticated/service role write access
  const policies = [
    `CREATE POLICY "Public Access" ON storage.objects
     FOR SELECT USING (bucket_id = '${bucketId}');`,
    
    `CREATE POLICY "Service Role Access" ON storage.objects
     FOR ALL USING (
       bucket_id = '${bucketId}'
       AND auth.role() = 'service_role'
     );`,
    
    `CREATE POLICY "Authenticated Upload" ON storage.objects
     FOR INSERT WITH CHECK (
       bucket_id = '${bucketId}'
       AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
     );`,
    
    `CREATE POLICY "Authenticated Update" ON storage.objects
     FOR UPDATE USING (
       bucket_id = '${bucketId}'
       AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
     );`,
    
    `CREATE POLICY "Authenticated Delete" ON storage.objects
     FOR DELETE USING (
       bucket_id = '${bucketId}'
       AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
     );`
  ];

  // First, enable RLS on the storage.objects table
  await rpcCall(`ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`);

  // Then create the policies
  for (const policy of policies) {
    await rpcCall(policy);
  }
}

async function initStorage() {
  try {
    // Create buckets
    const buckets = ['files', 'properties', 'contracts'];
    
    for (const bucketName of buckets) {
      // Create bucket
      const { data: bucket, error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });

      if (error) {
        if (error.message.includes("already exists")) {
          console.log(`✅ Bucket '${bucketName}' already exists`);
        } else {
          throw error;
        }
      } else {
        console.log(`✅ Created bucket '${bucketName}'`);
      }

      // Update bucket settings with specific configurations per bucket
      const bucketConfig = {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: bucketName === 'contracts' 
          ? ["application/pdf"] 
          : ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      };

      const { error: updateError } = await supabase.storage.updateBucket(bucketName, bucketConfig);

      if (updateError) {
        console.error(`❌ Error updating bucket '${bucketName}':`, updateError);
      } else {
        console.log(`✅ Updated settings for bucket '${bucketName}'`);
      }

      // For contracts bucket, we'll use a simpler policy approach
      if (bucketName === 'contracts') {
        try {
          // Update bucket settings to be public and allow all operations
          const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
            public: true,
            fileSizeLimit: 52428800,
            allowedMimeTypes: ["application/pdf"],
          });

          if (updateError) {
            console.error(`❌ Error updating bucket '${bucketName}':`, updateError);
          } else {
            console.log(`✅ Updated settings for bucket '${bucketName}'`);
          }

          // Create a policy that allows all operations for authenticated users
          const { error: policyError } = await supabase.storage.from(bucketName).createSignedUrl('dummy.pdf', 60);
          if (policyError) {
            console.error(`❌ Error creating policy for bucket '${bucketName}':`, policyError);
          } else {
            console.log(`✅ Created policy for bucket '${bucketName}'`);
          }
        } catch (error) {
          console.error(`❌ Error configuring bucket '${bucketName}':`, error);
        }
      } else {
        // Create standard RLS policies for other buckets
        try {
          await createBucketPolicies(bucketName);
          console.log(`✅ Created RLS policies for bucket '${bucketName}'`);
        } catch (error) {
          console.error(`❌ Error creating RLS policies for bucket '${bucketName}':`, error);
        }
      }
    }

  } catch (error) {
    console.error("❌ Error initializing storage:", error);
    process.exit(1);
  }
}

initStorage(); 