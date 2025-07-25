import { Card } from "flowbite-react";

import t from "../../utils/translation";
import {
  HotfolderTemplateInfo,
  OAITemplateInfo,
  PluginTemplateInfo,
  Template,
} from "../../types";
import useGlobalStore from "../../store";

interface TemplateItemDetailsProps {
  template: Template;
}

function PluginDetails({ template }: TemplateItemDetailsProps) {
  return (
    <div className="flex flex-row space-x-2">
      <span>{t("Spezifisches Plugin")}:</span>
      <span className="break-all">
        {(template.additionalInformation as PluginTemplateInfo).plugin}-
        {t("Plugin")}
      </span>
      ;
      <span className="flex flex-row text-gray-400">
        {t("Konfiguration: ")}
        <pre className="mx-2 break-all">
          {JSON.stringify(
            (template.additionalInformation as PluginTemplateInfo).args
          )}
        </pre>
      </span>
    </div>
  );
}

function HotfolderDetails({ template }: TemplateItemDetailsProps) {
  const hotfolderSources = useGlobalStore(
    (state) => state.template.hotfolderImportSources
  );

  return (
    <div className="flex flex-row space-x-2">
      <span>{t("Hotfolder")}:</span>
      <span className="break-all">
        {
          hotfolderSources[
            (template.additionalInformation as HotfolderTemplateInfo)
              .sourceId ?? ""
          ]?.name
        }
      </span>
    </div>
  );
}

function OAIDetails({ template }: TemplateItemDetailsProps) {
  return (
    <div className="flex flex-row space-x-2">
      <span>{t("OAI-PMH")}:</span>
      <span className="break-all">{(template.additionalInformation as OAITemplateInfo)?.url}</span>
    </div>
  );
}

export interface TemplateItemProps {
  template: Template;
}

export default function TemplateItem({ template }: TemplateItemProps) {
  return (
    <Card className="max-w-7xl mb-6">
      <h5 className="text-2xl font-bold tracking-tight text-gray-900 dcm-clamp-text">
        {template.name}
      </h5>
      <div className="font-normal text-gray-700">
        {template.description ? (
          <div className="mb-2 block">
            <span className="font-bold">{t("Beschreibung")}:</span>
            <span className="ml-2 break-all">{template.description}</span>
          </div>
        ) : null}
        {template.type === "plugin" ? (
          <PluginDetails template={template} />
        ) : null}
        {template.type === "hotfolder" ? (
          <HotfolderDetails template={template} />
        ) : null}
        {template.type === "oai" ? <OAIDetails template={template} /> : null}
      </div>
    </Card>
  );
}
