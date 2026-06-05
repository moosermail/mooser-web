import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret-minimum-32-chars-long";
  process.env.ENCRYPTION_KEY = "ab".repeat(32);
});

describe("token lifecycle", () => {
  it("signToken -> verifyToken roundtrip preserves userId and email", async () => {
    const { signToken, verifyToken } = await import("../lib/auth");
    const token = signToken({ userId: "user-42", email: "alice@example.com" });
    const result = verifyToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user-42");
    expect(result!.email).toBe("alice@example.com");
  });

  it("expired tokens are rejected", async () => {
    const jwt = await import("jsonwebtoken");
    const secret = process.env.JWT_SECRET!;
    const token = jwt.default.sign(
      { userId: "user-99", email: "expired@test.com" },
      secret,
      { expiresIn: "0s" }
    );
    // Small delay to ensure expiry
    await new Promise((r) => setTimeout(r, 50));
    const { verifyToken } = await import("../lib/auth");
    expect(verifyToken(token)).toBeNull();
  });

  it("token with extra fields still extracts userId and email", async () => {
    const jwt = await import("jsonwebtoken");
    const secret = process.env.JWT_SECRET!;
    const token = jwt.default.sign(
      { userId: "user-7", email: "extra@test.com", role: "admin", extra: "ignored" },
      secret,
      { expiresIn: "1h" }
    );
    const { verifyToken } = await import("../lib/auth");
    const result = verifyToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user-7");
    expect(result!.email).toBe("extra@test.com");
  });
});

describe("getUserFromBearer", () => {
  it("returns user for valid JWT in Bearer header", async () => {
    const { signToken, getUserFromBearer } = await import("../lib/auth");
    const token = signToken({ userId: "u1", email: "bearer@test.com" });
    const req = {
      headers: new Headers({ authorization: `Bearer ${token}` }),
    } as unknown as import("next/server").NextRequest;
    const result = getUserFromBearer(req);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe("u1");
    expect(result!.email).toBe("bearer@test.com");
  });

  it("returns null for mk_ prefixed token (sync version)", async () => {
    const { getUserFromBearer } = await import("../lib/auth");
    const req = {
      headers: new Headers({ authorization: "Bearer mk_live_abc123def456" }),
    } as unknown as import("next/server").NextRequest;
    expect(getUserFromBearer(req)).toBeNull();
  });

  it("returns null when no authorization header", async () => {
    const { getUserFromBearer } = await import("../lib/auth");
    const req = {
      headers: new Headers(),
    } as unknown as import("next/server").NextRequest;
    expect(getUserFromBearer(req)).toBeNull();
  });

  it("returns null for non-Bearer auth scheme", async () => {
    const { getUserFromBearer } = await import("../lib/auth");
    const req = {
      headers: new Headers({ authorization: "Basic dXNlcjpwYXNz" }),
    } as unknown as import("next/server").NextRequest;
    expect(getUserFromBearer(req)).toBeNull();
  });
});

describe("verifyToken with malformed inputs", () => {
  it("returns null for empty string", async () => {
    const { verifyToken } = await import("../lib/auth");
    expect(verifyToken("")).toBeNull();
  });

  it("returns null for random garbage", async () => {
    const { verifyToken } = await import("../lib/auth");
    expect(verifyToken("not.a.jwt.at.all")).toBeNull();
  });

  it("returns null for a JWT signed with wrong secret", async () => {
    const jwt = await import("jsonwebtoken");
    const token = jwt.default.sign(
      { userId: "u1", email: "wrong@test.com" },
      "completely-different-secret-key-here!!"
    );
    const { verifyToken } = await import("../lib/auth");
    expect(verifyToken(token)).toBeNull();
  });

  it("returns null for a JWT missing userId", async () => {
    const jwt = await import("jsonwebtoken");
    const token = jwt.default.sign(
      { email: "noid@test.com" },
      process.env.JWT_SECRET!
    );
    const { verifyToken } = await import("../lib/auth");
    expect(verifyToken(token)).toBeNull();
  });

  it("returns null for a JWT missing email", async () => {
    const jwt = await import("jsonwebtoken");
    const token = jwt.default.sign(
      { userId: "u1" },
      process.env.JWT_SECRET!
    );
    const { verifyToken } = await import("../lib/auth");
    expect(verifyToken(token)).toBeNull();
  });

  it("returns null for a JWT with non-string email", async () => {
    const jwt = await import("jsonwebtoken");
    const token = jwt.default.sign(
      { userId: "u1", email: 12345 },
      process.env.JWT_SECRET!
    );
    const { verifyToken } = await import("../lib/auth");
    expect(verifyToken(token)).toBeNull();
  });
});
