import { createContext, useEffect, useState } from "react";
import {
  Label,
  Select,
  TextInput,
  Table,
  Alert,
  Card,
  Spinner,
} from "flowbite-react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { FiChevronLeft } from "react-icons/fi";

import t from "../../utils/translation";
import { formatJobConfigStatus } from "../../utils/util";
import { reformatDatetime } from "../../utils/dateTime";
import {
  JobConfig,
  JobInfo,
  RecordInfo,
  Template,
  Workspace,
} from "../../types";
import useGlobalStore from "../../store";
import UserDisplay from "../../components/UserDisplay";
import MessageBox, {
  MessageHandler,
  useMessageHandler,
} from "../../components/MessageBox";
import { devMode } from "../../App";
import * as TableCells from "./TableCells";

enum ColumnIdentifier {
  SourceSystemId = "sourceSystemId",
  ExternalId = "externalId",
  SIPId = "SIPId",
  IEId = "IEId",
  Processed = "processed",
  Status = "status",
  Token = "token",
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
];

/**
 * Formats record status.
 * @param record record
 * @returns formatted record status
 */
export function formatRecordStatus(record: RecordInfo): string {
  if (record.success) return "archiviert";
  return "Fehler";
}

export const ErrorMessageContext = createContext<MessageHandler | undefined>(
  undefined
);

interface JobDetailsScreenProps {
  useACL?: boolean;
}

export default function JobDetailsScreen({
  useACL = false,
}: JobDetailsScreenProps) {
  const errorMessageHandler = useMessageHandler([]);

  const navigate = useNavigate();
  const [filter, setFilter] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<string>("status");
  const [searchFor, setSearchFor] = useState<string | null>(null);

  const [jobConfigId, setJobConfigId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [jobConfig, setJobConfig] = useState<JobConfig | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [latestJobInfo, setLatestJobInfo] = useState<JobInfo | null>(null);
  const [records, setRecords] = useState<RecordInfo[] | null>(null);
  const fetchRecordsByJobConfig = useGlobalStore(
    (state) => state.job.fetchRecordsByJobConfig
  );
  const fetchWorkspace = useGlobalStore(
    (state) => state.workspace.fetchWorkspace
  );
  const fetchTemplate = useGlobalStore((state) => state.template.fetchTemplate);
  const fetchJobConfig = useGlobalStore((state) => state.job.fetchJobConfig);
  const fetchJobInfo = useGlobalStore((state) => state.job.fetchJobInfo);

  const acl = useGlobalStore((state) => state.session.acl);

  // load query arg
  useEffect(() => {
    setJobConfigId(searchParams.get("id"));
  }, [searchParams]);

  // fetch data
  // * fetch records
  useEffect(() => {
    if (!jobConfigId) return;
    fetchRecordsByJobConfig({
      jobConfigId,
      onSuccess: (records) => setRecords(records),
      onFail: (error) =>
        errorMessageHandler.pushMessage({
          id: "fetch-job-records",
          text: error,
        }),
    });
    // eslint-disable-next-line
  }, [jobConfigId, fetchRecordsByJobConfig]);
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
                <Card>
                  {records && jobConfig && template && workspace ? (
                    <div className="flex flex-col space-y-2">
                      <div>
                        <h5 className="font-semibold">{t("Titel")}</h5>
                        <span>{jobConfig.name ?? "-"}</span>
                      </div>
                      <div>
                        <h5 className="font-semibold">{t("Status")}</h5>
                        <span>{t(formatJobConfigStatus(jobConfig))}</span>
                      </div>
                      <div>
                        <h5 className="font-semibold">{t("Typ")}</h5>
                        <span>
                          {template.type
                            ? ((type) => {
                                switch (type) {
                                  case "plugin":
                                    return t("Plugin");
                                  case "oai":
                                    return t("Harvest");
                                  case "hotfolder":
                                    return t("Hotfolder");
                                  default:
                                    return t("Unbekannt");
                                }
                              })(template.type)
                            : "-"}
                        </span>
                      </div>
                      <div>
                        <h5 className="font-semibold">{t("Arbeitsbereich")}</h5>
                        <span>{workspace.name}</span>
                      </div>
                      <div>
                        <h5 className="font-semibold">
                          {t("Eingelieferte IEs (gesamt)")}
                        </h5>
                        <span>
                          {records.filter((record) => record.success).length}
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
                    </div>
                  ) : (
                    <Spinner />
                  )}
                </Card>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold">{t("Eingelieferte IEs")}</h3>
              <div className="flex justify-between items-center relative w-full my-4">
                <div className="flex flex-row space-x-2 items-center">
                  <Label className="mx-2" value={t("Filtern nach")} />
                  <Select
                    className="min-w-32"
                    onChange={(event) =>
                      setFilter(
                        event.target.value
                          ? event.target.value === "true"
                          : null
                      )
                    }
                  >
                    <option value={""}>{t("Status")}</option>
                    <option value={"true"}>
                      {t(formatRecordStatus({ reportId: "", success: true }))}
                    </option>
                    <option value={"false"}>
                      {t(formatRecordStatus({ reportId: "", success: false }))}
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
                      className="mx-2"
                      htmlFor="sortBy"
                      value={t("Sortieren nach")}
                    />
                    <Select
                      className="min-w-32"
                      id="sortBy"
                      value={sortBy}
                      onChange={(e) => {
                        if (
                          (
                            [
                              ColumnIdentifier.SourceSystemId,
                              ColumnIdentifier.ExternalId,
                              ColumnIdentifier.SIPId,
                              ColumnIdentifier.IEId,
                              ColumnIdentifier.Processed,
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
                              ColumnIdentifier.SourceSystemId,
                              ColumnIdentifier.ExternalId,
                              ColumnIdentifier.SIPId,
                              ColumnIdentifier.IEId,
                              ColumnIdentifier.Processed,
                              ColumnIdentifier.Status,
                            ].includes(item.id)
                        )
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
                      {[
                        // conditionally add the devMode-column
                        ...tableColumns,
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
                      {records
                        ?.filter(
                          (record) =>
                            filter === null || record.success === filter
                        )
                        .filter(
                          (record) =>
                            searchFor === null ||
                            (
                              "" +
                              (record.originSystemId?.toLowerCase() ?? "") +
                              (record.externalId?.toLowerCase() ?? "") +
                              (record.sipId?.toLowerCase() ?? "") +
                              (record.ieId?.toLowerCase() ?? "") +
                              (record.datetimeProcessed
                                ? reformatDatetime(record.datetimeProcessed, {
                                    showTime: true,
                                    devMode,
                                  })
                                : "") +
                              t(formatRecordStatus(record))
                            ).includes(searchFor.toLowerCase())
                        )
                        .sort((a, b) => {
                          switch (sortBy) {
                            case "sourceSystemId":
                              return (a.originSystemId ?? 0) <
                                (b.originSystemId ?? 0)
                                ? -1
                                : 1;
                            case "externalId":
                              return (a.externalId ?? 0) < (b.externalId ?? 0)
                                ? -1
                                : 1;
                            case "SIPId":
                              return (a.sipId ?? 0) < (b.sipId ?? 0) ? -1 : 1;
                            case "IEId":
                              return (a.ieId ?? 0) < (b.ieId ?? 0) ? -1 : 1;
                            case "processed":
                              return (a.datetimeProcessed ?? 0) <
                                (b.datetimeProcessed ?? 0)
                                ? -1
                                : 1;
                            case "status":
                              return (t(formatRecordStatus(a)).toLowerCase() ??
                                0) <
                                (t(formatRecordStatus(b)).toLowerCase() ?? 0)
                                ? -1
                                : 1;
                            default:
                              return 1;
                          }
                        })
                        .map((record) => (
                          <Table.Row key={record.reportId}>
                            {[
                              // conditionally add the devMode-column
                              ...tableColumns,
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
                              <item.Cell key={item.id} record={record} />
                            ))}
                          </Table.Row>
                        ))}
                    </Table.Body>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorMessageContext.Provider>
  );
}
