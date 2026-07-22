import { expect, it, mock } from "bun:test";
import type { ReactElement } from "react";
import { TopEmployeeWidget } from "@/components/TopEmployeeWidget";

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

const { default: TopEmployeePage } = await import("./page");

it("renders without waiting for runtime store settings", async () => {
  const element = (await TopEmployeePage()) as ReactElement;

  expect(element.type).toBe(TopEmployeeWidget);
  expect(runtimeReads).toBe(0);
});
