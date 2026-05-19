import { NextRequest, NextResponse } from "next/server";

const DEFAULT_CLUBX_API_BASE = "https://club-lms-for-kuba-production.up.railway.app/api/v1";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

function getClubxApiBase() {
  return (
    process.env.CLUBX_API_BASE ||
    process.env.NEXT_PUBLIC_CLUBX_API_BASE ||
    DEFAULT_CLUBX_API_BASE
  ).replace(/\/+$/, "");
}

async function proxyClubxRequest(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  const target = new URL(`${getClubxApiBase()}/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: {
        Accept: "application/json",
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
    });

    const responseContentType = upstream.headers.get("content-type") ?? "application/json";
    const body = await upstream.text();

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": responseContentType,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ClubX API proxy failed.";
    return NextResponse.json({ detail: message }, { status: 502 });
  }
}

export const GET = proxyClubxRequest;
export const POST = proxyClubxRequest;
export const DELETE = proxyClubxRequest;
