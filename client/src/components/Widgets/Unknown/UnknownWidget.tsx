// placeholder that is used if unknown widget-id is requested

import { Card } from "flowbite-react";

import { WidgetInfo } from "../types";

function _UnknownWidget(props: any) {
  return <Card className={"h-full font-bold pl-8"}>?</Card>;
}

const UnknownWidget: WidgetInfo = {
  id: "unknown",
  name: "Unknown",
  width: 1,
  height: 1,
  Component: _UnknownWidget,
  requirementsMet: () => true,
};

export default UnknownWidget;
