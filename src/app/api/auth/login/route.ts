import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Resolve the access token for Studio web auth.
 *
 * In production, only STUDIO_ACCESS_TOKEN is used (no gateway fallback).
 * In development, falls back to the gateway token for convenience.
 */
function resolveAccessToken(): string {
    const envToken = (process.env.STUDIO_ACCESS_TOKEN ?? "").trim();
    if (envToken) return envToken;

    if (process.env.NODE_ENV === "production") return "";

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { loadUpstreamGatewaySettings } = require("../../../../../server/studio-settings");
        const settings = loadUpstreamGatewaySettings(process.env);
        return (settings?.token ?? "").trim();
    } catch {
        return "";
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const password = String(body?.password ?? "").trim();

        if (!password) {
            return NextResponse.json({ error: "Password is required." }, { status: 400 });
        }

        const expectedToken = resolveAccessToken();

        if (!expectedToken) {
            return NextResponse.json(
                { error: "Authentication is not configured." },
                { status: 500 }
            );
        }

        if (password !== expectedToken) {
            return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
        }

        const cookieName = "studio_access";
        const maxAge = parseInt(process.env.COOKIE_MAX_AGE_SECONDS || "43200", 10);
        const isSecure =
            process.env.NODE_ENV === "production" ||
            req.headers.get("x-forwarded-proto") === "https";
        let cookieValue = `${cookieName}=${expectedToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
        if (isSecure) cookieValue += "; Secure";

        const res = NextResponse.json({ ok: true });
        res.headers.set("Set-Cookie", cookieValue);
        return res;
    } catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
}
