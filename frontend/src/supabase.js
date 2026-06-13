const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Comprime imagem para JPEG máx 400x400 ~20-40KB
function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 400;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = (h * MAX) / w; w = MAX; } }
      else { if (h > MAX) { w = (w * MAX) / h; h = MAX; } }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => { URL.revokeObjectURL(url); resolve(blob); }, "image/jpeg", 0.72);
    };
    img.src = url;
  });
}

export async function uploadAvatar(file, folder, id) {
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_SIZE = 5 * 1024 * 1024;
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Apenas JPEG, PNG e WebP são permitidos");
  if (file.size > MAX_SIZE) throw new Error("Arquivo muito grande (máx 5MB)");
  const blob = await compressImage(file);
  const path = `${folder}/${id}.jpg`;
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/avatars/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
      },
      body: blob,
    }
  );
  if (!res.ok) {
    // tenta PUT (upsert via POST pode falhar se já existe)
    const res2 = await fetch(
      `${SUPABASE_URL}/storage/v1/object/avatars/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "image/jpeg",
        },
        body: blob,
      }
    );
    if (!res2.ok) throw new Error("Upload falhou");
  }
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

export async function removeAvatar(folder, id) {
  const path = `${folder}/${id}.jpg`;
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/avatars/${path}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    }
  );
  if (!res.ok) throw new Error("Remoção falhou");
}

export function avatarUrl(folder, id) {
  if (!id) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${folder}/${id}.jpg`;
}
