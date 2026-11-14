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

const authClientSource = fs.readFileSync(new URL("../lib/auth/auth-client.ts", import.meta.url), "utf8");
const authClientCode = ts.transpileModule(authClientSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function browserAuth(fetch) {
  const storage = new Map();
  const cookies = new Map();
  const requests = [];
  const navigations = [];
  const document = {
    get cookie() {
      return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    set cookie(value) {
      const [pair, ...attributes] = value.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      if (attributes.some((attribute) => attribute.trim() === "max-age=0")) cookies.delete(name);
      else cookies.set(name, pair.slice(separator + 1));
    },
  };
  const exports = {};
  vm.runInNewContext(authClientCode, {
    exports, document, AbortSignal, process: { env: {} },
    console: { log() {}, warn() {}, error() {} },
    require(id) {
      assert.equal(id, "./device-helper");
      return { getCurrentDeviceUuid: () => "test-device" };
    },
    window: {
      localStorage: {
        getItem: (name) => storage.get(name) ?? null,
        setItem: (name, value) => storage.set(name, value),
        removeItem: (name) => storage.delete(name),
      },
      location: {
        protocol: "https:",
        replace(destination) {
          // Session cleanup must already be complete when navigation starts.
          assert.equal(storage.has("moodify.auth.session"), false);
          assert.equal(storage.has("moodify.auth.user"), false);
          assert.equal(storage.has("accessToken"), false);
          assert.equal(storage.has("refreshToken"), false);
          assert.equal(cookies.size, 0);
          navigations.push(destination);
        },
      },
    },
    fetch(url, options) {
      requests.push({ url, options });
      return fetch(url, options);
    },
  });
  const auth = {
    accessToken: token("CONTENT_LEAD"), refreshToken: token("CONTENT_LEAD", "REFRESH"),
    expiresIn: 3600, refreshExpiresIn: 86400, userId: 1,
    fullName: "Test", email: "test@example.com", username: "test", role: "CONTENT_LEAD", status: "ACTIVE",
  };
  return { client: exports, auth, storage, cookies, requests, navigations };
}

test("logout clears the session and leaves immediately even when the API stalls or fails", async (t) => {
  for (const [name, fetch] of [
    ["pending API", () => new Promise(() => {})],
    ["offline", () => Promise.reject(new Error("offline"))],
    ["server error", async () => new Response("Unavailable", { status: 503 })],
    ["success", async () => new Response(null, { status: 204 })],
  ]) {
    await t.test(name, async () => {
      const { client, auth, storage, cookies, requests, navigations } = browserAuth(fetch);
      client.saveAuthSession(auth);
      for (const name of ["accessToken", "refreshToken"]) storage.set(name, "legacy-token");
      for (const name of ["accessToken", "token"]) cookies.set(name, "legacy-token");

      client.logoutAndRedirect();

      assert.deepEqual(navigations, ["/dashboard/user"]);
      assert.equal(client.getStoredAuthSession(), null);
      assert.equal(requests.length, 1);
      const { url, options } = requests[0];
      assert.equal(new URL(url, origin).pathname, "/api/auth/logout");
      assert.equal(options.method, "POST");
      assert.equal(options.keepalive, true);
      assert.equal(options.headers.Authorization, `Bearer ${auth.accessToken}`);
      assert.deepEqual(JSON.parse(options.body), { refreshToken: auth.refreshToken });
      // Let rejection handlers run; backend failure must not restore the session.
      await new Promise(setImmediate);
      assert.equal(client.getStoredAuthSession(), null);
    });
  }
});

test("logout with no local session navigates without trying to refresh tokens", () => {
  const { client, requests, navigations } = browserAuth(() => new Promise(() => {}));
  client.logoutAndRedirect();
  assert.deepEqual(navigations, ["/dashboard/user"]);
  assert.equal(requests.length, 1);
  assert.equal(new URL(requests[0].url, origin).pathname, "/api/auth/logout");
  assert.equal(requests[0].options.headers.Authorization, undefined);
});

test("a refresh response arriving after logout cannot restore the session", async () => {
  let finishRefresh;
  const { client, auth, cookies, navigations } = browserAuth((url) => {
    if (new URL(url, origin).pathname === "/api/auth/refresh") {
      return new Promise((resolve) => { finishRefresh = resolve; });
    }
    return new Promise(() => {});
  });
  client.saveAuthSession({ ...auth, expiresIn: 0 });
  const pendingToken = client.getValidAccessToken();
  assert.equal(typeof finishRefresh, "function");

  client.logoutAndRedirect();
  finishRefresh(new Response(JSON.stringify(auth), { status: 200 }));

  assert.equal(await pendingToken, null);
  assert.equal(client.getStoredAuthSession(), null);
  assert.equal(cookies.size, 0);
  assert.deepEqual(navigations, ["/dashboard/user"]);
});

const savedProfile = {
  id: 1, fullName: "Tên từ máy chủ", phone: "0901234567", email: "test@example.com",
  username: "test", role: "MODERATOR", status: "ACTIVE", avatarUrl: "/uploads/avatars/saved.png",
};

test("profile PATCH uses the same origin and caches only the saved server response", async () => {
  const { client, auth, storage, requests } = browserAuth(async () => new Response(JSON.stringify(savedProfile)));
  client.saveAuthSession(auth);
  const profile = await client.updateCurrentUserProfile({ fullName: "  Tên mới  ", phone: "  0901234567  " });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/auth/me");
  assert.equal(requests[0].options.method, "PATCH");
  assert.equal(requests[0].options.headers.Authorization, `Bearer ${auth.accessToken}`);
  assert.equal(requests[0].options.headers["X-Device-Uuid"], "test-device");
  assert.deepEqual(JSON.parse(requests[0].options.body), { fullName: "Tên mới", phone: "0901234567" });
  assert.equal(profile.fullName, savedProfile.fullName);
  assert.deepEqual(JSON.parse(storage.get("moodify.auth.user")), savedProfile);
});

test("failed profile updates preserve the previous saved profile", async () => {
  const { client, auth, storage } = browserAuth(async () => new Response(
    JSON.stringify({ message: "Số điện thoại đã được sử dụng." }), { status: 409 }));
  client.saveAuthSession(auth);
  const previous = storage.get("moodify.auth.user");
  await assert.rejects(client.updateCurrentUserProfile({ fullName: "Tên mới", phone: "0901234567" }),
    { message: "Số điện thoại đã được sử dụng." });
  assert.equal(storage.get("moodify.auth.user"), previous);
});

test("profile updates require a live session", async () => {
  const { client, requests } = browserAuth(() => { throw new Error("must not send"); });
  await assert.rejects(client.updateCurrentUserProfile({ fullName: "Tên", phone: "" }), /Phiên đăng nhập/);
  assert.equal(requests.length, 0);
});

test("a late profile save cannot restore user data after logout", async () => {
  let finishSave;
  const { client, auth, storage } = browserAuth(() => new Promise((resolve) => { finishSave = resolve; }));
  client.saveAuthSession(auth);
  const saving = client.updateCurrentUserProfile({ fullName: "Tên", phone: "" });
  await new Promise(setImmediate);
  client.clearAuthSession();
  finishSave(new Response(JSON.stringify(savedProfile)));
  await saving;
  assert.equal(storage.has("moodify.auth.user"), false);
});

test("password change uses authenticated same-origin POST and preserves backend errors", async () => {
  const { client, auth, requests } = browserAuth(async () => new Response(
    JSON.stringify({ message: "Mật khẩu hiện tại không đúng." }), { status: 400 }));
  client.saveAuthSession(auth);
  await assert.rejects(client.changePassword("wrong-current", "new-password"),
    { message: "Mật khẩu hiện tại không đúng." });
  assert.equal(requests[0].url, "/api/auth/change-password");
  assert.equal(requests[0].options.method, "POST");
  assert.equal(requests[0].options.headers.Authorization, `Bearer ${auth.accessToken}`);
  assert.deepEqual(JSON.parse(requests[0].options.body), { currentPassword: "wrong-current", newPassword: "new-password" });
});

test("account proxy works with API origin, /api suffix, and local development defaults", async () => {
  const configCode = ts.transpileModule(fs.readFileSync(new URL("../next.config.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  for (const [value, expected] of [["https://api.moodify.click", "https://api.moodify.click"],
    ["https://api.moodify.click/api/", "https://api.moodify.click"], [undefined, "http://localhost:8088"]]) {
    const exports = {};
    vm.runInNewContext(configCode, { exports, process: { env: { NEXT_PUBLIC_API_BASE_URL: value } } });
    const rewrites = await exports.default.rewrites();
    assert.equal(rewrites.find((rule) => rule.source === "/api/auth/:path*").destination,
      `${expected}/api/auth/:path*`);
    assert.equal(rewrites.find((rule) => rule.source === "/uploads/:path*").destination,
      `${expected}/uploads/:path*`);
  }
});
