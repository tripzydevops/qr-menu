export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || "http://localhost:8000";

async function proxyRequest(request: NextRequest, segments: string[]) {
  try {
    const url = new URL(request.url);
    const path = segments.join("/");
    const targetUrl = `${BACKEND_URL}/api/admin/inventory/${path}${url.search}`;

    console.log(`[Proxy] Routing ${request.method} request to: ${targetUrl}`);

    // Copy headers
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      // Avoid forwarding host and connection headers which cause conflicts
      if (!["host", "connection", "content-length"].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    const options: RequestInit = {
      method: request.method,
      headers,
    };

    // Forward body for methods that support it
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("multipart/form-data")) {
        // For multipart/form-data (like invoice scans), forward raw formData
        options.body = await request.formData();
      } else {
        // For JSON/Text, forward the text body
        options.body = await request.text();
      }
    }

    const res = await fetch(targetUrl, options);

    // Forward response headers back (avoid forwarding transport-level headers that cause compression/chunking conflicts)
    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"].includes(lowerKey)) {
        responseHeaders.set(key, value);
      }
    });

    // Handle 204 No Content and 205 Reset Content responses
    if (res.status === 204 || res.status === 205) {
      return new NextResponse(null, {
        status: res.status,
        headers: responseHeaders,
      });
    }

    // Handle response content-type
    const resContentType = res.headers.get("content-type") || "";
    if (resContentType.includes("application/json")) {
      const data = await res.json();
      return NextResponse.json(data, {
        status: res.status,
        headers: responseHeaders,
      });
    } else {
      const text = await res.text();
      return new NextResponse(text, {
        status: res.status,
        headers: responseHeaders,
      });
    }
  } catch (error: any) {
    console.error(`[Proxy] Error:`, error);
    return NextResponse.json(
      { detail: error.message || "Internal Server Proxy Error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  return proxyRequest(request, params.path || []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  return proxyRequest(request, params.path || []);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  return proxyRequest(request, params.path || []);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  return proxyRequest(request, params.path || []);
}
