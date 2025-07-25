import { WidgetInfo } from "./types";
import DemoWidget from "./Demo/DemoWidget";
import UnknownWidget from "./Unknown/UnknownWidget";

const WidgetCatalog: Record<string, WidgetInfo> = {
  [DemoWidget.id]: DemoWidget,
  [UnknownWidget.id]: UnknownWidget,
};

export default WidgetCatalog;
