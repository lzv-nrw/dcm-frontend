import { MouseEventHandler } from "react";
import { Spinner } from "flowbite-react";
import { FiTrash2 } from "react-icons/fi";

import {
  Template,
  OAITemplateInfo,
  HotfolderTemplateInfo,
  PluginTemplateInfo,
} from "../../types";
import t from "../../utils/translation";
import useGlobalStore from "../../store";

interface TemplateDisplayProps {
  template?: Template;
  full?: boolean;
  onClick?: MouseEventHandler;
  onTrash?: MouseEventHandler;
}

function TemplateDetails({ template, full }: TemplateDisplayProps) {
  const hotfolders = useGlobalStore((state) => state.template.hotfolders);
  const archives = useGlobalStore((state) => state.template.archives);
  const acl = useGlobalStore((state) => state.session.acl);

  return template ? (
    <>
      <p className="text-sm text-gray-500 mb-4 dcm-clamp-text">
        {`${t("Verbindungsart")}: ${
          template.type ? `"${template.type}"` : t("Nicht ausgewählt")
        }`}
      </p>
      {full && (
        <>
          <div className="flex flex-row space-x-2 dcm-clamp-text">
            <span>{t("Quelle")}:</span>
            <span>
              {!template.type && t("Nicht ausgewählt")}
              {template.type === "oai"
                ? (template.additionalInformation as OAITemplateInfo)?.url
                  ? (template.additionalInformation as OAITemplateInfo)?.url
                  : t("Nicht ausgewählt")
                : null}
              {template.type === "hotfolder"
                ? acl?.READ_TEMPLATE
                  ? (template.additionalInformation as HotfolderTemplateInfo)
                      ?.sourceId
                    ? hotfolders[
                        (
                          template.additionalInformation as HotfolderTemplateInfo
                        )?.sourceId ?? ""
                      ]?.name
                      ? hotfolders[
                          (
                            template.additionalInformation as HotfolderTemplateInfo
                          )?.sourceId ?? ""
                        ].name
                      : t("Unbekannter Hotfolder (nicht mehr verfügbar)")
                    : t("Nicht ausgewählt")
                  : t("Zugriff verweigert")
                : null}
              {template.type === "plugin"
                ? (template.additionalInformation as PluginTemplateInfo)?.plugin
                  ? (template.additionalInformation as PluginTemplateInfo)
                      ?.plugin +
                    "-" +
                    t("Plugin")
                  : t("Nicht ausgewählt")
                : null}
            </span>
          </div>
          <div className="flex flex-row space-x-2 dcm-clamp-text">
            <span>{t("Ziel")}:</span>
            <span>
              {acl?.READ_TEMPLATE
                ? template.targetArchive?.id
                  ? archives[template.targetArchive?.id]
                    ? archives[template.targetArchive?.id].name
                    : t("Unbekanntes Zielsystem (nicht mehr verfügbar)")
                  : t("Nicht ausgewählt")
                : t("Zugriff verweigert")}
            </span>
          </div>
        </>
      )}
    </>
  ) : null;
}

export default function TemplateDisplay({
  template,
  full,
  onClick,
  onTrash,
}: TemplateDisplayProps) {
  return template ? (
    <div
      className="relative w-full flex flex-col px-2 py-1 rounded font-medium"
      onClick={onClick}
    >
      <div className="flex flex-row max-w-[calc(100%-25px)]">
        <p
          className={
            "dcm-clamp-text " +
            (template.status === "draft" ? "max-w-[70%] mr-2" : "")
          }
        >
          {template.name}
        </p>
        {template.status === "draft" && (
          <p className="text-gray-400 max-w-[30%] dcm-clamp-text">
            {t("(Entwurf)")}
          </p>
        )}
      </div>
      <div className="text-sm text-gray-500 ">
        <TemplateDetails template={template} full={full} />
      </div>
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
