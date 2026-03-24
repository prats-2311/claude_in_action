import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresIn = "7d") {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets an httpOnly cookie with a signed JWT", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-123", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, token, options] = mockCookieStore.set.mock.calls[0];

    expect(name).toBe("auth-token");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
  });

  it("sets cookie expiry 7 days in the future", async () => {
    const { createSession } = await import("@/lib/auth");
    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expiry: Date = options.expires;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiry.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  it("embeds userId and email in the JWT payload", async () => {
    const { createSession } = await import("@/lib/auth");
    const { jwtVerify } = await import("jose");

    await createSession("user-123", "test@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-123");
    expect(payload.email).toBe("test@example.com");
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
  });

  it("returns session payload for a valid token", async () => {
    const token = await makeToken({ userId: "user-123", email: "test@example.com" });
    mockCookieStore.get.mockReturnValue({ value: token });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session?.userId).toBe("user-123");
    expect(session?.email).toBe("test@example.com");
  });

  it("returns null for an invalid token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "invalid.token.here" });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const token = await makeToken(
      { userId: "user-123", email: "test@example.com" },
      "-1s"
    );
    mockCookieStore.get.mockReturnValue({ value: token });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
  });
});
