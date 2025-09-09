import { createContext, useEffect, useState } from "react";
import { Label, Select, Button, TextInput, Table, Alert } from "flowbite-react";
import { Navigate } from "react-router";

import t from "../../utils/translation";
import { truncateText } from "../../utils/forms";
import { formatJobConfigStatus } from "../../utils/util";
import { genericSort } from "../../utils/genericSort";
import { JobConfig } from "../../types";
import useGlobalStore from "../../store";
import MessageBox, {
  MessageHandler,
  useMessageHandler,
} from "../../components/MessageBox";
import { devMode } from "../../App";
import CUModal from "./CUModal/Modal";
import * as TableCells from "./TableCells";
import DebugJobModal from "./DebugJobModal";

enum ColumnIdentifier {
  Name = "name",
  Template = "template",
  Workspace = "workspace",
  LatestExec = "latestExec",
  ScheduledExec = "scheduledExec",
  Schedule = "schedule",
  Status = "status",
  ArchivedIEs = "archivedIEs",
  Issues = "issues",
  Id = "id",
  Actions = "actions",
}

interface TableColumn {
  id?: ColumnIdentifier;
  name: string;
  Cell: (user: TableCells.TableCellProps) => JSX.Element;
}

const tableColumns: TableColumn[] = [
  { id: ColumnIdentifier.Name, name: t("Titel"), Cell: TableCells.NameCell },
  {
    id: ColumnIdentifier.Template,
    name: t("Template"),
    Cell: TableCells.TemplateCell,
  },
  {
    id: ColumnIdentifier.Workspace,
    name: t("Arbeitsbereich"),
    Cell: TableCells.WorkspaceCell,
  },
  {
    id: ColumnIdentifier.LatestExec,
    name: t("Letzter Lauf"),
    Cell: TableCells.LatestExecCell,
  },
  {
    id: ColumnIdentifier.ScheduledExec,
    name: t("Nächster Lauf"),
    Cell: TableCells.ScheduledExecCell,
  },
  {
    id: ColumnIdentifier.Schedule,
    name: t("Wiederholung"),
    Cell: TableCells.ScheduleCell,
  },
  {
    id: ColumnIdentifier.Status,
    name: t("Status"),
    Cell: TableCells.StatusCell,
  },
  {
    id: ColumnIdentifier.ArchivedIEs,
    name: t("Archivierte IEs"),
    Cell: TableCells.ArchivedRecordsCell,
  },
  {
    id: ColumnIdentifier.Issues,
    name: t("Issues"),
    Cell: TableCells.IssuesCell,
  },
  {
    id: ColumnIdentifier.Actions,
    name: t("Aktionen"),
    Cell: TableCells.ActionsCell,
  },
];

export const ErrorMessageContext = createContext<MessageHandler | undefined>(
  undefined
);

interface JobsScreenProps {
  useACL?: boolean;
}

export default function JobsScreen({ useACL = false }: JobsScreenProps) {
  const errorMessageHandler = useMessageHandler([]);

  const [workspaceFilter, setWorkspaceFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchFor, setSearchFor] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("name");

  const [showCUModal, setShowCUModal] = useState(false);
  const [showDebugJobModal, setShowDebugJobModal] = useState(false);

  const workspaceStore = useGlobalStore((state) => state.workspace);
  const templateStore = useGlobalStore((state) => state.template);
  const jobStore = useGlobalStore((state) => state.job);

  const acl = useGlobalStore((state) => state.session.acl);

  // run store-logic
  // * fetch all jobConfigIds on first load
  useEffect(
    () =>
      jobStore.fetchList({
        useACL: useACL,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: "fetch-job-config-list",
            text: msg,
          }),
      }),
    // eslint-disable-next-line
    []
  );
  // * fetch JobConfigs if jobConfigIds changed
  useEffect(() => {
    for (const jobConfigId of jobStore.jobConfigIds) {
      jobStore.fetchJobConfig({
        jobConfigId,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: `fetch-job-config-${jobConfigId}`,
            text: msg,
          }),
        // load latestExec-info as well if successful and available
        onSuccess: (config) => {
          if (!config?.latestExec) return;
          jobStore.fetchJobInfo({ token: config?.latestExec });
        },
      });
    }
    // eslint-disable-next-line
  }, [jobStore.jobConfigIds]);
  // * fetch all templateIds on first load
  useEffect(
    () =>
      templateStore.fetchList({
        useACL: useACL,
        onFail: (msg) =>
          errorMessageHandler.pushMessage({
            id: `fetch-template-config-list`,
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
            id: `fetch-workspace-config-list`,
            text: msg,
          }),
      }),
    // eslint-disable-next-line
    []
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
   * Extracts an array of unique workspace ids from given job-configurations.
   * @param users Array of users.
   * @returns An array of available workspace ids.
   */
  function findWorkspaceIds(configs: JobConfig[]): string[] {
    return Array.from(
      new Set(
        configs
          .filter((config) => config.workspaceId !== undefined)
          .map((config) => (config as { workspaceId: string }).workspaceId)
      )
    );
  }

  return useACL && !acl?.VIEW_SCREEN_JOBS ? (
    <Navigate to="/" replace />
  ) : (
    <ErrorMessageContext.Provider value={errorMessageHandler}>
      <div className="mx-20 mt-4">
        <div className="flex justify-between items-center relative w-full mb-5">
          <h3 className="text-4xl font-bold">{t("Jobs")}</h3>
          <div className="flex flex-row space-x-2">
            {!devMode || (useACL && !acl?.READ_JOB) ? null : (
              <>
                <Button
                  type="button"
                  onClick={() => setShowDebugJobModal(true)}
                >
                  {t("Job verfolgen")}
                </Button>
                <DebugJobModal
                  show={showDebugJobModal}
                  onClose={() => {
                    setShowDebugJobModal(false);
                  }}
                />
              </>
            )}
            {useACL && !acl?.CREATE_JOBCONFIG ? null : (
              <>
                <Button type="button" onClick={() => setShowCUModal(true)}>
                  {t("Neuen Job anlegen")}
                </Button>
                <CUModal
                  show={showCUModal}
                  onClose={() => setShowCUModal(false)}
                />
              </>
            )}
          </div>
        </div>
        <MessageBox
          messages={errorMessageHandler.messages}
          messageTitle={t("Ein Fehler ist aufgetreten:")}
          onDismiss={errorMessageHandler.clearMessages}
        />
        {useACL && !acl?.READ_JOBCONFIG ? (
          <Alert className="my-2" color="warning">
            {t("Kein Lese-Zugriff auf Jobkonfigurationen.")}
          </Alert>
        ) : (
          <>
            <div className="flex justify-between items-center relative w-full my-4">
              <div className="flex flex-row space-x-2 items-center px-2">
                <Label className="min-w-20 mx-2" value={t("Filtern nach")} />
                <Select
                  className="min-w-32"
                  onChange={(event) => setWorkspaceFilter(event.target.value)}
                >
                  <option value="">{t("Arbeitsbereich")}</option>
                  {findWorkspaceIds(Object.values(jobStore.jobConfigs))
                    .sort((a, b) =>
                      workspaceStore.workspaces[a]?.name.toLowerCase() >
                      workspaceStore.workspaces[b]?.name.toLowerCase()
                        ? 1
                        : -1
                    )
                    .map((workspace) => (
                      <option key={workspace} value={workspace}>
                        {truncateText(
                          workspaceStore.workspaces[workspace]?.name ?? "",
                          30
                        )}
                      </option>
                    ))}
                </Select>
                <Select
                  className="min-w-24"
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="">{t("Status")}</option>
                  {
                    // fill in options by generating the labels that are also
                    // used in the table cells
                  }
                  <option
                    value={formatJobConfigStatus({
                      id: "",
                      status: "ok",
                      schedule: { active: false },
                    })}
                  >
                    {t(
                      formatJobConfigStatus({
                        id: "",
                        status: "ok",
                        schedule: { active: false },
                      })
                    )}
                  </option>
                  <option
                    value={formatJobConfigStatus({
                      id: "",
                      status: "ok",
                      schedule: { active: true },
                    })}
                  >
                    {t(
                      formatJobConfigStatus({
                        id: "",
                        status: "ok",
                        schedule: { active: true },
                      })
                    )}
                  </option>
                  <option
                    value={formatJobConfigStatus({
                      id: "",
                      status: "draft",
                    })}
                  >
                    {t(
                      formatJobConfigStatus({
                        id: "",
                        status: "draft",
                      })
                    )}
                  </option>
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
                    htmlFor="sortBy"
                    value={t("Sortieren nach")}
                  />
                  <Select
                    className="min-w-32"
                    id="sortBy"
                    onChange={(e) => {
                      if (
                        (
                          [
                            ColumnIdentifier.Name,
                            ColumnIdentifier.Template,
                            ColumnIdentifier.Workspace,
                            ColumnIdentifier.ScheduledExec,
                            ColumnIdentifier.Status,
                          ] as string[]
                        ).includes(e.target.value)
                      )
                        setSortBy(e.target.value as ColumnIdentifier);
                      else
                        errorMessageHandler.pushMessage({
                          id: "unknown-sort-by-id",
                          text: t(
                            `Unbekannter Schlüssel '${e.target.value}' beim Sortieren.`
                          ),
                        });
                    }}
                  >
                    {tableColumns
                      .filter(
                        (item) =>
                          item.id !== undefined &&
                          [
                            ColumnIdentifier.Name,
                            ColumnIdentifier.Template,
                            ColumnIdentifier.Workspace,
                            ColumnIdentifier.ScheduledExec,
                            ColumnIdentifier.Status,
                          ].includes(item.id)
                      )
                      .filter((item) => item.id !== undefined)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </Select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="table w-full p-1 pb-2">
                <Table hoverable>
                  <Table.Head>
                    {tableColumns.map((item) => (
                      <item.Cell key={item.name} />
                    ))}
                  </Table.Head>
                  <Table.Body className="divide-y">
                    {Object.values(jobStore.jobConfigs)
                      .filter(
                        (config) =>
                          statusFilter === "" ||
                          statusFilter === formatJobConfigStatus(config)
                      )
                      .filter(
                        (config) =>
                          workspaceFilter === "" ||
                          workspaceFilter === config.workspaceId
                      )
                      .filter(
                        (config) =>
                          searchFor === null ||
                          (
                            "" +
                            (config.name ?? "") +
                            (config.templateId
                              ? templateStore.templates[config.templateId]?.name
                              : "") +
                            (config.workspaceId
                              ? workspaceStore.workspaces[config.workspaceId]
                                  ?.name
                              : "") +
                            t(formatJobConfigStatus(config))
                          )
                            .toLowerCase()
                            .includes(searchFor.toLowerCase())
                      )
                      .sort(
                        genericSort<JobConfig>({
                          field: sortBy,
                          fallbackValue: "-",
                          caseInsensitive: true,
                          getValue: (item) => {
                            switch (sortBy) {
                              case "name":
                                return item.name ?? "-";
                              case "template":
                                return item.templateId
                                  ? templateStore.templates[item.templateId]
                                      ?.name ?? "-"
                                  : "-";
                              case "workspace":
                                return item.workspaceId
                                  ? workspaceStore.workspaces[item.workspaceId]
                                      ?.name ?? "-"
                                  : "-";
                              case "scheduledExec":
                                return item.scheduledExec ?? "";
                              case "status":
                                return t(
                                  formatJobConfigStatus(item)
                                ).toLowerCase();
                              default:
                                return "";
                            }
                          },
                        })
                      )
                      .map((config) => (
                        <Table.Row key={config.id}>
                          {tableColumns.map((item) => (
                            <item.Cell key={item.id} config={config} />
                          ))}
                        </Table.Row>
                      ))}
                  </Table.Body>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>
    </ErrorMessageContext.Provider>
  );
}
