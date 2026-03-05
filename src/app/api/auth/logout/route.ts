import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const isSecure =
        process.env.NODE_ENV === "production" ||
        req.headers.get("x-forwarded-proto") === "https";

    let cookie = "studio_access=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0";
    if (isSecure) cookie += "; Secure";

    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", cookie);
    return res;
}
