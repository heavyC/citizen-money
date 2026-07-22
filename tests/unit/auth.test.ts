import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null })),
  currentUser: vi.fn(),
}));

const { requireUserId, UnauthorizedError } = await import("@/lib/auth");

describe("requireUserId", () => {
  it("throws UnauthorizedError when there is no Clerk session", async () => {
    await expect(requireUserId()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
