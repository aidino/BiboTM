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
const LOGIN_WHITELIST = new Set(["/login", "/api/auth/login"]);

/** File-extension patterns that indicate a static asset request. */
const isStaticAsset = (pathname) =>
  /\.(?:js|css|ico|png|jpg|jpeg|svg|woff2?|ttf|map|json)$/i.test(pathname);

function createAccessGate(options) {
  const token = String(options?.token ?? "").trim();
  const cookieName = String(options?.cookieName ?? "studio_access").trim() || "studio_access";
  const queryParam = String(options?.queryParam ?? "access_token").trim() || "access_token";

  const enabled = Boolean(token);

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

    // Login API always passes through.
    if (pathname === "/api/auth/login") return false;

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
      if (provided !== token) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid Studio access token." }));
        return true;
      }

      url.searchParams.delete(queryParam);
      const cookieValue = `${cookieName}=${token}; HttpOnly; Path=/; SameSite=Lax`;
      res.statusCode = 302;
      res.setHeader("Set-Cookie", cookieValue);
      res.setHeader("Location", buildRedirectUrl(req, url.pathname + url.search));
      res.end();
      return true;
    }

    if (url.pathname.startsWith("/api/")) {
      if (!isAuthorized(req)) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "Studio access token required. Open /?access_token=... once to set a cookie.",
          })
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
