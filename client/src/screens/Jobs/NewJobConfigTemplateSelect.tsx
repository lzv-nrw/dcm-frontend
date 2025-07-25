import { ListGroup } from "flowbite-react";

import t from "../../utils/translation";
import { Template, Workspace } from "../../types";
import useGlobalStore from "../../store";

interface NewJobConfigTemplateSelectProps {
  workspace: Workspace;
  onSelect?: (template: Template) => void;
}

export default function NewJobConfigTemplateSelect({
  onSelect,
  workspace,
}: NewJobConfigTemplateSelectProps) {
  const templates = useGlobalStore((state) => state.template.templates);

  return (
    <div>
      <h3 className="font-bold">
        {t("Bitte wählen Sie ein Template für Ihren Job aus")}
      </h3>
      <ListGroup className="my-2">
        {Object.values(templates)
          .filter(
            ({ id, status }) =>
              status !== "draft" &&
              id &&
              (workspace.templates || []).includes(id)
          )
          .sort((a, b) => ((a.name ?? "") > (b.name ?? "") ? 1 : -1))
          .map((template) => (
            <ListGroup.Item
              key={template.id}
              onClick={() => onSelect?.(template)}
            >
              <span className="flex text-left my-2 font-semibold dcm-clamp-text">{template.name}</span>
              <span className="my-2 ml-6 text-left dcm-clamp-text">{template.description ?? "-"}</span>
            </ListGroup.Item>
          ))}
      </ListGroup>
    </div>
  );
}
