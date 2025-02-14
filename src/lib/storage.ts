import { supabase } from "./supabase";

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | Blob | string,
) {
  const { data, error } = await supabase.storage
    .from("files")
    .upload(key, body, {
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data: publicUrl } = supabase.storage
    .from("files")
    .getPublicUrl(data.path);

  return publicUrl.publicUrl;
}
