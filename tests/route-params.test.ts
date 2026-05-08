import { describe, expect, it } from "vitest";
import { decodeRouteParam, encodeRouteParam } from "@/lib/route-params";

describe("decodeRouteParam", () => {
  it("decodes percent-encoded route params", () => {
    expect(decodeRouteParam("%E8%82%A4%E7%AC%BC")).toBe("肤笼");
  });

  it("returns the original value when the param is already decoded", () => {
    expect(decodeRouteParam("肤笼")).toBe("肤笼");
  });

  it("falls back to the original value when decoding would throw", () => {
    expect(decodeRouteParam("%E8%82%A4%E7%AC")).toBe("%E8%82%A4%E7%AC");
  });
});

describe("encodeRouteParam", () => {
  it("encodes unicode route params for redirect-safe urls", () => {
    expect(encodeRouteParam("肤笼")).toBe("%E8%82%A4%E7%AC%BC");
  });
});
