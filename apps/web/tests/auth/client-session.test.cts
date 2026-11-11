import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { api, ApiError } from "@/lib/api-client";
import {
  authenticatedFetch, getAccessToken, logoutSession, refreshAccessToken,
  saveAccessToken, SessionExpiredError, SESSION_TOKEN_EVENT,
} from "@/lib/client-session";

function browser(context: TestContext, initialToken: string | null = "expired-access") {
  const values = new Map<string, string>([["user", '{"role":"PATIENT"}']]);
  if (initialToken) values.set("accessToken", initialToken);
  const redirects: string[] = [];
  const windowMock = Object.assign(new EventTarget(), {
    location: { pathname: "/appointments", assign: (url: string) => { redirects.push(url); } },
  });
  let queue = Promise.resolve();
  const locks = {
    request: <T>(_name: string, callback: () => Promise<T>): Promise<T> => {
      const result = queue.then(callback);
      queue = result.then(() => {}, () => {});
      return result;
    },
  };
  const globals = {
    window: windowMock,
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    },
    navigator: { locks },
  };
  for (const [name, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    context.after(() => {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
  return { values, redirects, window: windowMock, locks };
}

const unauthorized = () => new Response(null, { status: 401 });
const renewed = () => Response.json({ accessToken: "renewed-access" });
const authorization = (options?: RequestInit) => new Headers(options?.headers).get("Authorization");

test("el cliente conserva el código 409 para restaurar el editor ante un cambio rechazado", async (context) => {
  const page = browser(context);
  context.mock.method(globalThis, "fetch", async () => Response.json({ error: "No puedes desactivar este horario" }, { status: 409 }));
  await assert.rejects(api.put("/api/dentists/test/availability", { days: [] }), (error: unknown) => error instanceof ApiError && error.status === 409 && error.message === "No puedes desactivar este horario");
  assert.deepEqual(page.redirects, []);
  assert.equal(getAccessToken(), "expired-access");
});

test("al vencer el acceso renueva con la cookie y reintenta el POST conservando el contenido", async (context) => {
  const page = browser(context);
  const calls: Array<{ url: string; options?: RequestInit }> = [];
  let tokenEvents = 0;
  page.window.addEventListener(SESSION_TOKEN_EVENT, () => { tokenEvents++; });
  context.mock.method(globalThis, "fetch", async (url: string, options?: RequestInit) => {
    calls.push({ url, options });
    if (url === "/api/auth/refresh") return renewed();
    return authorization(options) === "Bearer renewed-access" ? Response.json({ id: "created" }) : unauthorized();
  });
  assert.deepEqual(await api.post("/api/appointments", { notes: "Trabajo en curso" }), { id: "created" });
  assert.deepEqual(calls.map((call) => call.url), ["/api/appointments", "/api/auth/refresh", "/api/appointments"]);
  assert.equal(calls[0]?.options?.body, calls[2]?.options?.body);
  assert.equal(calls[2]?.options?.method, "POST");
  assert.equal(calls[1]?.options?.credentials, "same-origin");
  assert.equal(getAccessToken(), "renewed-access");
  assert.equal(page.values.get("user"), '{"role":"PATIENT"}');
  assert.equal(tokenEvents, 1);
  assert.deepEqual(page.redirects, []);
});

test("varias peticiones simultáneas comparten una sola renovación", async (context) => {
  const page = browser(context);
  let refreshes = 0;
  context.mock.method(globalThis, "fetch", async (url: string, options?: RequestInit) => {
    if (url === "/api/auth/refresh") { refreshes++; return renewed(); }
    return authorization(options) === "Bearer renewed-access" ? Response.json({ ok: true }) : unauthorized();
  });
  const results = await Promise.all(Array.from({ length: 8 }, () => api.get("/api/appointments")));
  assert.equal(results.length, 8);
  assert.equal(refreshes, 1);
  assert.deepEqual(page.redirects, []);
});

test("un 401 tardío reutiliza el token ya renovado sin volver a rotar la cookie", async (context) => {
  browser(context);
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => { release = resolve; });
  let refreshes = 0;
  context.mock.method(globalThis, "fetch", async (url: string, options?: RequestInit) => {
    if (url === "/api/auth/refresh") { refreshes++; return renewed(); }
    if (authorization(options) === "Bearer renewed-access") return Response.json({ ok: true });
    if (url === "/api/slow") await delayed;
    return unauthorized();
  });
  const slow = api.get("/api/slow");
  await api.get("/api/fast");
  release();
  await slow;
  assert.equal(refreshes, 1);
});

test("después de esperar el bloqueo entre pestañas comprueba si otra ya renovó", async (context) => {
  const page = browser(context);
  let lockName = "";
  context.mock.method(page.locks, "request", async (name: string, callback: () => Promise<string>) => {
    lockName = name;
    page.values.set("accessToken", "other-tab-access");
    return callback();
  });
  const fetchMock = context.mock.method(globalThis, "fetch", async () => { throw new Error("No debería renovar"); });
  assert.equal(await refreshAccessToken("expired-access"), "other-tab-access");
  assert.equal(lockName, "biodentis:session-renewal");
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("recupera la sesión al cargar sin access token si la cookie sigue vigente", async (context) => {
  const page = browser(context, null);
  context.mock.method(globalThis, "fetch", async (url: string, options?: RequestInit) => {
    if (url === "/api/auth/refresh") return renewed();
    return authorization(options) ? Response.json({ role: "PATIENT" }) : unauthorized();
  });
  const response = await authenticatedFetch("/api/users/me", { cache: "no-store" }, false);
  assert.deepEqual(await response.json(), { role: "PATIENT" });
  assert.deepEqual(page.redirects, []);
});

for (const status of [401, 403, 404]) {
  test(`una sesión de renovación inválida (${status}) exige login`, async (context) => {
    const page = browser(context);
    context.mock.method(globalThis, "fetch", async (url: string) => url === "/api/auth/refresh" ? new Response(null, { status }) : unauthorized());
    await assert.rejects(api.get("/api/appointments"), SessionExpiredError);
    assert.equal(getAccessToken(), null);
    assert.equal(page.values.has("user"), false);
    assert.deepEqual(page.redirects, ["/login"]);
  });
}

test("la validación inicial sin sesión no redirige en bucle desde login", async (context) => {
  const page = browser(context, null);
  context.mock.method(globalThis, "fetch", async () => unauthorized());
  await assert.rejects(authenticatedFetch("/api/users/me", {}, false), SessionExpiredError);
  assert.deepEqual(page.redirects, []);
});

test("un 403 de permisos no renueva ni cierra la sesión", async (context) => {
  const page = browser(context);
  const fetchMock = context.mock.method(globalThis, "fetch", async () => new Response(null, { status: 403 }));
  assert.equal((await authenticatedFetch("/api/users")).status, 403);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(getAccessToken(), "expired-access");
  assert.deepEqual(page.redirects, []);
});

for (const failure of ["network", "server", "malformed"] as const) {
  test(`un fallo temporal (${failure}) conserva la sesión y permite reintentar`, async (context) => {
    const page = browser(context);
    let failing = true;
    context.mock.method(globalThis, "fetch", async (url: string, options?: RequestInit) => {
      if (url === "/api/auth/refresh") {
        if (!failing) return renewed();
        if (failure === "network") throw new TypeError("Failed to fetch");
        return failure === "server" ? new Response(null, { status: 503 }) : Response.json({});
      }
      return authorization(options) === "Bearer renewed-access" ? Response.json({ ok: true }) : unauthorized();
    });
    await assert.rejects(api.get("/api/appointments"));
    assert.equal(getAccessToken(), "expired-access");
    assert.equal(page.values.has("user"), true);
    assert.deepEqual(page.redirects, []);
    failing = false;
    assert.deepEqual(await api.get("/api/appointments"), { ok: true });
  });
}

test("un 401 después de renovar no provoca un bucle de reintentos", async (context) => {
  const page = browser(context);
  const fetchMock = context.mock.method(globalThis, "fetch", async (url: string) => url === "/api/auth/refresh" ? renewed() : unauthorized());
  await assert.rejects(api.get("/api/appointments"), SessionExpiredError);
  assert.equal(fetchMock.mock.callCount(), 3);
  assert.deepEqual(page.redirects, ["/login"]);
});

test("cerrar sesión durante una renovación no restaura credenciales por una respuesta tardía", async (context) => {
  const page = browser(context);
  let release!: () => void;
  let started!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  const refreshing = new Promise<void>((resolve) => { started = resolve; });
  const calls: string[] = [];
  context.mock.method(globalThis, "fetch", async (url: string) => {
    calls.push(url);
    if (url === "/api/auth/refresh") { started(); await waiting; return renewed(); }
    return new Response(null, { status: 204 });
  });
  const result = assert.rejects(refreshAccessToken("expired-access"), /sesión cambió/);
  await refreshing;
  const logout = logoutSession();
  release();
  await Promise.all([result, logout]);
  assert.deepEqual(calls, ["/api/auth/refresh", "/api/auth/logout"]);
  assert.equal(getAccessToken(), null);
  assert.deepEqual(page.redirects, []);
});

test("una respuesta fallida tardía no borra un login nuevo", async (context) => {
  browser(context);
  let release!: () => void;
  let started!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  const refreshing = new Promise<void>((resolve) => { started = resolve; });
  context.mock.method(globalThis, "fetch", async (url: string) => {
    if (url === "/api/auth/refresh") { started(); await waiting; }
    return unauthorized();
  });
  const result = assert.rejects(api.get("/api/appointments"), /sesión cambió/);
  await refreshing;
  saveAccessToken("new-login-access");
  release();
  await result;
  assert.equal(getAccessToken(), "new-login-access");
});
