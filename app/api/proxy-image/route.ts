import { NextRequest, NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_ORIGINS = new Set([
  "https://i.scdn.co",
  "https://images.unsplash.com",
]);

const configuredApiOrigin = (() => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) return null;
  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return null;
  }
})();

if (configuredApiOrigin) ALLOWED_IMAGE_ORIGINS.add(configuredApiOrigin);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const parsed = new URL(targetUrl);
    if (parsed.username || parsed.password || !ALLOWED_IMAGE_ORIGINS.has(parsed.origin)) {
      return new NextResponse("Image source is not allowed", { status: 403 });
    }

    const res = await fetch(parsed.href, {
      redirect: "error",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Moodify/1.0",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return new NextResponse(`Failed to fetch image: ${res.statusText}`, { status: res.status });
    }

    const contentType = (res.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
    if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(contentType)) {
      return new NextResponse("Image source returned an unsupported content type", { status: 415 });
    }
    const contentLength = Number(res.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      return new NextResponse("Image is too large", { status: 413 });
    }
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      return new NextResponse("Image is too large", { status: 413 });
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    return new NextResponse("Error proxying image", { status: 502 });
  }
}
