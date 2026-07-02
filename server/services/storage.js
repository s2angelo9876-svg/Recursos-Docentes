import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "recursos-uploads";

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorios para el almacenamiento de archivos."
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export function isStorageEnabled() {
  return true;
}

export function getBucketName() {
  return bucketName;
}

export async function uploadFile(fileBuffer, filename, mimetype) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filename, fileBuffer, {
      contentType: mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(`Error al subir archivo a Supabase: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return {
    url: publicUrlData.publicUrl,
    filename: data.path,
    storage: "supabase",
  };
}

export async function deleteFile(fileUrl) {
  if (!fileUrl || !fileUrl.includes(supabaseUrl)) {
    return;
  }

  const urlObj = new URL(fileUrl);
  const pathSegments = urlObj.pathname.split("/");
  const bucketIndex = pathSegments.findIndex((s) => s === bucketName);
  const filePath = bucketIndex >= 0 ? pathSegments.slice(bucketIndex + 1).join("/") : null;

  if (filePath) {
    const { error } = await supabase.storage.from(bucketName).remove([filePath]);
    if (error) {
      console.warn(`No se pudo eliminar archivo de Supabase: ${error.message}`);
    }
  }
}
