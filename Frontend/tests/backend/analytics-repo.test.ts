import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  prospect: {
    count: vi.fn(),
  },
  $queryRaw: vi.fn(),
}));

vi.mock("../../../Backend/src/db/prismaClient.js", () => ({
  default: prismaMock,
}));

import AnalyticsRepository from "../../../Backend/src/repo/analytics.repo.js";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-27T15:45:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AnalyticsRepository", () => {
  it("counts overdue follow-ups using active pipeline rules", async () => {
    prismaMock.prospect.count.mockResolvedValue(4);

    const repo = new AnalyticsRepository();
    await repo.getOverdueCount();

    expect(prismaMock.prospect.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        completed: false,
        stage: { not: "Pilot Closed" },
        nextFollowUpDate: {
          lt: new Date("2026-06-26T18:30:00.000Z"),
        },
      },
    });
  });
});
