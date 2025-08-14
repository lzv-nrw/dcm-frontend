import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Button,
  Label,
  TextInput,
  Tabs,
  TabItem,
  Alert,
  Timeline,
  TimelineItem,
  TimelinePoint,
  TimelineContent,
  TimelineTime,
  TimelineTitle,
  TimelineBody,
  List,
  Spinner,
} from "flowbite-react";
import { FiCheck, FiAlertTriangle, FiCircle } from "react-icons/fi";

import t from "../../utils/translation";
import { getTextInputColor } from "../../utils/forms";
import useGlobalStore from "../../store";
import { devMode } from "../../App";
import Modal from "../../components/Modal";

export const StageOrder = [
  "import_ies",
  "build_ip",
  "import_ips",
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
    default:
      return t("Unbekannter Schritt");
  }
}


interface DebugJobModalProps {
  show: boolean;
  initialToken?: string;
  onClose?: () => void;
}

export default function DebugJobModal({
  show,
  initialToken,
  onClose,
}: DebugJobModalProps) {
  const [showNotFoundError, setShowNotFoundError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(initialToken ?? "");
  const [jobInfos, fetchJobInfo] = useGlobalStore(
    useShallow((state) => [state.job.jobInfos, state.job.fetchJobInfo])
  );

  // disable initial 404-error-message for jobs that have not been started yet
  useEffect(() => {
    setShowNotFoundError(token !== initialToken);
  }, [initialToken, token]);

  useEffect(() => {
    if (!token || token?.length !== 36) return;
    const interval = setInterval(() => {
      if (["aborted", "completed"].includes(jobInfos[token]?.status ?? "")) {
        setError(null);
        clearInterval(interval);
      } else
        fetchJobInfo({
          token,
          useACL: true,
          forceReload: true,
          onSuccess: () => setError(null),
          onFail: (e) => {
            setError(e);
          },
        });
    }, 100);
    return () => clearInterval(interval);
  }, [token, jobInfos, fetchJobInfo]);

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
      <Modal.Body>
        <div className="space-y-2">
          {devMode && (
            <>
              <Label
                htmlFor="token"
                value={t("Token")}
                className="font-semibold"
              />
              <TextInput
                className="w-72"
                id="token"
                value={token}
                placeholder="Job Token"
                color={getTextInputColor({
                  ok: token === "" ? null : token.length === 36,
                })}
                onChange={(e) => setToken(e.target.value)}
              />
            </>
          )}
          {token?.length === 36 &&
          error &&
          // heuristically determine whether error message should be displayed
          (showNotFoundError || !error.includes("NOT FOUND")) ? (
            <Alert color="failure">{error}</Alert>
          ) : null}
          {
            // heuristically determine whether spinner should be displayed
            token !== "" &&
              jobInfos[token] === undefined &&
              (error === null || error.includes("NOT FOUND")) && (
                <div className="flex w-full justify-items-center justify-center">
                  <Spinner size="xl" />
                </div>
              )
          }
          {jobInfos[token] !== undefined && (
            <div className="space-y-2">
              {devMode && (
                <Label value={t("Records")} className="font-semibold" />
              )}
              {!jobInfos[token].report?.data?.records ? (
                <div className="flex flex-row space-x-2 items-center">
                  <Spinner size="sm" />
                  <span className="text-sm text-gray-500">
                    {t(
                      "Der Job wurde gestartet, aber es sind noch keine Records verfügbar."
                    )}
                  </span>
                </div>
              ) : null}
              <Tabs variant="pills">
                {Object.entries(
                  jobInfos[token].report?.data?.records ?? {}
                ).map(([recordId, record]) => (
                  <TabItem
                    key={recordId}
                    active
                    title={
                      recordId === "<bootstrap>"
                        ? t("Initialisierung")
                        : recordId
                    }
                  >
                    <div className="px-5 py-3 h-96 overflow-y-auto border-2 rounded">
                      <Timeline>
                        {StageOrder.map((stage) =>
                          record.stages?.[stage] ? (
                            <TimelineItem key={recordId + stage}>
                              <TimelinePoint
                                theme={getTimelinePointTheme(
                                  record.stages[stage].success
                                )}
                                icon={
                                  record.stages[stage].success === undefined
                                    ? FiCircle
                                    : record.stages[stage].success
                                    ? FiCheck
                                    : FiAlertTriangle
                                }
                              />
                              <TimelineContent>
                                <TimelineTime>
                                  {record.stages[stage].logId}
                                </TimelineTime>
                                <TimelineTitle>
                                  {getStageTitle(stage)}
                                </TimelineTitle>
                                <TimelineBody>
                                  <List>
                                    {(
                                      jobInfos[token].report?.children[
                                        record.stages[stage].logId || ""
                                      ]?.log?.INFO || []
                                    ).map((msg, index) => (
                                      <List.Item
                                        key={
                                          recordId +
                                          stage +
                                          msg.datetime +
                                          "-info" +
                                          index
                                        }
                                      >
                                        <span className="font-semibold mr-2">
                                          {msg.origin}
                                        </span>
                                        {msg.body}
                                      </List.Item>
                                    ))}
                                  </List>
                                </TimelineBody>
                                <TimelineBody>
                                  <List>
                                    {(
                                      jobInfos[token].report?.children[
                                        record.stages[stage].logId || ""
                                      ]?.log?.ERROR || []
                                    ).map((msg, index) => (
                                      <List.Item
                                        key={
                                          recordId +
                                          stage +
                                          msg.datetime +
                                          "-error" +
                                          index
                                        }
                                        className="text-red-600"
                                      >
                                        <span className="font-semibold mr-2">
                                          {msg.origin}
                                        </span>
                                        {msg.body}
                                      </List.Item>
                                    ))}
                                  </List>
                                </TimelineBody>
                              </TimelineContent>
                            </TimelineItem>
                          ) : null
                        )}
                      </Timeline>
                    </div>
                  </TabItem>
                ))}
              </Tabs>
            </div>
          )}
          <div className="flex flex-row w-full justify-between">
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
            ) : (
              <div />
            )}
            <Button onClick={onClose}>{t("Schließen")}</Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}
