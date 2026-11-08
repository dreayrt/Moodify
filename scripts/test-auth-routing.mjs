import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const { unstable_doesMiddlewareMatch } = require("next/experimental/testing/server");
const source = fs.readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const exports = {};
vm.runInNewContext(outputText, { exports, require, atob, URL });
const { middleware, config } = exports;
const origin = "https://moodify.click";
const now = Math.floor(Date.now() / 1000);

// Navigation fixtures only: these unsigned tokens never reach a backend API.
function token(role, tokenType = "ACCESS", exp = now + 3600) {
  const payload = Buffer.from(JSON.stringify({ role, tokenType, exp })).toString("base64url");
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.test-signature`;
}

function visit(path, cookies = {}) {
  const request = new NextRequest(new URL(path, origin), {
    headers: { cookie: Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; ") },
  });
  return middleware(request);
}

function expectRedirect(path, cookies, destination) {
  const response = visit(path, cookies);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), new URL(destination, origin).href);
  return response;
}

test("middleware covers the root and dashboards, excluding unrelated routes", () => {
  for (const path of ["/", "/dashboard", "/dashboard/user", "/dashboard/admin"]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: path }), true, path);
  }
  for (const path of ["/track/123", "/api/proxy-image", "/favicon.ico", "/_next/static/main.js"]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: path }), false, path);
  }
});

const destinations = {
  USER: "/dashboard/user",
  ADMIN: "/dashboard/admin",
  MODERATOR: "/dashboard/moderator",
  CONTENT_LEAD: "/dashboard/content-lead",
  ARTIST: "/dashboard/content-lead",
};

for (const [role, destination] of Object.entries(destinations)) {
  for (const entry of ["/", "/dashboard", "/dashboard/"]) {
    test(`${role} at ${entry} uses the access-token role and preserves query parameters`, () => {
      expectRedirect(`${entry}?auth=signin&redirect=%2Fdashboard%2Flibrary`, {
        moodify_token: token(role), moodify_role: "USER",
      }, `${destination}?auth=signin&redirect=%2Fdashboard%2Flibrary`);
    });
  }
  test(`${role} at root can renew an expired access token using a valid refresh session`, () => {
    expectRedirect("/", {
      moodify_token: token(role, "ACCESS", now - 60),
      moodify_refresh: token(role, "REFRESH"),
    }, destination);
  });
}

for (const [name, cookies] of Object.entries({
  "guest or completed logout": {},
  "expired session": { moodify_token: token("ADMIN", "ACCESS", now - 60), moodify_refresh: token("ADMIN", "REFRESH", now - 60) },
  "malformed token": { moodify_token: "not-a-jwt" },
  "wrong token type": { moodify_token: token("ADMIN", "REFRESH") },
  "legacy cookies and edited role cookie": { token: token("ADMIN"), accessToken: token("ADMIN"), moodify_role: "ADMIN" },
  "unknown role": { moodify_token: token("UNKNOWN") },
})) {
  test(`${name} reaches the public dashboard from root without a redirect loop`, () => {
    const response = expectRedirect("/?auth=signin", cookies, "/dashboard/user?auth=signin");
    for (const name of ["moodify_token", "moodify_refresh", "moodify_role", "accessToken", "token"]) {
      assert.equal(response.cookies.get(name)?.value, "");
    }
    assert.equal(visit("/dashboard/user?auth=signin").headers.get("x-middleware-next"), "1");
  });
}

test("guest access to a protected page still opens sign-in with the intended destination", () => {
  const response = visit("/dashboard/admin?tab=users");
  const location = new URL(response.headers.get("location"));
  assert.equal(location.pathname, "/");
  assert.equal(location.searchParams.get("auth"), "signin");
  assert.equal(location.searchParams.get("redirect"), "/dashboard/admin?tab=users");
  expectRedirect(location.pathname + location.search, {}, "/dashboard/user" + location.search);
});

test("role restrictions on protected dashboards remain enforced", () => {
  expectRedirect("/dashboard/admin", { moodify_token: token("MODERATOR") }, "/dashboard/moderator");
  expectRedirect("/dashboard/moderator", { moodify_token: token("USER") }, "/dashboard/user");
  expectRedirect("/dashboard/content-lead", { moodify_token: token("USER") }, "/dashboard/user");
  assert.equal(visit("/dashboard/admin", { moodify_token: token("ADMIN") }).headers.get("x-middleware-next"), "1");
});

test("the public music dashboard remains directly accessible to staff", () => {
  assert.equal(visit("/dashboard/user", { moodify_token: token("ADMIN") }).headers.get("x-middleware-next"), "1");
});
