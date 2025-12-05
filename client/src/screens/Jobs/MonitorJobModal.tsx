import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Button,
  TextInput,
  Timeline,
  TimelineItem,
  TimelinePoint,
  TimelineContent,
  TimelineTime,
  TimelineTitle,
  TimelineBody,
  List,
  Spinner,
  Pagination,
} from "flowbite-react";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiPlayCircle,
  FiCheck,
  FiAlertTriangle,
  FiCircle,
  FiPauseCircle,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

import t from "../../utils/translation";
import { getTextInputColor } from "../../utils/forms";
import { ChildReport } from "../../types";
import useGlobalStore from "../../store";
import { credentialsValue, devMode, host } from "../../App";
import Modal from "../../components/Modal";
import { reformatDatetime } from "../../utils/dateTime";
import MessageBox, { useMessageHandler } from "../../components/MessageBox";

export const StageOrder = [
  "build_ip",
  "validation_metadata",
  "validation_payload",
  "prepare_ip",
  "build_sip",
  "transfer",
  "ingest",
];

/**
 * map stage-id to human readable title
 * @param stage stage identifier
 * @returns human readable title as string
 */
export function getStageTitle(stage: string): string {
  switch (stage) {
    case "import":
      return t("Importiere Records");
    case "import_ies":
      return t("Importiere IEs");
    case "build_ip":
      return t("Baue IP");
    case "import_ips":
      return t("Importiere IPs");
    case "validation_metadata":
      return t("Validiere IP Format & Metadaten");
    case "validation_payload":
      return t("Validiere IP Payload");
    case "prepare_ip":
      return t("Bereite IP vor");
    case "build_sip":
      return t("Baue SIP");
    case "transfer":
      return t("Übertrage SIP");
    case "ingest":
      return t("Löse Ingest des SIP aus");
    case "process":
      return t("Führe Job aus");
    default:
      return t("Unbekannter Schritt");
  }
}

interface MonitorJobModalProps {
  show: boolean;
  initialToken?: string;
  onClose?: () => void;
}

type SidebarItemStatusType = "waiting" | "running" | "success" | "failure";
function SidebarItem({
  status,
  active = false,
  text,
  subtext,
  onClick,
}: {
  status: SidebarItemStatusType;
  active?: boolean;
  text: string;
  subtext?: string;
  onClick?: () => void;
}) {
  function getBaseIcon(status: SidebarItemStatusType) {
    switch (status) {
      case "waiting":
        return <FiPauseCircle className="text-yellow-500" size={25} />;
      case "running":
        return <FiPlayCircle className="text-sky-500" size={25} />;
      case "success":
        return <FiCheckCircle className="text-green-500" size={25} />;
      case "failure":
        return <FiAlertCircle className="text-red-500" size={25} />;
    }
  }

  return (
    <div
      className={`flex flex-row space-x-2 items-center px-2 py-1 rounded hover:bg-gray-200 hover:cursor-pointer ${
        active && "bg-gray-100"
      }`}
      onClick={onClick}
      title={subtext}
    >
      <div className="grow">{getBaseIcon(status)}</div>
      <div className="w-full flex flex-col space-y-1 content-start">
        <span className="dcm-clamp-text">{text}</span>
        {subtext ? (
          <span className="text-gray-500 text-xs dcm-clamp-text">
            {subtext}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const reportMessages = [
  { message: "INFO", color: "" },
  { message: "WARNING", color: "text-yellow-500" },
  { message: "ERROR", color: "text-red-600" },
];

/**
 * Helper-component that renders info, warning, and error-messages from
 * a given report.
 */
function Log({ report }: { report?: ChildReport }) {
  return (
    <>
      {reportMessages.map(({ message, color }) => (
        <TimelineBody key={message}>
          <List>
            {(report?.log?.[message] || []).map((msg, index) => (
              <List.Item
                key={msg.datetime + `-${message.toLowerCase()}` + index}
                className={color}
              >
                <span className="font-semibold mr-2">{msg.origin}</span>
                {msg.body}
              </List.Item>
            ))}
          </List>
        </TimelineBody>
      ))}
    </>
  );
}

/**
 * Helper to handle data that is either a string or an array.
 * @param valueOrArray string or array of strings
 * @returns either the value itself or the first value from the given
 *   array; if the string is undefined or the array is empty, returns
 *   undefined instead
 */
function getValueOrFirstFromArray(
  valueOrArray?: string | string[]
): string | undefined {
  if (!Array.isArray(valueOrArray)) return valueOrArray;
  if (valueOrArray.length === 0) return undefined;
  return valueOrArray[0];
}

const MAX_ERRORS_BEFORE_STOP = 5;
const FETCH_JOB_INFO_INTERVAL = 1000;

export default function MonitorJobModal({
  show,
  initialToken,
  onClose,
}: MonitorJobModalProps) {
  const errorMessageHandler = useMessageHandler([]);
  const [fetchFailedAndHasBeenStopped, setFetchFailedAndHasBeenStopped] =
    useState(false);
  const [showNotFoundError, setShowNotFoundError] = useState<boolean>(false);
  const [token, setToken] = useState(initialToken ?? "");
  const [jobInfos, fetchJobInfo] = useGlobalStore(
    useShallow((state) => [state.job.jobInfos, state.job.fetchJobInfo])
  );
  const [importChildId, setImportChildId] = useState<string | undefined>(
    undefined
  );
  const [importChildIsSelected, setImportChildIsSelected] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | undefined>(
    undefined
  );
  const reportDetailsContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // reset modal state
  useEffect(() => {
    errorMessageHandler.clearMessages();
    setFetchFailedAndHasBeenStopped(false);
    // eslint-disable-next-line
  }, [show]);
  // handle scroll position
  // * scroll to bottom when switching tabs
  useEffect(() => {
    if (!reportDetailsContainerRef.current) return;
    reportDetailsContainerRef.current.scrollTo(
      0,
      autoScroll ? reportDetailsContainerRef.current.scrollHeight : 0
    );
    // eslint-disable-next-line
  }, [selectedRecordId]);
  // * scroll to bottom when report is updated
  useEffect(() => {
    if (!reportDetailsContainerRef.current) return;
    if (!autoScroll) return;
    if (
      selectedRecordId === undefined
        ? (!importChildIsSelected && jobInfos[token].status !== "running") ||
          (importChildIsSelected &&
            jobInfos[token].report?.children?.[importChildId ?? ""]?.progress
              ?.status !== "running")
        : jobInfos[token].report?.data.records?.[selectedRecordId]?.completed
    )
      return;
    reportDetailsContainerRef.current?.scrollTo(
      0,
      reportDetailsContainerRef.current.scrollHeight
    );
    // eslint-disable-next-line
  }, [jobInfos[token]]);

  const [loadingAbort, setLoadingAbort] = useState(false);

  // identify child-report for import
  useEffect(() => {
    setImportChildId(undefined);
  }, [initialToken, token, setImportChildId]);
  useEffect(() => {
    if (importChildId) return;
    const child = Object.entries(jobInfos[token]?.report?.children ?? {}).find(
      ([childId]) =>
        childId.endsWith("import_ies") || childId.endsWith("import_ips")
    );
    if (!child) return;
    setImportChildId(child[0]);
    // eslint-disable-next-line
  }, [jobInfos[token], setImportChildId]);

  // disable initial 404-error-message for jobs that have not been started yet
  useEffect(() => {
    setShowNotFoundError(token !== initialToken);
  }, [initialToken, token]);

  // fetching job info
  function fetchThisJobInfo(
    onFail?: (error: string) => void,
    onSuccess?: () => void
  ) {
    fetchJobInfo({
      token,
      useACL: true,
      forceReload: true,
      onSuccess: () => {
        onSuccess?.();
        errorMessageHandler.removeMessage("fetch-job-info-failed");
        errorMessageHandler.removeMessage("fetch-job-info-error");
      },
      onFail: (error) => {
        onFail?.(error);
        errorMessageHandler?.pushMessage({
          id: "fetch-job-info-failed",
          text: error,
        });
      },
    });
  }
  // * fetch on initial load
  useEffect(() => {
    if (!show || !token || token?.length !== 36) return;
    fetchThisJobInfo();
    // eslint-disable-next-line
  }, [show, token]);
  // * run fetch on interval
  useEffect(() => {
    if (!show || !token || token?.length !== 36) return;
    let errorCounter = 0;
    let fetchRunning = false;
    const interval = setInterval(() => {
      if (fetchRunning) return;
      if (
        ["aborted", "completed"].includes(jobInfos[token]?.status ?? "") &&
        (jobInfos[token]?.collection?.completed ?? true)
      ) {
        clearInterval(interval);
      } else {
        fetchRunning = true;
        fetchThisJobInfo(
          () => {
            fetchRunning = false;
            errorCounter++;
          },
          () => {
            fetchRunning = false;
          }
        );
      }

      if (errorCounter >= MAX_ERRORS_BEFORE_STOP) {
        setFetchFailedAndHasBeenStopped(true);
        errorMessageHandler.pushMessage({
          id: "fetch-job-info-error",
          text: t(
            `Abruf der Ergebnisse für den Job '${token}' ist wiederholt fehlgeschlagen. Bitte versuchen Sie es später erneut.`
          ),
        });
        clearInterval(interval);
        return;
      }
    }, FETCH_JOB_INFO_INTERVAL);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [show, token, jobInfos]);
  // * jump to latest in collection
  useEffect(() => {
    if (
      !autoScroll ||
      jobInfos[token]?.collection?.completed ||
      token !== jobInfos[token]?.collection?.tokens.at(-2)
    )
      return;

    setToken((state) => jobInfos[state]?.collection?.tokens.at(-1) ?? state);
    // eslint-disable-next-line
  }, [jobInfos[token]?.collection?.tokens.at(-1)]);

  function getTimelinePointTheme(ok?: boolean): any {
    let tc, bgc;
    if (ok === undefined) {
      tc = "text-gray-600";
      bgc = "bg-gray-200";
    } else if (ok) {
      tc = "text-green-600";
      bgc = "bg-green-200";
    } else {
      tc = "text-red-600";
      bgc = "bg-red-200";
    }

    return {
      marker: {
        icon: {
          base: `h-3 w-3 ${tc}`,
          wrapper: `absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ${bgc} ring-8 ring-white`,
        },
      },
    };
  }

  return (
    <Modal show={show} width="7xl" onClose={onClose} dismissible={true}>
      <Modal.Header title={t("Verfolge Job ") + (token ? `'${token}'` : "")} />
      <Modal.Body className="py-4">
        <div className="space-y-2">
          {token?.length === 36 &&
          errorMessageHandler.messages.length > 0 &&
          (showNotFoundError ||
            !errorMessageHandler.messages.some((msg) =>
              msg.text.toUpperCase().includes("NOT FOUND")
            )) ? (
            <MessageBox
              className="my-2"
              messages={errorMessageHandler.messages}
              messageTitle={t("Ein Fehler ist aufgetreten")}
              onDismiss={errorMessageHandler.clearMessages}
            />
          ) : null}
          <div className="flex flex-row space-x-4">
            {devMode && (
              <div className="flex flex-col space-y-2">
                <h3 className="font-semibold">{t("Token")}</h3>
                <TextInput
                  theme={{
                    field: {
                      input: {
                        base: "h-10 block w-full border focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50",
                      },
                    },
                  }}
                  className="w-80"
                  id="token"
                  value={token}
                  placeholder="Job Token"
                  color={getTextInputColor({
                    ok: token === "" ? null : token.length === 36,
                  })}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
            )}
            {token &&
              (jobInfos[token]?.collection?.tokens?.length ?? 0) > 1 && (
                <div className="flex flex-col space-y-2 grow">
                  <h3 className="font-semibold">
                    {t("Stapelverarbeitung: Stapel wählen")}
                  </h3>
                  <Pagination
                    currentPage={
                      (jobInfos[token ?? ""].collection?.tokens.indexOf(
                        token
                      ) ?? 0) + 1
                    }
                    totalPages={
                      jobInfos[token ?? ""].collection?.tokens?.length ?? 0
                    }
                    previousLabel=""
                    nextLabel=""
                    layout="pagination"
                    showIcons
                    onPageChange={(page) => {
                      setToken(
                        (state) =>
                          jobInfos[state].collection?.tokens[page - 1] ?? state
                      );
                    }}
                    theme={{
                      pages: {
                        base: "mt-0 inline-flex items-center -space-x-px",
                        previous: {
                          base: "h-10 ml-0 rounded-l-lg border border-gray-300 bg-white px-3 py-2 leading-tight text-gray-500 enabled:hover:bg-gray-100 enabled:hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 enabled:dark:hover:bg-gray-700 enabled:dark:hover:text-white",
                          icon: "h-6 w-5",
                        },
                        next: {
                          base: "h-10 rounded-r-lg border border-gray-300 bg-white px-3 py-2 leading-tight text-gray-500 enabled:hover:bg-gray-100 enabled:hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 enabled:dark:hover:bg-gray-700 enabled:dark:hover:text-white",
                          icon: "h-6 w-5",
                        },
                        selector: {
                          base: "h-10 w-12 border border-gray-300 bg-white py-2 leading-tight text-gray-500 enabled:hover:bg-gray-100 enabled:hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 enabled:dark:hover:bg-gray-700 enabled:dark:hover:text-white",
                        },
                      },
                    }}
                  />
                </div>
              )}
          </div>
          {
            // heuristically determine whether spinner should be displayed
            token !== "" &&
              !fetchFailedAndHasBeenStopped &&
              jobInfos[token] === undefined &&
              (errorMessageHandler.messages.length !== 0 ||
                errorMessageHandler.messages.some((msg) =>
                  msg.text.toUpperCase().includes("NOT FOUND")
                )) && (
                <div className="flex w-full justify-items-center justify-center">
                  <Spinner size="xl" />
                </div>
              )
          }
          {jobInfos[token] !== undefined && (
            <div className="space-y-2">
              <h3 className="font-semibold">{t("Zusammenfassung")}</h3>
              <div className="flex flex-row gap-4">
                <div className="flex flex-col flex-grow space-y-2">
                  <div className="px-4 py-2 rounded-lg shadow-md border border-gray-200">
                    <h5 className="font-semibold">
                      {t(
                        `Ausführung${
                          jobInfos[token ?? ""]?.collection ||
                          !(
                            jobInfos[token ?? ""]?.report?.data?.finalBatch ??
                            true
                          )
                            ? " (Stapelverarbeitung)"
                            : ""
                        }`
                      )}
                    </h5>
                    <div className="space-x-2">
                      <span>
                        {t("Status")}:{" "}
                        {((status) => {
                          switch (status) {
                            case "queued":
                              return t("Job ist eingereiht");
                            case "running":
                              return t("Job wird ausgeführt");
                            case "completed":
                              return t("Job ist abgeschlossen");
                            case "aborted":
                              return t("Job wurde abgebrochen");
                            default:
                              return t("unbekannt");
                          }
                        })(jobInfos[token].status)}
                      </span>
                    </div>
                    <div className="space-x-2">
                      <span>
                        {t("Auslöser")}:{" "}
                        {((status) => {
                          switch (status) {
                            case "manual":
                              return t("manuell");
                            case "onetime":
                              return t("einmalig nach Zeitplan");
                            case "scheduled":
                              return t("nach regelmäßigem Zeitplan");
                            case "test":
                              return t("Testausführung");
                            default:
                              return t("unbekannt");
                          }
                        })(jobInfos[token].triggerType)}
                      </span>
                    </div>
                    <div className="space-x-2">
                      <span>
                        {t("Records")}:{" "}
                        {
                          Object.keys(
                            jobInfos[token].report?.data?.records ?? {}
                          ).length
                        }
                      </span>
                      {
                        // show spinner if job is running and import-stage is not completed
                        ["queued", "running"].includes(
                          jobInfos[token].status ?? ""
                        ) &&
                          ["queued", "running"].includes(
                            jobInfos[token].report?.children?.[
                              importChildId ?? ""
                            ]?.progress?.status ?? "queued"
                          ) && <Spinner className="mb-1" size="xs" />
                      }
                    </div>
                  </div>
                </div>
                <div className="flex flex-col flex-grow space-y-2">
                  <div className="px-4 py-2 rounded-lg shadow-md border border-gray-200">
                    <h5 className="font-semibold">{t("Ereignisse")}</h5>
                    <div className="space-x-2">
                      <span>
                        {t("Ausgelöst am ")}
                        {jobInfos[token].datetimeTriggered
                          ? reformatDatetime(
                              jobInfos[token].datetimeTriggered,
                              { showTime: true, devMode }
                            )
                          : "-"}
                      </span>
                    </div>
                    <div className="space-x-2">
                      <span>
                        {t("Gestartet am ")}
                        {jobInfos[token].datetimeStarted
                          ? reformatDatetime(jobInfos[token].datetimeStarted, {
                              showTime: true,
                              devMode,
                            })
                          : "-"}
                      </span>
                    </div>
                    <div className="space-x-2">
                      <span>
                        {t("Abgeschlossen am ")}
                        {jobInfos[token].datetimeEnded
                          ? reformatDatetime(jobInfos[token].datetimeEnded, {
                              showTime: true,
                              devMode,
                            })
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="font-semibold">{t("Ergebnisse")}</h3>
              <div className="flex flex-row w-full space-x-2 h-96 relative">
                <div className="select-none flex flex-col space-y-1 w-1/3 overflow-y-auto">
                  <SidebarItem
                    status={(() => {
                      if (
                        jobInfos[token].status === undefined ||
                        jobInfos[token].status === "queued"
                      )
                        return "waiting";
                      if (jobInfos[token].status === "running")
                        return "running";
                      if (jobInfos[token].status === "aborted")
                        return "failure";
                      if (
                        jobInfos[token].status === "completed" &&
                        (jobInfos[token]?.report?.data?.issues ?? 0) === 0
                      )
                        return "success";
                      return "failure";
                    })()}
                    active={
                      selectedRecordId === undefined && !importChildIsSelected
                    }
                    text={t("Job")}
                    onClick={() => {
                      setImportChildIsSelected(false);
                      setSelectedRecordId(undefined);
                    }}
                  />
                  {importChildId !== undefined && (
                    <SidebarItem
                      status={(() => {
                        const status =
                          jobInfos[token].report?.children[importChildId]
                            ?.progress?.status;
                        if (status === undefined || status === "queued")
                          return "waiting";
                        if (status === "running") return "running";
                        if (status === "aborted") return "failure";
                        if (
                          status === "completed" &&
                          jobInfos[token].report?.children[importChildId]?.data
                            ?.success
                        )
                          return "success";
                        return "failure";
                      })()}
                      active={
                        selectedRecordId === undefined && importChildIsSelected
                      }
                      text={t("Import")}
                      onClick={() => {
                        setSelectedRecordId(undefined);
                        setImportChildIsSelected(true);
                      }}
                    />
                  )}
                  {Object.keys(jobInfos[token].report?.data?.records ?? {})
                    .length > 0 ? (
                    <hr />
                  ) : null}
                  {Object.entries(
                    jobInfos[token].report?.data?.records ?? {}
                  )?.map(([recordId, record]) => (
                    <SidebarItem
                      key={recordId}
                      status={(() => {
                        if (record.status === "in-process") return "running";
                        if (record.status === "complete") return "success";
                        return "failure";
                      })()}
                      text={recordId}
                      active={selectedRecordId === recordId}
                      subtext={getValueOrFirstFromArray(
                        jobInfos[token].report?.children?.[
                          record.stages?.validation_metadata?.logId ?? ""
                        ]?.data?.bagInfoMetadata?.["DC-Title"]?.[0]
                      )}
                      onClick={() => {
                        setImportChildIsSelected(false);
                        setSelectedRecordId(recordId);
                      }}
                    />
                  ))}
                </div>
                <Button
                  className="absolute z-50 top-5 right-5 p-0 aspect-square items-center opacity-80"
                  size="sm"
                  title={t(
                    `Automatisches Scrollen ${
                      autoScroll ? "deaktivieren" : "aktivieren"
                    }`
                  )}
                  onClick={() => setAutoScroll((state) => !state)}
                >
                  {autoScroll ? <FiEye /> : <FiEyeOff />}
                </Button>
                <div
                  ref={reportDetailsContainerRef}
                  className="w-full px-5 py-3 overflow-y-auto border-2 rounded"
                >
                  {selectedRecordId !== undefined &&
                    jobInfos[token]?.report?.data?.records?.[
                      selectedRecordId
                    ] !== undefined && (
                      <Timeline>
                        {StageOrder.map((stage) =>
                          jobInfos[token].report?.data?.records?.[
                            selectedRecordId
                          ].stages?.[stage] ? (
                            <TimelineItem key={selectedRecordId + stage}>
                              <TimelinePoint
                                theme={getTimelinePointTheme(
                                  jobInfos[token].report?.data?.records?.[
                                    selectedRecordId
                                  ]?.stages?.[stage]?.success
                                )}
                                icon={
                                  jobInfos[token].report?.data?.records?.[
                                    selectedRecordId
                                  ]?.stages?.[stage]?.success === undefined
                                    ? FiCircle
                                    : jobInfos[token].report?.data?.records?.[
                                        selectedRecordId
                                      ]?.stages?.[stage]?.success
                                    ? FiCheck
                                    : FiAlertTriangle
                                }
                              />
                              <TimelineContent>
                                <TimelineTime>
                                  {
                                    jobInfos[token].report?.data?.records?.[
                                      selectedRecordId
                                    ]?.stages?.[stage]?.logId
                                  }
                                </TimelineTime>
                                <TimelineTitle>
                                  {getStageTitle(stage)}
                                </TimelineTitle>
                                <Log
                                  report={
                                    jobInfos[token].report?.children[
                                      jobInfos[token].report?.data?.records?.[
                                        selectedRecordId
                                      ]?.stages?.[stage]?.logId || ""
                                    ]
                                  }
                                />
                              </TimelineContent>
                            </TimelineItem>
                          ) : null
                        )}
                      </Timeline>
                    )}
                  {selectedRecordId === undefined && !importChildIsSelected && (
                    <Timeline>
                      <TimelineItem>
                        <TimelinePoint
                          theme={getTimelinePointTheme(
                            jobInfos[token].report?.data?.success
                          )}
                          icon={
                            jobInfos[token].report?.data?.success === undefined
                              ? FiCircle
                              : jobInfos[token].report?.data?.success
                              ? FiCheck
                              : FiAlertTriangle
                          }
                        />
                        <TimelineContent>
                          <TimelineTime>{jobInfos[token].token}</TimelineTime>
                          <TimelineTitle>
                            {getStageTitle("process")}
                          </TimelineTitle>
                          <Log report={jobInfos[token].report} />
                        </TimelineContent>
                      </TimelineItem>
                    </Timeline>
                  )}
                  {selectedRecordId === undefined && importChildIsSelected && (
                    <Timeline>
                      <TimelineItem>
                        <TimelinePoint
                          theme={getTimelinePointTheme(
                            jobInfos[token].report?.children[
                              importChildId ?? ""
                            ]?.data?.success
                          )}
                          icon={
                            jobInfos[token].report?.data?.success === undefined
                              ? FiCircle
                              : jobInfos[token].report?.data?.success
                              ? FiCheck
                              : FiAlertTriangle
                          }
                        />
                        <TimelineContent>
                          <TimelineTime>{importChildId}</TimelineTime>
                          <TimelineTitle>
                            {getStageTitle("import")}
                          </TimelineTitle>
                          <Log
                            report={
                              jobInfos[token].report?.children[
                                importChildId ?? ""
                              ]
                            }
                          />
                        </TimelineContent>
                      </TimelineItem>
                    </Timeline>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex flex-row w-full justify-between">
          <div className="flex flex-row space-x-2">
            {devMode ? (
              <Button
                disabled={jobInfos[token] === undefined}
                onClick={() =>
                  window.open(
                    "data:application/json," +
                      encodeURIComponent(JSON.stringify(jobInfos[token])),
                    "_blank"
                  )
                }
              >
                {t("Inspizieren")}
              </Button>
            ) : null}
            <Button
              disabled={
                loadingAbort ||
                !["queued", "running"].includes(jobInfos[token]?.status ?? "")
              }
              onClick={() => {
                setLoadingAbort(true);
                fetch(host + "/api/curator/job", {
                  method: "DELETE",
                  credentials: credentialsValue,
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ token: token }),
                })
                  .then(async (response) => {
                    setLoadingAbort(false);
                    if (!response.ok) {
                      throw new Error(await response.text());
                    }
                    fetchJobInfo({
                      token,
                      useACL: true,
                      forceReload: true,
                    });
                  })
                  .catch((error) => {
                    setLoadingAbort(false);
                    errorMessageHandler.pushMessage({
                      id: `abort-job`,
                      text: `${t("Fehler beim Abbrechen eines Jobs (<id>)")}: ${
                        error.message
                      }`,
                    });
                  });
              }}
            >
              {loadingAbort ? <Spinner size="sm" /> : t("Job abbrechen")}
            </Button>
          </div>
          <Button onClick={onClose}>{t("Schließen")}</Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
