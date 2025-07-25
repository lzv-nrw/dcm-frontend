import { MouseEventHandler } from "react";
import { Spinner } from "flowbite-react";
import { FiTrash2 } from "react-icons/fi";

import { Template } from "../../types";
import t from "../../utils/translation";

interface TemplateDisplayProps {
  template?: Template;
  onClick?: MouseEventHandler;
  onTrash?: MouseEventHandler;
}

export default function TemplateDisplay({
  template,
  onClick,
  onTrash,
}: TemplateDisplayProps) {
  return template ? (
    <div
      className="relative w-full flex flex-col px-2 py-1 space-y-2 rounded font-medium"
      onClick={onClick}
    >
      <p className="dcm-clamp-text">{template.name}</p>
      <p className="text-sm text-gray-500">
        {t("Verbindungsart")}: "{template.type}"
      </p>
      {onTrash ? (
        <div
          onClick={onTrash}
          className="right-0 top-0 absolute p-1 rounded-full text-gray-500 hover:text-black hover:bg-gray-200 hover:cursor-pointer"
        >
          <FiTrash2 size="20" />
        </div>
      ) : null}
    </div>
  ) : (
    <Spinner />
  );
}
