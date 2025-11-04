import { useEffect, useState } from "react";
import { Button, Spinner } from "flowbite-react";

import t from "../../utils/translation";
import { RecordInfo } from "../../types";
import { getDownloadTargetsFromReport } from "../../utils/util";
import useGlobalStore from "../../store";
import { credentialsValue, host } from "../../App";
import MessageBox, { useMessageHandler } from "../../components/MessageBox";
import Modal from "../../components/Modal";

interface DownloadArtifactsModalProps {
  show: boolean;
  record: RecordInfo;
  onClose?: () => void;
}

export default function DownloadArtifactsModal({
  show,
  onClose,
  record,
}: DownloadArtifactsModalProps) {
  const fetchJobInfo = useGlobalStore((state) => state.job.fetchJobInfo);
  const [bundleJobRunning, setBundleJobRunning] = useState(false);
  const [bundleJobToken, setBundleJobToken] = useState<string | null>(null);
  const [downloadId, setDownloadId] = useState<string | undefined>(undefined);

  const errorMessageHandler = useMessageHandler([]);

  // reset on hide
  useEffect(() => {
    if (show) return;
    setBundleJobRunning(false);
    setBundleJobToken(null);
    setDownloadId(undefined);
    errorMessageHandler.clearMessages();
    // eslint-disable-next-line
  }, [show]);

  // start download when Modal is shown
  useEffect(() => {
    if (!record?.jobToken || !show) return;
    fetchJobInfo({
      token: record.jobToken,
      onSuccess: (info) => {
        setBundleJobRunning(true);
        fetch(host + "/api/curator/job/artifacts/bundle", {
          method: "POST",
          credentials: credentialsValue,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bundle: {
              targets: getDownloadTargetsFromReport(record.id, info.report).map(
                (target) => ({
                  path: target,
                })
              ),
            },
          }),
        })
          .then((response) => {
            if (!response.ok) {
              setBundleJobRunning(false);
              response.text().then((text) =>
                errorMessageHandler?.pushMessage({
                  id: "bundle-submission-bad-response",
                  text: `${t(
                    "Absenden eines Jobs zum Bauen eines Archivs von Job-Artefakten fehlgeschlagen"
                  )}: ${text}`,
                })
              );
              return;
            }
            response.json().then((json) => {
              setBundleJobToken(json.value);
            });
          })
          .catch((error) => {
            setBundleJobRunning(false);
            errorMessageHandler?.pushMessage({
              id: `bundle-submission-error`,
              text: `${t(
                "Absenden eines Jobs zum Bauen eines Archivs von Job-Artefakten fehlgeschlagen"
              )}: ${error.message}`,
            });
          });
      },
    });
    // eslint-disable-next-line
  }, [show]);

  // fetch report for bundle-job until done
  useEffect(() => {
    if (!bundleJobToken) return;
    const interval = setInterval(() => {
      fetch(
        host +
          "/api/curator/job/artifacts/report?" +
          new URLSearchParams({ token: bundleJobToken }).toString(),
        {
          method: "GET",
          credentials: credentialsValue,
        }
      )
        .then((response) => {
          if (!response.ok) {
            // 503 is expected while job is still running
            if (response.status !== 503) {
              setBundleJobRunning(false);
              setBundleJobToken(null);
              clearInterval(interval);
              response.text().then((text) =>
                errorMessageHandler?.pushMessage({
                  id: `bundle-report-bad-response-${record?.id}`,
                  text: `${t(
                    "Abfrage des Reports zum Bauen eines Archivs von Job-Artefakten fehlgeschlagen"
                  )}: ${text}`,
                })
              );
            }
            return; // error or not ready yet
          }
          clearInterval(interval);
          response.json().then((json) => {
            if (json?.data?.bundle?.id) setDownloadId(json.data.bundle.id);
            setBundleJobRunning(false);
            setBundleJobToken(null);
            if (json?.data?.success ?? false) return;
            for (const msg of json?.log?.ERROR ?? []) {
              errorMessageHandler?.pushMessage({
                id: `bundling-job-not-successful-${record?.id}-${msg.datetime}`,
                text: `${t(
                  "Fehler beim Bauen eines Archivs von Job-Artefakten"
                )}: ${msg.body}`,
              });
            }
          });
        })
        .catch((error) => {
          setBundleJobRunning(false);
          setBundleJobToken(null);
          clearInterval(interval);
          errorMessageHandler?.pushMessage({
            id: `bundle-report-error-${record?.id}`,
            text: `${t(
              "Abfrage des Reports zum Bauen eines Archivs von Job-Artefakten fehlgeschlagen"
            )}: ${error.message}`,
          });
        });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [bundleJobToken]);

  return (
    <Modal show={show} width="xl" height="md" onClose={onClose} dismissible>
      <Modal.Header title={t("Dateien herunterladen")} />
      <Modal.Body>
        <div className="h-full w-full flex flex-col">
          <MessageBox
            className="mt-2 mb-5"
            messages={errorMessageHandler.messages}
            messageTitle={t("Ein Fehler ist aufgetreten:")}
            onDismiss={errorMessageHandler.clearMessages}
          />
          <div className="flex justify-center my-5">
            {bundleJobRunning ? (
              <Spinner size="xl" />
            ) : downloadId ? (
              <Button
                onClick={() => {
                  window.open(
                    host +
                      "/api/curator/job/artifacts/bundle?" +
                      new URLSearchParams({
                        id: downloadId,
                      }).toString(),
                    "_blank"
                  );
                }}
              >
                {t("Download starten")}
              </Button>
            ) : (
              <span className="text-gray-500">
                {t("Download fehlgeschlagen. Bitte versuchen Sie es erneut.")}
              </span>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="w-full flex flex-row justify-between">
          <div />
          <Button onClick={onClose}>
            {bundleJobRunning ? t("Abbrechen") : t("Schließen")}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
