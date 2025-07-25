import { Card } from "flowbite-react";

import { WidgetInfo } from "../types";
import NewWidgetModal from "./NewWidgetModal";

function _DemoWidget({ title, color }: { title: string; color: string }) {
  return (
    <Card
      className={"h-full w-full flex flex-col items-start"}
      theme={{ root: { children: "flex flex-col p-4 h-full w-full" } }}
    >
      <h5 className="text-xl font-bold pb-2 dcm-clamp-text">{title}</h5>
      <div className={"h-full w-full " + color}></div>
    </Card>
  );
}

const DemoWidget: WidgetInfo = {
  id: "demo",
  name: "Demo",
  width: 3,
  height: 3,
  Component: _DemoWidget,
  NewWidgetModal: NewWidgetModal,
  // FIXME: requirementsMet: () => devMode,
  requirementsMet: () => true,
};

export default DemoWidget;
