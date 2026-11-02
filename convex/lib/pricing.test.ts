import { describe, expect, it } from "vitest";
import { tierForCardCount, tierRangeLabel, tierInfo } from "./pricing";

describe("Preisstufen nach Kundenzahl", () => {
  it("ordnet die Grenzen korrekt zu", () => {
    expect(tierForCardCount(0)).toBe("free");
    expect(tierForCardCount(25)).toBe("free");
    expect(tierForCardCount(26)).toBe("starter");
    expect(tierForCardCount(75)).toBe("starter");
    expect(tierForCardCount(76)).toBe("business");
    expect(tierForCardCount(200)).toBe("business");
    expect(tierForCardCount(201)).toBe("premium");
    expect(tierForCardCount(10_000)).toBe("premium");
  });

  it("verträgt ungültige Werte", () => {
    expect(tierForCardCount(-3)).toBe("free");
    expect(tierForCardCount(NaN)).toBe("free");
  });

  it("liefert Preise und Bereichstexte", () => {
    expect(tierInfo("starter").monthly).toBe(10);
    expect(tierInfo("premium").monthly).toBe(30);
    expect(tierRangeLabel("free")).toBe("bis 25 Kunden");
    expect(tierRangeLabel("starter")).toBe("26 bis 75 Kunden");
    expect(tierRangeLabel("premium")).toBe("ab 201 Kunden");
  });
});
