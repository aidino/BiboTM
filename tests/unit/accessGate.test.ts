// @vitest-environment node

import { describe, expect, it } from "vitest";

describe("createAccessGate", () => {
  it("allows when token is unset", async () => {
    const { createAccessGate } = await import("../../server/access-gate");
    const gate = createAccessGate({ token: "" });
    expect(gate.allowUpgrade({ headers: {} })).toBe(true);
  });

  it("rejects /api requests without cookie when enabled", async () => {
    const { createAccessGate } = await import("../../server/access-gate");
    const gate = createAccessGate({ token: "abc" });

    let statusCode = 0;
    let ended = false;
    const res = {
      setHeader: () => { },
      end: () => {
        ended = true;
      },
      get statusCode() {
        return statusCode;
      },
      set statusCode(value: number) {
        statusCode = value;
      },
    };

    const handled = gate.handleHttp(
      { url: "/api/studio", headers: { host: "example.test" } },
      res
    );

    expect(handled).toBe(true);
    expect(statusCode).toBe(401);
    expect(ended).toBe(true);
  });

  it("allows upgrades when cookie matches", async () => {
    const { createAccessGate } = await import("../../server/access-gate");
    const gate = createAccessGate({ token: "abc" });
    expect(
      gate.allowUpgrade({ headers: { cookie: "studio_access=abc" } })
    ).toBe(true);
  });

  it("redirects non-API HTML requests to /login when no cookie", async () => {
    const { createAccessGate } = await import("../../server/access-gate");
    const gate = createAccessGate({ token: "secret123" });

    let statusCode = 0;
    let locationHeader = "";
    let ended = false;
    const res = {
      setHeader: (name: string, value: string) => {
        if (name === "Location") locationHeader = value;
      },
      end: () => {
        ended = true;
      },
      get statusCode() {
        return statusCode;
      },
      set statusCode(value: number) {
        statusCode = value;
      },
    };

    const handled = gate.handleHttp(
      { url: "/", headers: { host: "example.test" } },
      res
    );

    expect(handled).toBe(true);
    expect(statusCode).toBe(302);
    expect(locationHeader).toBe("/login");
    expect(ended).toBe(true);
  });

  it("whitelists /login path (no redirect)", async () => {
    const { createAccessGate } = await import("../../server/access-gate");
    const gate = createAccessGate({ token: "secret123" });

    const res = {
      setHeader: () => { },
      end: () => { },
      statusCode: 0,
    };

    const handled = gate.handleHttp(
      { url: "/login", headers: { host: "example.test" } },
      res
    );

    expect(handled).toBe(false);
  });

  it("whitelists /api/auth/login path (no block)", async () => {
    const { createAccessGate } = await import("../../server/access-gate");
    const gate = createAccessGate({ token: "secret123" });

    const res = {
      setHeader: () => { },
      end: () => { },
      statusCode: 0,
    };

    const handled = gate.handleHttp(
      { url: "/api/auth/login", headers: { host: "example.test" } },
      res
    );

    expect(handled).toBe(false);
  });

  it("allows non-API requests when cookie matches", async () => {
    const { createAccessGate } = await import("../../server/access-gate");
    const gate = createAccessGate({ token: "secret123" });

    const res = {
      setHeader: () => { },
      end: () => { },
      statusCode: 0,
    };

    const handled = gate.handleHttp(
      {
        url: "/",
        headers: { host: "example.test", cookie: "studio_access=secret123" },
      },
      res
    );

    expect(handled).toBe(false);
  });

  it("passes through /_next/ static resources", async () => {
    const { createAccessGate } = await import("../../server/access-gate");
    const gate = createAccessGate({ token: "secret123" });

    const res = {
      setHeader: () => { },
      end: () => { },
      statusCode: 0,
    };

    const handled = gate.handleHttp(
      { url: "/_next/static/chunks/main.js", headers: { host: "example.test" } },
      res
    );

    expect(handled).toBe(false);

    it("redirects authenticated user from /login to /", async () => {
      const { createAccessGate } = await import("../../server/access-gate");
      const gate = createAccessGate({ token: "secret123" });

      let statusCode = 0;
      let locationHeader = "";
      let ended = false;
      const res = {
        setHeader: (name: string, value: string) => {
          if (name === "Location") locationHeader = value;
        },
        end: () => {
          ended = true;
        },
        get statusCode() {
          return statusCode;
        },
        set statusCode(value: number) {
          statusCode = value;
        },
      };

      const handled = gate.handleHttp(
        {
          url: "/login",
          headers: { host: "example.test", cookie: "studio_access=secret123" },
        },
        res
      );

      expect(handled).toBe(true);
      expect(statusCode).toBe(302);
      expect(locationHeader).toBe("/");
      expect(ended).toBe(true);
    });
  });
