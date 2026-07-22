import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { WidgetEmbed } from "@/components/WidgetEmbed";
import { TopEmployeeWidget } from "@/components/TopEmployeeWidget";

describe("TopEmployeeWidget", () => {
  it("binds the EOM script and store attribute", () => {
    const element = TopEmployeeWidget({}) as ReactElement<{
      src: string;
      store: string;
      storeAttr: string;
    }>;

    expect(element.type).toBe(WidgetEmbed);
    expect(element.props.src).toBe(
      "https://app.onglesmaily.com/widgets/eom-widget.js",
    );
    expect(element.props.store).toBe("OM");
    expect(element.props.storeAttr).toBe("data-eom-store");
  });
});
