// Shrinks a photo in the browser before it is ever sent to the server.
//
// Two problems, one cause. A photo straight off a phone is 5712x4284 and 3-5MB;
// the shop never displays more than ~1600px of it. So every upload (a) pushed
// megabytes into Storage that nothing would ever read, and (b) frequently
// failed outright: a Server Action carries the file in the request body, and
// Netlify caps a function request at 6MB — with multipart overhead a 5MB photo
// is already over, and the request is rejected before `uploadPhoto` runs. What
// the admin showed for that was "Photo trop volumineuse", which is why this
// looked like a Supabase problem rather than a transport one.
//
// Doing it here rather than in the Server Action is deliberate: the resize has
// to happen before the bytes cross the wire to help with (b) at all, it costs
// the serverless function nothing, and it makes the upload itself quick on the
// kind of connection the admin is actually used from.

// The widest the storefront ever renders a photo. next/image picks a variant
// per layout, and nothing in the shop asks for more than this.
const MAX_EDGE = 1600;

// WebP, and high enough for the cutouts: they are the hard case, since soft
// alpha edges and drop shadows are where lossy artefacts show first. Measured
// against the existing catalogue this holds detail that is indistinguishable
// side by side, at roughly a twentieth of the bytes.
const QUALITY = 0.82;

function swapExtension(name: string): string {
  return `${name.replace(/\.[^.]+$/, "") || "photo"}.webp`;
}

async function decode(file: File): Promise<ImageBitmap> {
  // `from-image` applies the EXIF orientation tag, which phone photos rely on
  // — without it, a portrait shot taken in landscape lands sideways, because
  // drawing to a canvas throws the tag away.
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(file);
  }
}

/**
 * Returns a smaller WebP version of `file`, or `file` itself when shrinking it
 * is impossible or pointless. Never throws and never returns something larger:
 * the caller can always just upload whatever comes back.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await decode(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    // No background fill, and alpha left on: more than half the catalogue is
    // background-removed cutouts, and painting them onto white would be
    // unrecoverable.
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", QUALITY);
    });

    // A browser that cannot encode WebP hands back a PNG instead of failing,
    // and a PNG of a photograph is routinely bigger than the JPEG we started
    // from — so check the type, not just that something came back.
    if (!blob || blob.type !== "image/webp") return file;
    if (blob.size >= file.size) return file;

    return new File([blob], swapExtension(file.name), {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}
