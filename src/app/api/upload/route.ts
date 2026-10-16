import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { ALLOWED_IMAGE_TYPES, MAX_PHOTO_BYTES } from "@/lib/report-config";

const PATHNAME_RE =
  /^laporan\/[a-z0-9-]{1,60}\/[0-9a-f-]{36}\.(jpg|png|webp|heic|heif)$/;

export async function POST(request: Request): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  // Permintaan token hanya boleh datang dari halaman web kita sendiri.
  if (body.type === "blob.generate-client-token") {
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    let sameOrigin = false;
    try {
      sameOrigin = Boolean(origin && host && new URL(origin).host === host);
    } catch {
      sameOrigin = false;
    }
    if (!sameOrigin) {
      return NextResponse.json({ error: "Asal permintaan tidak diizinkan." }, { status: 403 });
    }
  }

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!PATHNAME_RE.test(pathname)) {
          throw new Error("Nama file tidak valid.");
        }
        return {
          allowedContentTypes: ALLOWED_IMAGE_TYPES,
          maximumSizeInBytes: MAX_PHOTO_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
