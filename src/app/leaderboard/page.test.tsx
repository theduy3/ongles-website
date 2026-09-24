import { expect, it, mock } from "bun:test";
import type { ReactElement } from "react";
import { LeaderboardWidget } from "@/components/LeaderboardWidget";

let runtimeReads = 0;
mock.module("@/lib/store-config", () => ({
  getStoreConfig: async () => {
    runtimeReads += 1;
    return {
      site: {
        storeId: "OQ",
        widgetHost: "https://app.onglesquebec.com",
      },
    };
  },
}));

const { default: LeaderboardPage } = await import("./page");

it("passes storeId/widgetHost from getStoreConfig", async () => {
  const element = (await LeaderboardPage()) as ReactElement;

  expect(element.type).toBe(LeaderboardWidget);
  expect(runtimeReads).toBe(1);
  expect((element.props as { storeId?: string }).storeId).toBe("OQ");
  expect((element.props as { widgetHost?: string }).widgetHost).toBe(
    "https://app.onglesquebec.com",
  );
});
