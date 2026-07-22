import { expect, it, mock } from "bun:test";
import type { ReactElement } from "react";
import { TopEmployeeWidget } from "@/components/TopEmployeeWidget";

mock.module("@/lib/store-config", () => ({
  getStoreConfig: async () => ({
    site: {
      storeId: "OM",
      widgetHost: "https://app.onglesmaily.com",
    },
  }),
}));

const { default: TopEmployeePage } = await import("./page");

it("passes the runtime store configuration to the EOM widget", async () => {
  const element = (await TopEmployeePage()) as ReactElement<{
    storeId: string;
    widgetHost: string;
  }>;

  expect(element.type).toBe(TopEmployeeWidget);
  expect(element.props.storeId).toBe("OM");
  expect(element.props.widgetHost).toBe("https://app.onglesmaily.com");
});
