import { describe, it, expect } from "vitest";
import { distanceKm, nearestPort, PORT_COORDS, TABARCA_CENTRE } from "./geo";

describe("distanceKm", () => {
  it("is zero for the same point and symmetric", () => {
    expect(distanceKm(38.19, -0.556, 38.19, -0.556)).toBe(0);
    const ab = distanceKm(38.1897, -0.5565, 38.3405, -0.484);
    const ba = distanceKm(38.3405, -0.484, 38.1897, -0.5565);
    expect(ab).toBeCloseTo(ba, 9);
  });

  it("matches the real crossing: Santa Pola quay to Tabarca is about 7 km", () => {
    const sp = PORT_COORDS["santa-pola"];
    const km = distanceKm(sp.lat, sp.lon, TABARCA_CENTRE.lat, TABARCA_CENTRE.lon);
    expect(km).toBeGreaterThan(6.5);
    expect(km).toBeLessThan(8.5);
  });
});

describe("nearestPort", () => {
  it("picks each harbour for someone standing in that town", () => {
    expect(nearestPort(38.1915, -0.5585)?.slug).toBe("santa-pola"); // Santa Pola centre
    expect(nearestPort(38.3452, -0.481)?.slug).toBe("alicante"); // Alicante, Explanada
    expect(nearestPort(37.978, -0.682)?.slug).toBe("torrevieja"); // Torrevieja seafront
  });

  it("returns the island (return boats) for someone on Tabarca", () => {
    expect(nearestPort(38.1667, -0.476)).toEqual({ slug: "tabarca", km: expect.any(Number) });
    // West tip of the island is still the island.
    expect(nearestPort(38.1645, -0.489)?.slug).toBe("tabarca");
  });

  it("does not mistake the nearby mainland cape for the island", () => {
    // Cabo de Santa Pola lighthouse: ~4 km from Tabarca, on the mainland.
    expect(nearestPort(38.21, -0.513)?.slug).toBe("santa-pola");
  });

  it("chooses the closest quay inland, with a rounded distance", () => {
    const elche = nearestPort(38.2669, -0.6984); // Elche: Santa Pola is closer than Alicante
    expect(elche?.slug).toBe("santa-pola");
    expect(elche!.km).toBeGreaterThan(10);
    expect(elche!.km).toBeLessThan(20);
    expect(Number.isInteger(elche!.km * 10)).toBe(true);
  });

  it("makes no guess far from every port", () => {
    expect(nearestPort(40.4168, -3.7038)).toBeNull(); // Madrid
    expect(nearestPort(51.5074, -0.1278)).toBeNull(); // London
  });
});
