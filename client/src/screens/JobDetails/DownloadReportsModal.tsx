import { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "flowbite-react";

import t from "../../utils/translation";
import { genericSort } from "../../utils/genericSort";
import { IE, JobInfo } from "../../types";
import { credentialsValue, host } from "../../App";
import MessageBox, { useMessageHandler } from "../../components/MessageBox";
import Modal from "../../components/Modal";

interface DownloadReportsModalProps {
  show: boolean;
  ie: IE;
  onClose?: () => void;
}

export default function DownloadReportsModal({
  show,
  ie,
  onClose,
}: DownloadReportsModalProps) {
  const errorMessageHandler = useMessageHandler([]);

  const [status, setStatus] = useState("");
  const [running, setRunning] = useState(true);
  const [dataUrl, setDataUrl] = useState<string | undefined>(undefined);

  // the fetch-process should be run only once
  // to achieve this, use an array to simulate a mutex (pop will return
  // only one not-undefined value)
  // this makes it necessary to remove this modal from the dom for
  // repeating that process
  const mutex = useRef([1]);
  const abort = useRef(false);

  // run process
  useEffect(() => {
    (async () => {
      // this fetch-process should be run only once (see comment above)
      if (!mutex.current.pop()) return;
      setRunning(true);
      setStatus("Download wird vorbereitet..");
      errorMessageHandler.clearMessages();
      const completedRecords: string[] = [];
      const jobTokens = Object.values(ie.records ?? {}).map(
        (record) => record.jobToken
      );
      const jobInfos: Record<string, JobInfo> = {};
      for (const token of jobTokens) {
        setStatus(
          `${completedRecords.length} von ${jobTokens.length} Reports geladen..`
        );

        // for debugging
        // await new Promise((r) => setTimeout(r, 1000));

        let message = "";
        const response = await fetch(
          host +
            "/api/curator/job/info?" +
            new URLSearchParams({ token }).toString(),
          {
            method: "GET",
            credentials: credentialsValue,
          }
        ).catch((error) => {
          message = `${t("Fehler beim Laden von Report")}: ${error.message}`;
        });

        if (response) {
          if (!response.ok)
            message = `Fehler beim Laden von Report '${token}': ${await response.text()}`;
          else
            await response
              .json()
              .then((json) => (jobInfos[token] = json))
              .catch((error) => {
                message = `Fehler beim Parsen von Report '${token}': ${error.message}`;
              });
        }
        if (message !== "")
          errorMessageHandler.pushMessage({
            id: `fetch-job-info-failed-${token}`,
            text: t(message),
          });
        completedRecords.push(token);
        if (abort.current) break;
      }
      if (!abort.current) {
        setStatus("");
        setRunning(false);
        const result: any = { ...ie, records: [] };
        for (const record of Object.values(ie.records ?? {}).sort(
          genericSort({ getValue: (r) => r.datetimeChanged, direction: "desc" })
        )) {
          result.records.push({
            ...record,
            stages: {
              ...Object.fromEntries(
                Object.entries(
                  jobInfos[record.jobToken ?? ""]?.report?.data.records[
                    record.id
                  ]?.stages ?? {}
                ).map(([stageId, stageInfo]) => [
                  stageId,
                  {
                    ...stageInfo,
                    logId: undefined,
                    report:
                      jobInfos[record.jobToken ?? ""]?.report?.children?.[
                        stageInfo.logId ?? ""
                      ],
                  },
                ])
              ),
            },
          });
        }

        setDataUrl(
          URL.createObjectURL(
            new Blob([JSON.stringify(result, null, 2)], {
              type: "application/json",
            })
          )
        );
      }
    })();
    // eslint-disable-next-line
  }, []);

  return (
    <Modal
      show={show}
      width="xl"
      height="md"
      onClose={running ? undefined : onClose}
      dismissible={!running}
    >
      <Modal.Header title={t("Report herunterladen")} />
      <Modal.Body>
        <div className="h-full w-full flex flex-col space-y-2">
          <MessageBox
            className="mt-2 mb-5"
            messages={errorMessageHandler.messages}
            messageTitle={t(
              "Ein Fehler ist aufgetreten, der Report ist vermutlich unvollständig:"
            )}
          />
          {status ? (
            <div className="flex flex-row my-2 space-x-2 items-center">
              {running && <Spinner size="xs" />}
              <p>{t(status)}</p>
            </div>
          ) : null}
          <div className="flex justify-center my-5">
            <Button
              disabled={dataUrl === undefined}
              onClick={() => {
                window.open(dataUrl, "_blank");
              }}
            >
              {t("Report öffnen")}
            </Button>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="w-full flex flex-row justify-between">
          <div />
          <Button
            onClick={() => {
              abort.current = true;
              onClose?.();
            }}
          >
            {running ? t("Abbrechen") : t("Schließen")}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
