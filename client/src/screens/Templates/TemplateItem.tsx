import { useState } from "react";
import { Button, Card, Spinner } from "flowbite-react";
import { FiEdit3, FiTrash2 } from "react-icons/fi";

import t from "../../utils/translation";
import {
  HotfolderTemplateInfo,
  OAITemplateInfo,
  PluginTemplateInfo,
  Template,
} from "../../types";
import useGlobalStore from "../../store";
import { credentialsValue, host } from "../../App";
import ConfirmModal from "../../components/ConfirmModal";
import CUModal from "./CUModal/Modal";
import { useFormStore } from "./CUModal/store";

interface TemplateItemDetailsProps {
  template: Template;
}

function PluginDetails({ template }: TemplateItemDetailsProps) {
  return (
    <>
      {(template.additionalInformation as PluginTemplateInfo).plugin ? (
        <div className="flex flex-row space-x-2 text-nowrap overflow-hidden">
          <span>{t("Spezifisches Plugin")}:</span>
          <span>
            {(template.additionalInformation as PluginTemplateInfo).plugin}-
            {t("Plugin")}
          </span>
          ;<span className="text-gray-400">{t("Konfiguration")}:</span>
          <pre className="text-gray-400">
            {JSON.stringify(
              (template.additionalInformation as PluginTemplateInfo).args
            )}
          </pre>
        </div>
      ) : null}
    </>
  );
}

function HotfolderDetails({ template }: TemplateItemDetailsProps) {
  const hotfolderSources = useGlobalStore(
    (state) => state.template.hotfolderImportSources
  );

  return (
    <>
      {(template.additionalInformation as HotfolderTemplateInfo).sourceId ? (
        <div className="flex flex-row space-x-2 dcm-clamp-text">
          <span>{t("Hotfolder")}:</span>
          <span>
            {
              hotfolderSources[
                (template.additionalInformation as HotfolderTemplateInfo)
                  .sourceId ?? ""
              ]?.name
            }
          </span>
        </div>
      ) : null}
    </>
  );
}

function OAIDetails({ template }: TemplateItemDetailsProps) {
  return (
    <>
      {(template.additionalInformation as OAITemplateInfo)?.url ? (
        <div className="flex flex-row space-x-2 dcm-clamp-text">
          <span>{t("OAI-Endpunkt")}:</span>
          <span>
            {(template.additionalInformation as OAITemplateInfo)?.url}
          </span>
        </div>
      ) : null}
    </>
  );
}

export interface TemplateItemProps {
  template: Template;
}

export default function TemplateItem({ template }: TemplateItemProps) {
  const acl = useGlobalStore((state) => state.session.acl);
  const fetchList = useGlobalStore((state) => state.template.fetchList);
  const workspace = useGlobalStore(
    (state) => state.workspace.workspaces[template?.workspaceId ?? ""]
  );
  const [showCUModal, setShowCUModal] = useState(false);
  const initFromConfig = useFormStore((state) => state.initFromConfig);

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  return (
    <Card
      className={
        "relative mb-6 " +
        (template.status === "draft"
          ? "shadow-none bg-gray-100 border-gray-100"
          : "")
      }
    >
      <div className="h-36">
        <h5 className="flex flex-row justify-between mb-1">
          <div className="text-xl w-full flex flex-row items-end">
            <span className="font-bold mr-2 max-w-[50%] dcm-clamp-text">
              {template.name && template.name !== ""
                ? template.name
                : t("Unbenanntes Template")}
            </span>
            <span className="mr-2 max-w-[35%] dcm-clamp-text">
              {workspace
                ? workspace?.name ?? t("Unbekannter Arbeitsbereich")
                : null}
            </span>
            {template.status === "draft" && (
              <span className="text-gray-400">{t("(Entwurf)")}</span>
            )}
          </div>
          <div className="flex flex-row space-x-1 text-">
            {acl?.MODIFY_TEMPLATE ? (
              <>
                <Button
                  className="p-0 aspect-square items-center"
                  size="xs"
                  onClick={() => {
                    initFromConfig(template);
                    setShowCUModal(true);
                  }}
                >
                  <FiEdit3 size={20} />
                </Button>
                <CUModal
                  show={showCUModal}
                  onClose={() => setShowCUModal(false)}
                />
              </>
            ) : null}
            {acl?.DELETE_TEMPLATE ? (
              <>
                <Button
                  className="p-0 aspect-square items-center"
                  size="xs"
                  disabled={
                    loadingDelete ||
                    (template.linkedJobs ?? 0) > 0 ||
                    template.id === undefined
                  }
                  onClick={() => {
                    setLoadingDelete(true);
                    setShowConfirmDeleteModal(true);
                  }}
                >
                  {loadingDelete ? (
                    <Spinner size="sm" />
                  ) : (
                    <FiTrash2 size={20} />
                  )}
                </Button>
                <ConfirmModal
                  show={showConfirmDeleteModal}
                  title={t("Löschen")}
                  onConfirm={() => {
                    setShowConfirmDeleteModal(false);
                    fetch(
                      host +
                        "/api/admin/template?" +
                        new URLSearchParams({
                          id: template.id ?? "",
                        }).toString(),
                      {
                        method: "DELETE",
                        credentials: credentialsValue,
                      }
                    )
                      .then(async (response) => {
                        setLoadingDelete(false);
                        if (!response.ok) {
                          throw new Error(
                            `Unexpected response (${await response.text()}).`
                          );
                        }
                        fetchList({ replace: true });
                      })
                      .catch((error) => {
                        setLoadingDelete(false);
                        alert(error.message);
                        fetchList({ replace: true });
                      });
                  }}
                  onCancel={() => {
                    setShowConfirmDeleteModal(false);
                    setLoadingDelete(false);
                  }}
                >
                  <span>
                    {template.name
                      ? t(`Template '${template.name}' löschen?`)
                      : t("Unbenanntes Template löschen?")}
                  </span>
                </ConfirmModal>
              </>
            ) : null}
          </div>
        </h5>
        <div className="flex flex-col space-y-2 font-normal">
          {template.description ? (
            <span className="h-12 dcm-clamp-text-2">
              {template.description}
            </span>
          ) : null}
          {template.type === "plugin" ? (
            <PluginDetails template={template} />
          ) : null}
          {template.type === "hotfolder" ? (
            <HotfolderDetails template={template} />
          ) : null}
          {template.type === "oai" ? <OAIDetails template={template} /> : null}
          {template.status === "draft" ? null : template.linkedJobs !==
            undefined ? (
            <span className="dcm-clamp-text">
              {t(
                template.linkedJobs === 0
                  ? "Keine Jobs verknüpft"
                  : template.linkedJobs === 1
                  ? "ein Job verknüpft"
                  : `${template.linkedJobs} Jobs verknüpft`
              )}
            </span>
          ) : (
            <span className="text-gray-300 dcm-clamp-text">
              {t("Fehler beim Laden der verknüpften Jobs.")}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
