import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { uploadPhoto } from "../src/lib/r2.js";

const R2_ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
] as const;

describe("uploadPhoto config validation", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of R2_ENV_KEYS) {
      originalEnv[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of R2_ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it("throws a clear error when R2_PUBLIC_BASE_URL is missing", async () => {
    process.env.R2_ACCOUNT_ID = "test-account";
    process.env.R2_ACCESS_KEY_ID = "test-key";
    process.env.R2_SECRET_ACCESS_KEY = "test-secret";
    process.env.R2_BUCKET = "test-bucket";
    delete process.env.R2_PUBLIC_BASE_URL;

    await expect(uploadPhoto("products/x/y", Buffer.from("data"), "image/jpeg")).rejects.toThrow(
      /R2 is not configured: missing R2_PUBLIC_BASE_URL/
    );
  });

  it("throws a clear error when nothing is configured", async () => {
    for (const key of R2_ENV_KEYS) {
      delete process.env[key];
    }

    await expect(uploadPhoto("products/x/y", Buffer.from("data"), "image/jpeg")).rejects.toThrow(
      /R2 is not configured/
    );
  });
});
