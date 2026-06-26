import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "recursos-uploads";

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

export function isStorageEnabled() {
  return Boolean(supabase);
}

export function getBucketName() {
  return bucketName;
}

export async function uploadFile(fileBuffer, filename, mimetype, uploadDir) {
  if (supabase) {
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

  // Fallback a disco local
  if (!uploadDir) {
    throw new Error("No está configurado Supabase Storage ni se proporcionó uploadDir.");
  }

  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, fileBuffer);

  return {
    url: `/uploads/${filename}`,
    filename,
    storage: "local",
  };
}

export async function deleteFile(fileUrl, uploadDir) {
  if (!fileUrl) return;

  if (supabase && fileUrl.includes(supabaseUrl)) {
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
    return;
  }

  // Fallback a disco local
  if (fileUrl.startsWith("/uploads/") && uploadDir) {
    const fileName = fileUrl.replace("/uploads/", "");
    const filePath = path.join(uploadDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
