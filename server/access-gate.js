const { URL } = require("node:url");

const parseCookies = (header) => {
  const raw = typeof header === "string" ? header : "";
  if (!raw.trim()) return {};
  const out = {};
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
};

const buildRedirectUrl = (req, nextPathWithQuery) => {
  const host = req.headers?.host || "localhost";
  const proto =
    String(req.headers?.["x-forwarded-proto"] || "").toLowerCase() === "https"
      ? "https"
      : "http";
  return `${proto}://${host}${nextPathWithQuery}`;
};

const resolvePathname = (url) => {
  const raw = typeof url === "string" ? url : "";
  const idx = raw.indexOf("?");
  return (idx === -1 ? raw : raw.slice(0, idx)) || "/";
};

/** Paths that bypass the access gate even when enabled. */
const LOGIN_WHITELIST = new Set(["/login", "/api/auth/login", "/api/auth/logout"]);

/** File-extension patterns that indicate a static asset request. */
const isStaticAsset = (pathname) =>
  /\.(?:js|css|ico|png|jpg|jpeg|svg|woff2?|ttf|map|json)$/i.test(pathname);

function createAccessGate(options) {
  const token = String(options?.token ?? "").trim();
  const cookieName = String(options?.cookieName ?? "studio_access").trim() || "studio_access";
  const queryParam = String(options?.queryParam ?? "access_token").trim() || "access_token";
  const allowQueryTokenBootstrap = process.env.ALLOW_QUERY_TOKEN_BOOTSTRAP === "true";
  const maxAge = parseInt(process.env.COOKIE_MAX_AGE_SECONDS || "43200", 10); // 12h default

  const enabled = Boolean(token);

  const buildCookieValue = (req) => {
    const isSecure =
      process.env.NODE_ENV === "production" ||
      String(req.headers?.["x-forwarded-proto"] || "").toLowerCase() === "https";
    let cookie = `${cookieName}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
    if (isSecure) cookie += "; Secure";
    return cookie;
  };

  const isAuthorized = (req) => {
    if (!enabled) return true;
    const cookieHeader = req.headers?.cookie;
    const cookies = parseCookies(cookieHeader);
    return cookies[cookieName] === token;
  };

  const handleHttp = (req, res) => {
    if (!enabled) return false;

    const host = req.headers?.host || "localhost";
    const url = new URL(req.url || "/", `http://${host}`);
    const pathname = url.pathname;

    // Auth APIs always pass through.
    if (pathname === "/api/auth/login" || pathname === "/api/auth/logout") return false;

    // If user is already authenticated and visits /login, redirect to home.
    if (pathname === "/login") {
      if (isAuthorized(req)) {
        res.statusCode = 302;
        res.setHeader("Location", "/");
        res.end();
        return true;
      }
      return false;
    }

    // Allow Next.js internals and static assets through (they are not sensitive).
    if (pathname.startsWith("/_next/")) return false;
    if (isStaticAsset(pathname)) return false;

    const provided = url.searchParams.get(queryParam);

    if (provided !== null) {
      if (!allowQueryTokenBootstrap) {
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Query-token bootstrap is disabled." }));
        return true;
      }

      if (provided !== token) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid access token." }));
        return true;
      }

      url.searchParams.delete(queryParam);
      res.statusCode = 302;
      res.setHeader("Set-Cookie", buildCookieValue(req));
      res.setHeader("Location", buildRedirectUrl(req, url.pathname + url.search));
      res.end();
      return true;
    }

    if (url.pathname.startsWith("/api/")) {
      if (!isAuthorized(req)) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: "Authentication required." })
        );
        return true;
      }
    }

    // Non-API HTML requests: redirect to /login if not authorized.
    if (!isAuthorized(req)) {
      res.statusCode = 302;
      res.setHeader("Location", "/login");
      res.end();
      return true;
    }

    return false;
  };

  const allowUpgrade = (req) => {
    if (!enabled) return true;
    return isAuthorized(req);
  };

  return { enabled, handleHttp, allowUpgrade };
}

module.exports = { createAccessGate };
