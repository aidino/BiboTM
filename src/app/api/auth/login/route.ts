import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Resolve the gateway token server-side.
 *
 * Priority:
 * 1. STUDIO_ACCESS_TOKEN env var
 * 2. Gateway token from openclaw studio settings / openclaw.json
 */
function resolveAccessToken(): string {
    const envToken = (process.env.STUDIO_ACCESS_TOKEN ?? "").trim();
    if (envToken) return envToken;

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
                { error: "No gateway token configured on this server." },
                { status: 500 }
            );
        }

        if (password !== expectedToken) {
            return NextResponse.json({ error: "Invalid password." }, { status: 401 });
        }

        // Set the same cookie as access-gate.js so existing auth checks pass.
        const cookieName = "studio_access";
        const cookieValue = `${cookieName}=${expectedToken}; HttpOnly; Path=/; SameSite=Lax`;

        const res = NextResponse.json({ ok: true });
        res.headers.set("Set-Cookie", cookieValue);
        return res;
    } catch {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
}
