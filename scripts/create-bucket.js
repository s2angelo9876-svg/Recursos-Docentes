import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "recursos-uploads";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const { data, error } = await supabase.storage.createBucket(bucketName, {
  public: true,
});

if (error) {
  if (error.message.includes("already exists") || error.message.includes("Bucket already exists")) {
    console.log(`El bucket '${bucketName}' ya existe.`);
    process.exit(0);
  }
  console.error("Error al crear bucket:", error.message);
  process.exit(1);
}

console.log(`Bucket '${bucketName}' creado:`, data);
