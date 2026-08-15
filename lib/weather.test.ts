import { describe, it, expect } from "vitest";
import {
  parseWeather,
  describeWeather,
  compassDir,
  isRoughSea,
  type TabarcaWeather,
} from "./weather";

const forecastFixture = {
  current: {
    temperature_2m: 27.4,
    apparent_temperature: 29.1,
    weather_code: 1,
    wind_speed_10m: 18.2,
    wind_gusts_10m: 31.7,
    wind_direction_10m: 225,
  },
};
const marineFixture = { current: { wave_height: 0.42, wave_period: 4.6 } };

describe("parseWeather", () => {
  it("parses combined forecast + marine payloads", () => {
    const w = parseWeather(forecastFixture, marineFixture)!;
    expect(w.tempC).toBe(27.4);
    expect(w.feelsC).toBe(29.1);
    expect(w.code).toBe(1);
    expect(w.windKmh).toBe(18.2);
    expect(w.gustKmh).toBe(31.7);
    expect(w.waveM).toBe(0.42);
  });

  it("survives a missing marine payload", () => {
    const w = parseWeather(forecastFixture, null)!;
    expect(w.waveM).toBeNull();
    expect(w.tempC).toBe(27.4);
  });

  it("returns null without a usable forecast", () => {
    expect(parseWeather(null, marineFixture)).toBeNull();
    expect(parseWeather({}, marineFixture)).toBeNull();
    expect(parseWeather({ current: { temperature_2m: "hot" } }, null)).toBeNull();
  });
});

describe("describeWeather", () => {
  it("localizes common codes", () => {
    expect(describeWeather(0, "es").label).toBe("despejado");
    expect(describeWeather(0, "en").label).toBe("clear");
    expect(describeWeather(95, "en").icon).toBe("⛈️");
    expect(describeWeather(61, "es").label).toBe("lluvia");
  });

  it("falls back for unknown codes", () => {
    expect(describeWeather(42, "en").label).toBe("clouds");
  });
});

describe("compassDir", () => {
  it("maps degrees to localized compass points", () => {
    expect(compassDir(0, "en")).toBe("N");
    expect(compassDir(225, "en")).toBe("SW");
    expect(compassDir(225, "es")).toBe("SO");
    expect(compassDir(270, "es")).toBe("O");
    expect(compassDir(359, "en")).toBe("N");
    expect(compassDir(-45, "en")).toBe("NW");
  });
});

describe("isRoughSea", () => {
  const calm: TabarcaWeather = {
    tempC: 27, feelsC: 28, code: 0, windKmh: 15, gustKmh: 25, windDirDeg: 90,
    waveM: 0.4, wavePeriodS: 4,
  };

  it("is false in calm conditions", () => {
    expect(isRoughSea(calm)).toBe(false);
  });

  it("triggers on strong gusts or high waves", () => {
    expect(isRoughSea({ ...calm, gustKmh: 45 })).toBe(true);
    expect(isRoughSea({ ...calm, waveM: 1.5 })).toBe(true);
  });

  it("ignores missing wave data", () => {
    expect(isRoughSea({ ...calm, waveM: null })).toBe(false);
  });
});
