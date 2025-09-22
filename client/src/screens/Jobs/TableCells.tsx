import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Table, Button, Spinner } from "flowbite-react";
import { FiPlay, FiEye, FiEdit3, FiTrash2 } from "react-icons/fi";

import t from "../../utils/translation";
import { formatJobConfigStatus } from "../../utils/util";
import { reformatDatetime } from "../../utils/dateTime";
import { JobConfig } from "../../types";
import useGlobalStore from "../../store";
import ConfirmModal from "../../components/ConfirmModal";
import { host, credentialsValue, devMode } from "../../App";
import MonitorJobModal from "./MonitorJobModal";
import CUModal from "./CUModal/Modal";
import { useFormStore } from "./CUModal/store";
import { ErrorMessageContext } from "./JobsScreen";

export interface TableCellProps {
  config?: JobConfig;
}

export function NameCell({ config }: TableCellProps) {
  if (!config) return <Table.HeadCell>{t("Titel")}</Table.HeadCell>;
  return <Table.Cell>{config.name ?? "-"}</Table.Cell>;
}

export function TemplateCell({ config }: TableCellProps) {
  const templates = useGlobalStore((state) => state.template.templates);
  if (!config) return <Table.HeadCell>{t("Template")}</Table.HeadCell>;
  return (
    <Table.Cell>
      {config.templateId !== undefined &&
      templates[config.templateId] !== undefined
        ? templates[config.templateId].name
        : t("Unbekannt")}
    </Table.Cell>
  );
}

export function WorkspaceCell({ config }: TableCellProps) {
  const workspaces = useGlobalStore((state) => state.workspace.workspaces);
  if (!config) return <Table.HeadCell>{t("Arbeitsbereich")}</Table.HeadCell>;
  return (
    <Table.Cell>
      {config.workspaceId !== undefined &&
      workspaces[config.workspaceId] !== undefined
        ? workspaces[config.workspaceId].name
        : t("Unbekannt")}
    </Table.Cell>
  );
}

export function LatestExecCell({ config }: TableCellProps) {
  const jobInfos = useGlobalStore((state) => state.job.jobInfos);

  if (!config) return <Table.HeadCell>{t("Letzter Lauf")}</Table.HeadCell>;

  return (
    <Table.Cell>
      {config.latestExec !== undefined &&
      jobInfos[config.latestExec] === undefined ? (
        <Spinner size="xs" />
      ) : (
        reformatDatetime(jobInfos[config.latestExec ?? ""]?.datetimeStarted, {
          devMode,
        })
      )}
    </Table.Cell>
  );
}

export function ScheduledExecCell({ config }: TableCellProps) {
  if (!config) return <Table.HeadCell>{t("Nächster Lauf")}</Table.HeadCell>;
  return (
    <Table.Cell>
      {reformatDatetime(config.scheduledExec, { devMode })}
    </Table.Cell>
  );
}

export function ScheduleCell({ config }: TableCellProps) {
  // FIXME: consider moving this to share definition with schedule-form in
  // 'New Job Config'-wizard
  const scheduleTypesMap: Record<string, string> = {
    day: "täglich",
    week: "wöchentlich",
    month: "monatlich",
  };
  if (!config) return <Table.HeadCell>{t("Wiederholung")}</Table.HeadCell>;
  return (
    <Table.Cell>
      {config.schedule?.active
        ? config.schedule.repeat?.unit
          ? t(scheduleTypesMap[config!.schedule.repeat.unit])
          : t("einmalig")
        : "-"}
    </Table.Cell>
  );
}

export function StatusCell({ config }: TableCellProps) {
  if (!config) return <Table.HeadCell>{t("Status")}</Table.HeadCell>;
  return <Table.Cell>{t(formatJobConfigStatus(config))}</Table.Cell>;
}

export function ArchivedRecordsCell({ config }: TableCellProps) {
  const [records, setRecords] = useState<null | number>(null);
  const fetchRecordsByJobConfig = useGlobalStore(
    (state) => state.job.fetchRecordsByJobConfig
  );

  const errorHandler = useContext(ErrorMessageContext);

  useEffect(() => {
    if (!config) return;
    fetchRecordsByJobConfig({
      jobConfigId: config.id,
      success: "true",
      onSuccess: (records) => setRecords(records.length),
      onFail: (error) =>
        errorHandler?.pushMessage({
          id: `fetch-records-${config.id}`,
          text: error,
        }),
    });
    // eslint-disable-next-line
  }, [config, fetchRecordsByJobConfig]);

  if (!config) return <Table.HeadCell>{t("Archivierte IEs")}</Table.HeadCell>;
  return <Table.Cell>{records ?? <Spinner size="xs" />}</Table.Cell>;
}

export function IssuesCell({ config }: TableCellProps) {
  const [issues, setIssues] = useState<null | number>(null);
  const fetchRecordsByJobConfig = useGlobalStore(
    (state) => state.job.fetchRecordsByJobConfig
  );

  const errorHandler = useContext(ErrorMessageContext);

  useEffect(() => {
    if (!config) return;
    fetchRecordsByJobConfig({
      jobConfigId: config.id,
      success: "false",
      onSuccess: (records) => setIssues(records.length),
      onFail: (error) =>
        errorHandler?.pushMessage({
          id: `fetch-issues-${config.id}`,
          text: error,
        }),
    });
    // eslint-disable-next-line
  }, [config, fetchRecordsByJobConfig]);

  if (!config) return <Table.HeadCell>{t("Issues")}</Table.HeadCell>;
  return <Table.Cell>{issues ?? <Spinner size="xs" />}</Table.Cell>;
}

export function ActionsCell({ config }: TableCellProps) {
  const acl = useGlobalStore((state) => state.session.acl);
  const workspaces = useGlobalStore((state) => state.workspace.workspaces);
  const templates = useGlobalStore((state) => state.template.templates);
  const fetchList = useGlobalStore((state) => state.job.fetchList);
  const fetchJobConfig = useGlobalStore((state) => state.job.fetchJobConfig);
  const fetchJobInfo = useGlobalStore((state) => state.job.fetchJobInfo);

  const errorHandler = useContext(ErrorMessageContext);

  const [showConfirmWatchModal, setShowConfirmWatchModal] = useState(false);
  const [loadingJobExecution, setLoadingJobExecution] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showCUModal, setShowCUModal] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const initFromConfig = useFormStore((state) => state.initFromConfig);
  const navigate = useNavigate();

  // devMode-Modal for tracking job progress
  const [token, setToken] = useState<string | null>(null);
  const [showMonitorJobModal, setShowMonitorJobModal] = useState(false);

  function submitJob() {
    if (!config) return;
    setLoadingJobExecution(true);
    fetch(
      host +
        "/api/curator/job?" +
        new URLSearchParams({ id: config.id }).toString(),
      {
        method: "POST",
        credentials: credentialsValue,
      }
    )
      .then((response) => {
        setLoadingJobExecution(false);
        if (!response.ok) {
          response.text().then((text) =>
            errorHandler?.pushMessage({
              id: `submit-${config.id}`,
              text: `${t(
                `Starten eines Jobs mittels Jobkonfiguration '${
                  config.name ?? config.id
                }' nicht erfolgreich`
              )}: ${text}`,
            })
          );
          return;
        }
        return response.json();
      })
      .then((json) => {
        fetchJobConfig({ jobConfigId: config.id });
        setToken(json.value);
        setShowMonitorJobModal(true);
      })
      .catch((error) => {
        errorHandler?.pushMessage({
          id: `submit-${config.id}`,
          text: `${t(
            `Fehler beim Starten eines Jobs mittels Jobkonfiguration '${
              config.name ?? config.id
            }'`
          )}: ${error.message}`,
        });
      });
  }

  if (!config)
    return <Table.HeadCell className="w-1">{t("Aktionen")}</Table.HeadCell>;
  return (
    <Table.Cell>
      {token ? (
        <MonitorJobModal
          show={showMonitorJobModal}
          initialToken={token}
          onClose={() => {
            setToken(null);
            setShowMonitorJobModal(false);
          }}
        />
      ) : null}
      <div className="flex flex-row space-x-1">
        {acl?.CREATE_JOB ? (
          <>
            <Button
              className="p-0 aspect-square items-center"
              size="xs"
              disabled={loadingJobExecution || config.status !== "ok"}
              onClick={() => {
                // fetch config to get current latestExec
                fetchJobConfig({
                  jobConfigId: config.id,
                  onFail: (error) =>
                    errorHandler?.pushMessage({
                      id: `submit-${config.id}`,
                      text: t(`Ein Fehler ist aufgetreten: ${error}`),
                    }),
                  // fetch latestExec-info if available
                  onSuccess: (config) => {
                    if (config.latestExec) {
                      fetchJobInfo({
                        token: config.latestExec,
                        onFail: (error) =>
                          errorHandler?.pushMessage({
                            id: `submit-${config.id}`,
                            text: t(`Ein Fehler ist aufgetreten: ${error}`),
                          }),
                        onSuccess: (jobInfo) => {
                          // offer to watch job that is not yet completed or submit otherwise
                          if (
                            ["completed", "aborted"].includes(
                              jobInfo.status ?? ""
                            )
                          )
                            submitJob();
                          else setShowConfirmWatchModal(true);
                        },
                      });
                    } else submitJob();
                  },
                });
              }}
            >
              {loadingJobExecution ? (
                <Spinner size="sm" />
              ) : (
                <FiPlay size={20} />
              )}
            </Button>
            <ConfirmModal
              show={showConfirmWatchModal}
              title={t("Job verfolgen")}
              onConfirm={() => {
                setShowConfirmWatchModal(false);
                if (config.latestExec) {
                  setToken(config.latestExec);
                  setShowMonitorJobModal(true);
                }
              }}
              onCancel={() => {
                setShowConfirmWatchModal(false);
              }}
            >
              <span>
                {t(
                  "Es läuft bereits ein Job mit dieser Konfiguration. Möchten Sie diesen Job verfolgen?"
                )}
              </span>
            </ConfirmModal>
          </>
        ) : null}
        {acl?.READ_JOBCONFIG ? (
          <Button
            className="p-0 aspect-square items-center"
            size="xs"
            onClick={() => navigate(`/job-details?id=${config.id}`)}
          >
            <FiEye size={20} />
          </Button>
        ) : null}
        {acl?.MODIFY_JOBCONFIG ? (
          <>
            <Button
              className="p-0 aspect-square items-center"
              size="xs"
              onClick={() => {
                if (
                  config === undefined ||
                  config.workspaceId === undefined ||
                  workspaces[config.workspaceId] === undefined ||
                  config.templateId === undefined ||
                  templates[config.templateId] === undefined
                ) {
                  errorHandler?.pushMessage({
                    id: `update-${config.id}`,
                    text: t(
                      "Etwas ist schief gelaufen, eine der Konfigurationen für Job, Arbeitsbereich oder Template fehlt."
                    ),
                  });
                  return;
                }
                initFromConfig(
                  config,
                  templates[config.templateId],
                  workspaces[config.workspaceId]
                );
                setShowCUModal(true);
              }}
            >
              <FiEdit3 size={20} />
            </Button>
            <CUModal
              show={showCUModal}
              onClose={() => setShowCUModal(false)}
              tab={2}
            />
          </>
        ) : null}
        {acl?.DELETE_JOBCONFIG ? (
          <>
            <Button
              className="p-0 aspect-square items-center"
              size="xs"
              disabled={loadingDelete}
              onClick={() => {
                setLoadingDelete(true);
                setShowConfirmDeleteModal(true);
              }}
            >
              {loadingDelete ? <Spinner size="sm" /> : <FiTrash2 size={20} />}
            </Button>
            <ConfirmModal
              show={showConfirmDeleteModal}
              title={t("Löschen")}
              onConfirm={() => {
                setShowConfirmDeleteModal(false);
                fetch(
                  host +
                    "/api/curator/job-config?" +
                    new URLSearchParams({ id: config.id }).toString(),
                  {
                    method: "DELETE",
                    credentials: credentialsValue,
                  }
                )
                  .then((response) => {
                    setLoadingDelete(false);
                    if (!response.ok) {
                      response.text().then((text) =>
                        errorHandler?.pushMessage({
                          id: `delete-${config.id}`,
                          text: `${t(
                            `Löschen von Jobkonfiguration '${
                              config.name ?? config.id
                            }' nicht erfolgreich`
                          )}: ${text}`,
                        })
                      );
                      return;
                    }
                    fetchList({ replace: true });
                  })
                  .catch((error) => {
                    setLoadingDelete(false);
                    errorHandler?.pushMessage({
                      id: `delete-${config.id}`,
                      text: `${t(
                        `Fehler beim Löschen von Jobkonfiguration '${
                          config.name ?? config.id
                        }'`
                      )}: ${error.message}`,
                    });
                    fetchList({ replace: true });
                  });
              }}
              onCancel={() => {
                setShowConfirmDeleteModal(false);
                setLoadingDelete(false);
              }}
            >
              <span>
                {config.name
                  ? t(`Job-Konfiguration '${config.name}' löschen?`)
                  : t("Unbenannte Job-Konfiguration löschen?")}
              </span>
            </ConfirmModal>
          </>
        ) : null}
      </div>
    </Table.Cell>
  );
}

export function IdCell({ config }: TableCellProps) {
  if (!config) return <Table.HeadCell>{t("ID")}</Table.HeadCell>;
  return <Table.Cell>{config.id}</Table.Cell>;
}
