import { useState, useEffect, createContext } from "react";
import { Alert, Label, Select, Button, TextInput } from "flowbite-react";
import { Navigate } from "react-router";

import t from "../../utils/translation";
import { truncateText } from "../../utils/forms";
import { genericSort } from "../../utils/genericSort";
import { HotfolderTemplateInfo, Template } from "../../types";
import useGlobalStore from "../../store";
import MessageBox, {
  MessageHandler,
  useMessageHandler,
} from "../../components/MessageBox";
import TemplateItem from "./TemplateItem";
import CUModal from "./CUModal/Modal";

type SortBy = keyof Template;

export const ErrorMessageContext = createContext<MessageHandler | undefined>(
  undefined
);

interface TemplatesScreenProps {
  useACL?: boolean;
}

export default function TemplatesScreen({
  useACL = false,
}: TemplatesScreenProps) {
  const errorMessageHandler = useMessageHandler([]);

  const templateStore = useGlobalStore((state) => state.template);
  const workspaceStore = useGlobalStore((state) => state.workspace);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [filter, setFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [searchFor, setSearchFor] = useState<string | null>(null);

  const acl = useGlobalStore((state) => state.session.acl);

  // run store-logic
  // * fetch all hotfolders on first load
  useEffect(
    () =>
      templateStore.fetchHotfolders({
        useACL: useACL,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: "fetch-hotfolders",
            text: msg,
          }),
      }),
    // eslint-disable-next-line
    [useACL]
  );
  // * fetch all templateIds on first load
  useEffect(
    () =>
      templateStore.fetchList({
        useACL: useACL,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: "fetch-template-config-list",
            text: msg,
          }),
      }),
    // eslint-disable-next-line
    [useACL]
  );
  // * fetch Templates if templateIds changed
  useEffect(() => {
    for (const templateId of templateStore.templateIds) {
      templateStore.fetchTemplate({
        templateId,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: `fetch-template-config-${templateId}`,
            text: msg,
          }),
      });
    }
    // eslint-disable-next-line
  }, [templateStore.templateIds]);
  // * fetch all workspaceIds on first load
  useEffect(
    () =>
      workspaceStore.fetchList({
        useACL: useACL,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: "fetch-workspace-config-list",
            text: msg,
          }),
      }),
    // eslint-disable-next-line
    [useACL]
  );
  // * fetch Workspaces if workspaceIds changed
  useEffect(() => {
    for (const workspaceId of workspaceStore.workspaceIds) {
      workspaceStore.fetchWorkspace({
        workspaceId,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: `fetch-workspace-config-${workspaceId}`,
            text: msg,
          }),
      });
    }
    // eslint-disable-next-line
  }, [workspaceStore.workspaceIds]);
  // end run store-logic

  /**
   * Extracts an array of workspaces and checks whether the specified
   * template IDs are present in the corresponding template array of
   * the workspace.
   * @param templates Array of templates.
   * @returns An array of available workspace ids.
   */
  function findWorkspaceIds(templates: Template[]): string[] {
    return Array.from(
      new Set(
        templates
          .map((template) =>
            Object.values(workspaceStore.workspaces)
              .filter(
                (workspace) =>
                  template.id && workspace.templates?.includes(template.id)
              )
              .map((workspace) => workspace.id)
          )
          .reduce((p, c) => p.concat(c), [])
      )
    );
  }

  /**
   * Helper for filtering templates with respect to workspace.
   * @param selectedWorkspace Workspace-identifier to be filter for.
   * @returns True if template is assigned to a workspace or workspace is empty string.
   */
  function hasWorkspace(
    selectedWorkspace: string,
    template: Template
  ): boolean {
    if (selectedWorkspace === "") return true;

    for (const workspace of Object.values(workspaceStore.workspaces)) {
      if (
        template.id &&
        workspace.id === selectedWorkspace &&
        workspace.templates?.includes(template.id)
      ) {
        return true;
      }
    }

    return false;
  }

  return useACL && !acl?.VIEW_SCREEN_TEMPLATES ? (
    <Navigate to="/" replace />
  ) : (
    <ErrorMessageContext.Provider value={errorMessageHandler}>
      <div className="mx-20 mt-4">
        <div className="flex justify-between items-center relative w-full mb-5">
          <h3 className="text-4xl font-bold">{t("Templates")}</h3>
          {useACL && !acl?.CREATE_TEMPLATE ? null : (
            <Button onClick={() => setShowNewTemplateModal(true)} type="button">
              {t("Template erstellen")}
            </Button>
          )}
          <CUModal
            show={showNewTemplateModal}
            onClose={() => setShowNewTemplateModal(false)}
          />
        </div>
        <MessageBox
          messages={errorMessageHandler.messages}
          messageTitle={t("Ein Fehler ist aufgetreten:")}
          onDismiss={errorMessageHandler.clearMessages}
        />
        {useACL && !acl?.READ_TEMPLATE ? (
          <Alert className="my-2" color="warning">
            {t("Kein Lese-Zugriff auf Templatekonfigurationen.")}
          </Alert>
        ) : (
          <>
            <div className="flex justify-between items-center relative w-full my-4">
              <div className="flex flex-row space-x-2 items-center px-2">
                <Label
                  className="min-w-20 mx-2"
                  htmlFor="workspaceFilter"
                  value={t("Filtern nach")}
                />
                <Select
                  className="min-w-32"
                  id="workspaceFilter"
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="">{t("Arbeitsbereich")}</option>
                  {findWorkspaceIds(Object.values(templateStore.templates))
                    .sort((a, b) =>
                      workspaceStore.workspaces[a]?.name.toLowerCase() >
                      workspaceStore.workspaces[b]?.name.toLowerCase()
                        ? 1
                        : -1
                    )
                    .map((workspace) => (
                      <option key={workspace} value={workspace}>
                        {truncateText(
                          workspaceStore.workspaces[workspace].name,
                          30
                        )}
                      </option>
                    ))}
                </Select>
              </div>
              <div className="flex justify-between items-center">
                <TextInput
                  className="min-w-32"
                  type="text"
                  placeholder={t("Suche nach")}
                  onChange={(e) => {
                    const text = e.target.value.trim();
                    if (text === "") setSearchFor(null);
                    else setSearchFor(text);
                  }}
                />
                <div className="flex flex-row items-center ml-2">
                  <Label
                    className="min-w-24 mx-2"
                    htmlFor="sort"
                    value={t("Sortieren nach")}
                  />
                  <Select
                    className="min-w-32"
                    id="sort"
                    onChange={(event) =>
                      setSortBy(event.target.value as SortBy)
                    }
                  >
                    <option value="name">{t("Titel")}</option>
                    <option value="type">{t("Verbindungsart")}</option>
                    <option value="status">{t("Status")}</option>
                  </Select>
                </div>
              </div>
            </div>
            <div className="py-5">
              {Object.values(templateStore.templates)
                .filter((template) => hasWorkspace(filter, template))
                .filter((template) =>
                  searchFor === null
                    ? true
                    : (
                        "" +
                        template.name +
                        (template.description ?? "") +
                        template.type +
                        Object.values(template.additionalInformation ?? {}).map(
                          (elem) => elem ?? ""
                        ) +
                        (template.type === "hotfolder"
                          ? JSON.stringify(
                              templateStore.hotfolders[
                                (
                                  template.additionalInformation as HotfolderTemplateInfo
                                )?.sourceId ?? ""
                              ]
                            )
                          : "")
                      )
                        .toLowerCase()
                        .includes(searchFor.toLowerCase())
                )
                .sort(
                  genericSort({
                    field: sortBy,
                    fallbackValue: "",
                    caseInsensitive: true,
                  })
                )
                .map((template) => (
                  <TemplateItem key={template.id} template={template} />
                ))}
            </div>
          </>
        )}
      </div>
    </ErrorMessageContext.Provider>
  );
}
