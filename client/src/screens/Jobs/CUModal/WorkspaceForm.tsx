import { useState } from "react";
import { Card } from "flowbite-react";

import t from "../../../utils/translation";
import { Workspace } from "../../../types";
import useGlobalStore from "../../../store";

interface WorkspaceFormProps {
  onSelect?: (workspace: Workspace) => void;
}

export default function WorkspaceForm({ onSelect }: WorkspaceFormProps) {
  const workspaces = useGlobalStore((state) => state.workspace.workspaces);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(
    null
  );

  return (
    <div>
      <h3 className="font-bold">
        {t("In welchem Arbeitsbereich soll der Job angelegt werden?")}
      </h3>
      {
        <div className="relative grid grid-cols-3 gap-10">
          {Object.values(workspaces)
            .sort((a, b) => (a.name > b.name ? 1 : -1))
            .map((workspace) => (
              <Card
                key={workspace.id}
                className={
                  "flex justify-start items-start h-40 my-4 bg-white hover:bg-gray-100 transition duration-200 ease-in-out hover:cursor-pointer" +
                  (activeWorkspace === workspace
                    ? " text-cyan-700 border-cyan-700"
                    : "")
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(workspace);
                  setActiveWorkspace(workspace);
                }}
              >
                <div className="flex justify-start h-full items-start">
                  <span className="select-none dcm-clamp-text">
                    {workspace.name}
                  </span>
                </div>
              </Card>
            ))}
        </div>
      }
    </div>
  );
}
