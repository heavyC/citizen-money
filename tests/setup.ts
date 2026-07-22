import { vi } from "vitest";

// `server-only` throws outside Next's server compilation context; tests run
// under Vitest/Node, so make the import a no-op.
vi.mock("server-only", () => ({}));
