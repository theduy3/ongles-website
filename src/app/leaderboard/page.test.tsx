import { expect, it, mock } from "bun:test";
import type { ReactElement } from "react";
import { LeaderboardWidget } from "@/components/LeaderboardWidget";

let runtimeReads = 0;
mock.module("@/lib/store-config", () => ({
  getStoreConfig: async () => {
    runtimeReads += 1;
    return {
      site: {
        storeId: "OM",
        widgetHost: "https://app.onglesmaily.com",
      },
    };
  },
}));

const { default: LeaderboardPage } = await import("./page");

it("renders without waiting for runtime store settings", async () => {
  const element = (await LeaderboardPage()) as ReactElement;

  expect(element.type).toBe(LeaderboardWidget);
  expect(runtimeReads).toBe(0);
});
