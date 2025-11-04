import { createContext, useEffect, useState } from "react";
import {
  Label,
  Select,
  TextInput,
  Table,
  Alert,
  Card,
  Spinner,
  Pagination,
  Checkbox,
  Dropdown,
  Button,
} from "flowbite-react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { FiChevronLeft } from "react-icons/fi";

import t from "../../utils/translation";
import { formatJobConfigStatus } from "../../utils/util";
import { reformatDatetime } from "../../utils/dateTime";
import {
  IE,
  JobConfig,
  JobInfo,
  RecordInfo,
  Template,
  Workspace,
} from "../../types";
import useGlobalStore from "../../store";
import { credentialsValue, devMode, host } from "../../App";
import UserDisplay from "../../components/UserDisplay";
import MessageBox, {
  Message,
  MessageHandler,
  useMessageHandler,
} from "../../components/MessageBox";
import * as TableCells from "./TableCells";
import IEUpdateInfoModal from "./IEUpdateInfoModal";

enum ColumnIdentifier {
  SourceSystemId = "sourceSystemId",
  ExternalId = "externalId",
  SIPId = "SIPId",
  IEId = "IEId",
  Processed = "processed",
  Status = "status",
  Token = "token",
  Download = "download",
}

interface TableColumn {
  id?: ColumnIdentifier;
  name: string;
  Cell: (user: TableCells.TableCellProps) => JSX.Element;
}

const tableColumns: TableColumn[] = [
  {
    id: ColumnIdentifier.SourceSystemId,
    name: t("ID Quellsystem"),
    Cell: TableCells.SourceSystemIdCell,
  },
  {
    id: ColumnIdentifier.ExternalId,
    name: t("External Identifier"),
    Cell: TableCells.ExternalIdCell,
  },
  { id: ColumnIdentifier.SIPId, name: t("SIP ID"), Cell: TableCells.SIPIdCell },
  { id: ColumnIdentifier.IEId, name: t("IE ID"), Cell: TableCells.IEIdCell },
  {
    id: ColumnIdentifier.Processed,
    name: t("Eingeliefert"),
    Cell: TableCells.ProcessedDatetimeCell,
  },
  {
    id: ColumnIdentifier.Status,
    name: t("Status"),
    Cell: TableCells.StatusCell,
  },
  {
    id: ColumnIdentifier.Download,
    name: t("Download"),
    Cell: TableCells.DownloadCell,
  },
];

/**
 * Formats record status.
 * @param status record status
 * @returns formatted record status
 */
export function formatRecordStatus(record?: RecordInfo): string {
  if (!record) return "-";
  switch (record.status) {
    case "complete":
      return "archiviert";
    case "in-process":
      return "in Verarbeitung";
    case "import-error":
      return "Importfehler";
    case "build-ip-error":
    case "prepare-ip-error":
      return "IP-Konvertierungsfehler";
    case "build-sip-error":
      return "SIP-Konvertierungsfehler";
    case "transfer-error":
      return "Transferfehler";
    case "ingest-error":
      return "Ingest-Fehler";
    case "process-error":
      return "Fehler";
    case "ip-val-error":
    case "obj-val-error":
      return "Validierungsfehler";
  }
}

export const ErrorMessageContext = createContext<MessageHandler | undefined>(
  undefined
);

const ITEMS_PER_PAGE = 50;

type IEStatusFilterType =
  | "complete"
  | "inProcess"
  | "validationError"
  | "error"
  | "ignored";

type IESortOptionsType =
  | "datetimeChanged"
  | "originSystemId"
  | "externalId"
  | "archiveIeId"
  | "archiveSipId"
  | "status";

type IEUpdateAsType =
  | "clear"
  | "ignore"
  | "planAsBitstream"
  | "planToSkipObjectValidation";

interface IEQuery {
  filterByStatus?: IEStatusFilterType;
  filterByText?: string;
  sort: IESortOptionsType;
}

export interface IEUpdateProcessInfo {
  running: boolean;
  as?: IEUpdateAsType;
  todo: string[];
  status?: string;
  messages: Message[];
}

interface JobDetailsScreenProps {
  useACL?: boolean;
}

export default function JobDetailsScreen({
  useACL = false,
}: JobDetailsScreenProps) {
  const errorMessageHandler = useMessageHandler([]);

  const navigate = useNavigate();

  const [ieQuery, setIEQuery] = useState<IEQuery>({ sort: "datetimeChanged" });
  const [page, setPage] = useState<number>(1);
  const [ieCount, setIECount] = useState<number>(0);
  const [ies, setIEs] = useState<IE[]>([]);
  const [selectedIEs, setSelectedIEs] = useState<string[]>([]);
  const [selectableIEs, setSelectableIEs] = useState<string[]>([]);
  const [ieUpdateProcessInfo, setIEUpdateProcessInfo] =
    useState<IEUpdateProcessInfo>({
      running: false,
      todo: [],
      messages: [],
    });
  const [showIEUpdateInfoModal, setShowIEUpdateInfoModal] = useState(false);

  const [jobConfigId, setJobConfigId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [jobConfig, setJobConfig] = useState<JobConfig | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [latestJobInfo, setLatestJobInfo] = useState<JobInfo | null>(null);
  const fetchIE = useGlobalStore((state) => state.job.fetchIE);
  const fetchIEsByJobConfig = useGlobalStore(
    (state) => state.job.fetchIEsByJobConfig
  );
  const fetchWorkspace = useGlobalStore(
    (state) => state.workspace.fetchWorkspace
  );
  const fetchTemplate = useGlobalStore((state) => state.template.fetchTemplate);
  const fetchJobConfig = useGlobalStore((state) => state.job.fetchJobConfig);
  const fetchJobInfo = useGlobalStore((state) => state.job.fetchJobInfo);

  const acl = useGlobalStore((state) => state.session.acl);

  const scheduleTypesMap: Record<string, string> = {
    day: "täglich",
    week: "wöchentlich",
    month: "monatlich",
  };

  // load query arg
  useEffect(() => {
    setJobConfigId(searchParams.get("id"));
  }, [searchParams]);

  // identify currently selectable IEs
  // * object-validation error
  // * (devMode) not complete
  useEffect(() => {
    setSelectableIEs(
      ies
        .filter(
          (ie) =>
            ie?.records?.[ie.latestRecordId ?? ""]?.status ===
              "obj-val-error" ||
            (devMode &&
              ie?.records?.[ie.latestRecordId ?? ""]?.status !== "complete")
        )
        .map((ie) => ie.id)
    );
  }, [ies, setSelectableIEs]);

  // run update routine for selected IEs
  useEffect(() => {
    (async () => {
      if (!ieUpdateProcessInfo.running) return;
      if (!ieUpdateProcessInfo.as) {
        setIEUpdateProcessInfo({
          running: false,
          todo: [],
          as: undefined,
          messages: [
            ...ieUpdateProcessInfo.messages,
            {
              id: "update-ie-missing-action",
              text: t(
                "Fehler beim Aktualisieren von Einträgen: Keine Aktion ausgewählt."
              ),
            },
          ],
        });
      } else {
        // asyncronously process IEs one by one
        // this avoids potentially sending a very large amount of API-
        // requests simultaneously
        const completedIEs: string[] = [];
        const messages: Message[] = [];
        for (const id of ieUpdateProcessInfo.todo) {
          setIEUpdateProcessInfo((state) => ({
            ...state,
            status: `${completedIEs.length} von ${ieUpdateProcessInfo.todo.length} Einträgen verarbeitet..`,
          }));

          // for debugging
          // await new Promise((r) => setTimeout(r, 1000));

          let message = "";
          const response = await fetch(host + "/api/curator/job/ie-plan", {
            method: "POST",
            credentials: credentialsValue,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ id, [ieUpdateProcessInfo.as]: true }),
          }).catch((error) => {
            message = `Fehler beim Aktualisieren von Eintrag '${id}': ${error.message}`;
          });

          if (response && !response.ok) {
            message = `Fehler beim Aktualisieren von Eintrag '${id}': ${await response.text()}`;
          }

          if (message !== "")
            messages.push({ id: `update-ie-failed-${id}`, text: t(message) });
          completedIEs.push(id);
          fetchIE({
            id,
            onSuccess: (ie) => {
              setIEs((ies) => {
                return [
                  ...ies.map((oldIE) => (ie.id === oldIE.id ? ie : oldIE)),
                ];
              });
            },
          });
        }
        setIEUpdateProcessInfo((state) => ({
          ...state,
          messages: [...state.messages, ...messages],
        }));
        setSelectedIEs([]);
      }
      // finalize process and show modal
      setIEUpdateProcessInfo((state) => ({
        ...state,
        running: false,
      }));
      setShowIEUpdateInfoModal(true);
    })();
    // eslint-disable-next-line
  }, [ieUpdateProcessInfo.running]);

  // fetch data
  // * fetch ies
  //   (initial fetch+again if ieQuery changes; this resets toolbar and page)
  useEffect(() => {
    if (!jobConfigId) return;
    fetchIEsByJobConfig({
      jobConfigId,
      filterByStatus: ieQuery.filterByStatus,
      filterByText: ieQuery.filterByText,
      sort: ieQuery.sort,
      range: `0..${ITEMS_PER_PAGE}`,
      count: "true",
      onSuccess: (data) => {
        setPage(1);
        setIECount(data.count ?? 0);
        setIEs(data.IEs);
      },
      onFail: (error) =>
        errorMessageHandler.pushMessage({
          id: "fetch-job-ies",
          text: error,
        }),
    });
    // eslint-disable-next-line
  }, [jobConfigId, fetchIEsByJobConfig, ieQuery]);
  // * fetch ies again when changing current page
  useEffect(() => {
    if (!jobConfigId) return;
    fetchIEsByJobConfig({
      jobConfigId,
      filterByStatus: ieQuery.filterByStatus,
      filterByText: ieQuery.filterByText,
      sort: ieQuery.sort,
      range: `${(page - 1) * ITEMS_PER_PAGE}..${page * ITEMS_PER_PAGE}`,
      onSuccess: (data) => setIEs(data.IEs),
      onFail: (error) =>
        errorMessageHandler.pushMessage({
          id: "fetch-job-ies",
          text: error,
        }),
    });
    // eslint-disable-next-line
  }, [page]);
  // * fetch JobConfig
  useEffect(() => {
    if (!jobConfigId) return;
    fetchJobConfig({
      jobConfigId,
      onSuccess: (jobConfig) => {
        setJobConfig(jobConfig);
      },
      onFail: (msg) =>
        errorMessageHandler.pushMessage({
          id: `fetch-job-config-${jobConfigId}`,
          text: msg,
        }),
    });
    // eslint-disable-next-line
  }, [jobConfigId, fetchJobConfig]);
  // * fetch Template
  useEffect(() => {
    if (!jobConfig?.templateId) return;
    fetchTemplate({
      templateId: jobConfig.templateId,
      onSuccess: (template) => {
        setTemplate(template);
      },
      onFail: (msg) =>
        errorMessageHandler.pushMessage({
          id: `fetch-template-config-${jobConfig.templateId}`,
          text: msg,
        }),
    });
    // eslint-disable-next-line
  }, [jobConfig, fetchTemplate]);
  // * fetch Workspace
  useEffect(() => {
    if (!jobConfig?.workspaceId) return;
    fetchWorkspace({
      workspaceId: jobConfig.workspaceId,
      onSuccess: (workspace) => {
        setWorkspace(workspace);
      },
      onFail: (msg) =>
        errorMessageHandler.pushMessage({
          id: `fetch-workspace-config-${jobConfig.workspaceId}`,
          text: msg,
        }),
    });
    // eslint-disable-next-line
  }, [jobConfig, fetchWorkspace]);
  // * fetch latestExec-info
  useEffect(() => {
    if (!jobConfig?.latestExec) return;
    fetchJobInfo({
      token: jobConfig.latestExec,
      onSuccess: (jobInfo) => {
        setLatestJobInfo(jobInfo);
      },
      onFail: (msg) =>
        errorMessageHandler.pushMessage({
          id: `fetch-job-info-${jobConfig.latestExec}`,
          text: msg,
        }),
    });
    // eslint-disable-next-line
  }, [jobConfig, fetchJobInfo]);

  return useACL && !acl?.VIEW_SCREEN_JOBS ? (
    <Navigate to="/" replace />
  ) : (
    <ErrorMessageContext.Provider value={errorMessageHandler}>
      <div className="mx-20 mt-4">
        <div
          onClick={() => navigate(-1)}
          className="flex flex-row items-center space-x-2 my-2 select-none hover:cursor-pointer"
        >
          <FiChevronLeft />
          <span>{t("Zurück")}</span>
        </div>
        <div className="flex justify-between items-center relative w-full mb-5">
          <h3 className="text-4xl font-bold">{t("Job Details")}</h3>
        </div>
        <MessageBox
          messages={errorMessageHandler.messages}
          messageTitle={t("Ein Fehler ist aufgetreten:")}
          onDismiss={errorMessageHandler.clearMessages}
        />
        {useACL && (!acl?.READ_JOBCONFIG || !acl?.READ_JOB) ? (
          <Alert className="my-2" color="warning">
            {t("Kein (vollständiger) Lese-Zugriff auf Jobinformationen.")}
          </Alert>
        ) : (
          <div className="flex flex-col space-y-4 my-4">
            <div className="flex flex-row w-full justify-between space-x-4">
              <div className="flex flex-col flex-grow space-y-2">
                <h3 className="text-2xl font-bold">{t("Übersicht")}</h3>
                <Card className="h-full">
                  {ies && jobConfig && template && workspace ? (
                    <div className="flex flex-col h-full justify-around space-y-2">
                      <div>
                        <h5 className="font-semibold">{t("Titel")}</h5>
                        <span>{jobConfig.name ?? "-"}</span>
                      </div>
                      <div>
                        <h5 className="font-semibold">{t("Status")}</h5>
                        <span>
                          {t(formatJobConfigStatus(jobConfig)).toLowerCase()}
                        </span>
                      </div>
                      <div>
                        <h5 className="font-semibold">{t("Template")}</h5>
                        <span>{template.name}</span>
                      </div>
                      <div>
                        <h5 className="font-semibold">{t("Bereich")}</h5>
                        <span>{workspace.name}</span>
                      </div>
                      <div>
                        <h5 className="font-semibold">{t("Wiederholung")}</h5>
                        <span>
                          {jobConfig.schedule?.active
                            ? jobConfig.schedule.repeat?.unit
                              ? t(
                                  scheduleTypesMap[
                                    jobConfig!.schedule.repeat.unit
                                  ]
                                )
                              : t("einmalig")
                            : "-"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <Spinner />
                  )}
                </Card>
              </div>
              <div className="flex flex-col space-y-2 w-1/3">
                <h3 className="text-2xl font-bold">{t("Metadaten")}</h3>
                <Card>
                  {(jobConfig !== null && !jobConfig.latestExec) ||
                  latestJobInfo ? (
                    <div className="flex flex-col space-y-2">
                      <div>
                        <h5 className="font-semibold">{t("Erstellt am")}</h5>
                        <span>
                          {reformatDatetime(jobConfig?.datetimeCreated, {
                            devMode,
                          })}
                        </span>
                      </div>
                      <div>
                        <h5 className="font-semibold">{t("Upgedatet am")}</h5>
                        <span>
                          {reformatDatetime(jobConfig?.datetimeModified, {
                            devMode,
                          })}
                        </span>
                      </div>
                      <div>
                        <h5 className="font-semibold">{t("Erstellt von")}</h5>
                        <div className="inline-block max-w-96">
                          <UserDisplay id={jobConfig?.userCreated} />
                        </div>
                      </div>
                      <div>
                        <h5 className="font-semibold">{t("Letzter Lauf")}</h5>
                        <span>
                          {latestJobInfo
                            ? reformatDatetime(latestJobInfo.datetimeStarted, {
                                devMode,
                              })
                            : "-"}
                        </span>
                      </div>
                      <div>
                        <h5 className="font-semibold">{t("Nächster Lauf")}</h5>
                        <span>
                          {latestJobInfo
                            ? reformatDatetime(jobConfig?.scheduledExec, {
                                devMode,
                              })
                            : "-"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <Spinner />
                  )}
                </Card>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold">
                {`${t("IEs")} (${ieCount ?? jobConfig?.IEs ?? 0})`}
              </h3>
              <div className="flex justify-between items-center relative w-full my-4">
                <div className="flex flex-row space-x-2 items-center">
                  <Label className="mx-2" value={t("Filtern nach")} />
                  <Select
                    className="min-w-32"
                    value={ieQuery.filterByStatus ?? ""}
                    onChange={(event) =>
                      setIEQuery((state) => ({
                        ...state,
                        filterByStatus:
                          event.target.value === ""
                            ? undefined
                            : (event.target.value as IEStatusFilterType),
                      }))
                    }
                  >
                    <option value="">{t("Status")}</option>
                    <option value="complete">{t("Archiviert")}</option>
                    <option value="validationError">
                      {t("Validierungsfehler")}
                    </option>
                    <option value="error">{t("Fehler")}</option>
                    <option value="ignored">{t("Verworfen")}</option>
                  </Select>
                </div>
                <div className="flex justify-between items-center">
                  <TextInput
                    className="min-w-32"
                    type="text"
                    placeholder={t("Suche nach")}
                    value={ieQuery.filterByText ?? ""}
                    onChange={(e) => {
                      const text = e.target.value.trim();
                      setIEQuery((state) => ({
                        ...state,
                        filterByText: text === "" ? undefined : text,
                      }));
                    }}
                  />
                  <div className="flex flex-row items-center ml-2">
                    <Label
                      className="mx-2"
                      htmlFor="sortBy"
                      value={t("Sortieren nach")}
                    />
                    <Select
                      className="min-w-32"
                      id="sortBy"
                      value={ieQuery.sort ?? ""}
                      onChange={(e) =>
                        setIEQuery((state) => ({
                          ...state,
                          sort: e.target.value as IESortOptionsType,
                        }))
                      }
                    >
                      <option value="datetimeChanged">
                        {t("Letzte Änderung")}
                      </option>
                      <option value="originSystemId">
                        {t("ID Quellsystem")}
                      </option>
                      <option value="externalId">
                        {t("External Identifier")}
                      </option>
                      <option value="archiveSipId">{t("SIP ID")}</option>
                      <option value="archiveIeId">{t("IE ID")}</option>
                      <option value="status">{t("Status")}</option>
                    </Select>
                  </div>
                </div>
              </div>
              {selectedIEs.length > 0 && (
                <div className="bg-cyan-100 px-5 py-2 rounded-t-lg">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex flex-row space-x-2">
                      {ieUpdateProcessInfo.running && <Spinner size="sm" />}
                      <span className="text-cyan-800">
                        {t(
                          ieUpdateProcessInfo.running
                            ? ieUpdateProcessInfo.status ??
                                "Verarbeitung wird vorbereitet.."
                            : `${selectedIEs.length} ${
                                selectedIEs.length === 1
                                  ? "Eintrag"
                                  : "Einträge"
                              } ausgewählt`
                        )}
                      </span>
                    </div>
                    <div className="flex flex-row space-x-2">
                      <Dropdown
                        label={t("Aktion ausführen")}
                        disabled={ieUpdateProcessInfo.running}
                      >
                        {devMode && (
                          <Dropdown.Item
                            onClick={() =>
                              setIEUpdateProcessInfo({
                                running: true,
                                todo: [...selectedIEs],
                                as: "clear",
                                messages: [],
                              })
                            }
                          >
                            {t("zurücksetzen")}
                          </Dropdown.Item>
                        )}
                        <Dropdown.Item
                          onClick={() =>
                            setIEUpdateProcessInfo({
                              running: true,
                              todo: [...selectedIEs],
                              as: "ignore",
                              messages: [],
                            })
                          }
                        >
                          {t("verwerfen")}
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() =>
                            setIEUpdateProcessInfo({
                              running: true,
                              todo: [...selectedIEs],
                              as: "planAsBitstream",
                              messages: [],
                            })
                          }
                        >
                          {t("als Bitstream verarbeiten")}
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() =>
                            setIEUpdateProcessInfo({
                              running: true,
                              todo: [...selectedIEs],
                              as: "planToSkipObjectValidation",
                              messages: [],
                            })
                          }
                        >
                          {t("ohne Objektvalidierung verarbeiten")}
                        </Dropdown.Item>
                      </Dropdown>
                      <Button
                        onClick={() => setSelectedIEs([])}
                        disabled={ieUpdateProcessInfo.running}
                      >
                        {t("Abbrechen")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <IEUpdateInfoModal
                show={showIEUpdateInfoModal}
                ieUpdateProcessInfo={ieUpdateProcessInfo}
                onConfirm={() => {
                  setIEUpdateProcessInfo({
                    running: false,
                    as: undefined,
                    todo: [],
                    messages: [],
                  });
                  setShowIEUpdateInfoModal(false);
                }}
              />
              <div className="overflow-x-auto">
                <div className="table w-full px-1 pb-2">
                  <Table hoverable>
                    <Table.Head>
                      <Table.HeadCell>
                        {selectableIEs.length > 0 && (
                          <Checkbox
                            className={
                              ieUpdateProcessInfo.running
                                ? "hover:cursor-not-allowed"
                                : "hover:cursor-pointer"
                            }
                            disabled={ieUpdateProcessInfo.running}
                            checked={selectableIEs.every((id) =>
                              selectedIEs.includes(id)
                            )}
                            onChange={() =>
                              selectableIEs.every((id) =>
                                selectedIEs.includes(id)
                              )
                                ? setSelectedIEs((state) =>
                                    state.filter(
                                      (id) => !selectableIEs.includes(id)
                                    )
                                  )
                                : setSelectedIEs((state) =>
                                    Array.from(
                                      new Set([...state, ...selectableIEs])
                                    )
                                  )
                            }
                          />
                        )}
                      </Table.HeadCell>
                      {[
                        ...tableColumns,
                        // conditionally add the devMode-column
                        ...(devMode
                          ? [
                              {
                                id: ColumnIdentifier.Token,
                                name: t("token"),
                                Cell: TableCells.TokenCell,
                              },
                            ]
                          : []),
                      ].map((item) => (
                        <item.Cell key={item.name} />
                      ))}
                    </Table.Head>
                    <Table.Body className="divide-y">
                      {ies.map((ie) => (
                        <Table.Row
                          key={ie.id}
                          className={
                            ie.records?.[ie?.latestRecordId ?? ""]?.status ===
                              "obj-val-error" &&
                            !(
                              ie.records?.[ie?.latestRecordId ?? ""]?.ignored ||
                              ie.records?.[ie?.latestRecordId ?? ""]
                                ?.bitstream ||
                              ie.records?.[ie?.latestRecordId ?? ""]
                                ?.skipObjectValidation
                            )
                              ? "bg-red-100 hover:bg-red-50"
                              : ""
                          }
                        >
                          <Table.Cell>
                            {selectableIEs.includes(ie.id) && (
                              <Checkbox
                                className={
                                  ieUpdateProcessInfo.running
                                    ? "hover:cursor-not-allowed"
                                    : "hover:cursor-pointer"
                                }
                                disabled={ieUpdateProcessInfo.running}
                                checked={selectedIEs.includes(ie.id)}
                                onChange={() =>
                                  setSelectedIEs((state) =>
                                    state.includes(ie.id)
                                      ? state.filter((id) => id !== ie.id)
                                      : [...state, ie.id]
                                  )
                                }
                              />
                            )}
                          </Table.Cell>
                          {[
                            ...tableColumns,
                            // conditionally add the devMode-column
                            ...(devMode
                              ? [
                                  {
                                    id: ColumnIdentifier.Token,
                                    name: t("token"),
                                    Cell: TableCells.TokenCell,
                                  },
                                ]
                              : []),
                          ].map((item) => (
                            <item.Cell key={ie.id + item.id} ie={ie} />
                          ))}
                        </Table.Row>
                      ))}
                      {ies.length === 0 && (
                        <Table.Row>
                          <Table.Cell colSpan={99}>
                            <div className="flex w-full items-center justify-center">
                              <span className="text-gray-500">
                                {t("Keine Ergebnisse")}
                              </span>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table>
                </div>
              </div>
              {ies.length > 0 && (
                <div className="w-full flex flex-col space-y-1 items-center my-1 text-sm">
                  <span>
                    {t(
                      `Seite ${page} von ${Math.ceil(ieCount / ITEMS_PER_PAGE)}`
                    )}
                  </span>
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(ieCount / ITEMS_PER_PAGE)}
                    previousLabel={t("Vorherige")}
                    nextLabel={t("Nächste")}
                    layout="pagination"
                    showIcons
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ErrorMessageContext.Provider>
  );
}
