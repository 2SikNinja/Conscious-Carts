import { describe, expect, it } from "vitest";

import { MissingFirebaseConfigError, parseFirebaseConfig } from "./config";

const validConfig = {
  apiKey: "test-api-key",
  authDomain: "demo.firebaseapp.com",
  projectId: "demo",
  storageBucket: undefined,
  messagingSenderId: "123",
  appId: "1:123:web:abc",
};

describe("parseFirebaseConfig", () => {
  it("accepts a complete config and drops empty optional values", () => {
    const config = parseFirebaseConfig(validConfig);
    expect(config.projectId).toBe("demo");
    expect(config).not.toHaveProperty("storageBucket");
  });

  it("trims whitespace from values", () => {
    const config = parseFirebaseConfig({ ...validConfig, projectId: "  demo  " });
    expect(config.projectId).toBe("demo");
  });

  it("lists every missing required key", () => {
    try {
      parseFirebaseConfig({ ...validConfig, apiKey: "", appId: undefined });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MissingFirebaseConfigError);
      expect((error as MissingFirebaseConfigError).missingKeys).toEqual(["apiKey", "appId"]);
    }
  });
});
