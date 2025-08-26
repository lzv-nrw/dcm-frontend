import { createContext, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button, Spinner } from "flowbite-react";

import t from "../../../utils/translation";
import { applyReportToMessageHandler } from "../../../utils/forms";
import useGlobalStore from "../../../store";
import { credentialsValue, host, devMode } from "../../../App";
import SectionedForm from "../../../components/SectionedForm";
import Modal from "../../../components/Modal";
import MessageBox, {
  MessageHandler,
  useMessageHandler,
} from "../../../components/MessageBox";
import WorkspaceForm from "./WorkspaceForm";
import TemplateForm from "./TemplateForm";
import { useFormStore } from "./store";
import { DescriptionForm } from "./DescriptionForm";
import {
  EmptyDataSelectionForm,
  HotfolderDataSelectionForm,
  OaiDataSelectionForm,
} from "./DataSelectionForm";
import { DataProcessingForm } from "./DataProcessingForm";
import { SchedulingForm } from "./SchedulingForm";
import { SummaryForm } from "./SummaryForm";
import { ConfigStatus } from "../../../types";

export const ErrorMessageContext = createContext<MessageHandler | undefined>(
  undefined
);

interface CUModalProps {
  show: boolean;
  onClose?: () => void;
  tab?: number;
  editing?: boolean;
}

export default function CUModal({
  show,
  onClose,
  tab: tab0 = 0,
}: CUModalProps) {
  const [tab, setTab] = useState(tab0);
  const jobConfigs = useGlobalStore((state) => state.job.jobConfigs);
  const fetchJobConfigIds = useGlobalStore((state) => state.job.fetchList);

  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );
  const formatToConfig = useFormStore((state) => state.formatToConfig);
  const [workspace, setWorkspace] = useFormStore(
    useShallow((state) => [state.workspace, state.setWorkspace])
  );
  const [template, setTemplate] = useFormStore(
    useShallow((state) => [state.template, state.setTemplate])
  );
  const jobId = useFormStore((state) => state.id);
  const jobConfigStatus = useFormStore((state) => state.status);

  const errorMessageHandler = useMessageHandler([]);
  const [sendingDraft, setSendingDraft] = useState(false);
  const [sendingConfig, setSendingConfig] = useState(false);

  // reset form on hide
  useEffect(() => {
    errorMessageHandler.clearMessages();
    setSendingDraft(false);
    setSendingConfig(false);
    setTab(tab0);
    if (!show) useFormStore.setState(useFormStore.getInitialState(), true);
    // eslint-disable-next-line
  }, [show, tab0]);

  // perform validation if existing configuration has been loaded
  useEffect(() => {
    if (!jobId) return;
    setCurrentValidationReport(validator.validate(true) || {});
    // eslint-disable-next-line
  }, [jobId]);

  /**
   * Submits form to API.
   * @param status form status identifier
   * @returns fetch-promise
   */
  async function submitForm(status: ConfigStatus) {
    if (template !== undefined) {
      fetch(host + "/api/curator/job-config", {
        method: jobId === undefined ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: credentialsValue,
        body: JSON.stringify({
          ...jobConfigs[jobId ?? ""],
          ...formatToConfig(status, template),
        }),
      })
        .then((response) => {
          if (status === "draft") setSendingDraft(false);
          if (status === "ok") setSendingConfig(false);
          if (!response.ok) {
            response.text().then((text) =>
              errorMessageHandler.pushMessage({
                id: "failed-submit-not-ok",
                text: `${t(
                  `Absenden der Konfiguration nicht erfolgreich`
                )}: ${text}`,
              })
            );
            return;
          }
          fetchJobConfigIds({ replace: true });
          onClose?.();
        })
        .catch((error) => {
          if (status === "draft") setSendingDraft(false);
          if (status === "ok") setSendingConfig(false);
          console.error(error);
          errorMessageHandler.pushMessage({
            id: "failed-submit-error",
            text: `${t(`Fehler beim Absenden der Konfiguration`)}: ${
              error.message
            }`,
          });
        });
    }
  }
  return (
    <Modal show={show} width="5xl" height="2xl" onClose={onClose} dismissible>
      <Modal.Header
        title={
          !jobId
            ? t("Neuen Job anlegen")
            : jobConfigStatus === "draft"
            ? t("Job-Entwurf bearbeiten")
            : t("Job bearbeiten")
        }
        className="h-32"
      >
        <div className="max-w-full mt-4 flex items-center justify-start gap-2">
          <span
            className={`${
              template ? "max-w-[50%]" : "max-w-[100%]"
            } text-sm dcm-clamp-text`}
          >
            {workspace ? workspace.name : null}
          </span>
          {template ? (
            <>
              <span className="text-sm">-</span>
              <span className="max-w-[50%] text-sm dcm-clamp-text">
                {template.name}
              </span>
            </>
          ) : null}
        </div>
      </Modal.Header>
      <Modal.Body>
        <ErrorMessageContext.Provider value={errorMessageHandler}>
          <MessageBox
            className="my-1"
            messages={errorMessageHandler.messages}
            messageTitle={t("Ein Fehler ist aufgetreten:")}
            onDismiss={errorMessageHandler.clearMessages}
          />
          {tab === 0 ? (
            <WorkspaceForm onSelect={(w) => setWorkspace(w, true)} />
          ) : null}
          {workspace && tab === 1 ? (
            <TemplateForm
              workspace={workspace}
              onSelect={(t) => setTemplate(t, true)}
            />
          ) : null}
          {tab >= 2 ? (
            <SectionedForm
              sections={[
                {
                  tab: 2,
                  name: t("Beschreibung"),
                  Component: DescriptionForm,
                  ok: validator.children?.description?.report?.ok,
                },
                {
                  tab: 3,
                  name: t("Datenauswahl"),
                  Component: (() => {
                    switch (template?.type) {
                      case "oai":
                        return OaiDataSelectionForm;
                      case "hotfolder":
                        return HotfolderDataSelectionForm;
                      default:
                        return EmptyDataSelectionForm;
                    }
                  })(),
                  ok: template?.type
                    ? validator.children?.dataSelection?.report?.ok
                    : undefined,
                },
                {
                  tab: 4,
                  name: t("Datenaufbereitung"),
                  Component: DataProcessingForm,
                  ok: validator.children.dataProcessing?.report?.ok,
                },
                {
                  tab: 5,
                  name: t("Zeitplan"),
                  Component: SchedulingForm,
                  ok: validator.children?.scheduling?.report?.ok,
                },
                {
                  tab: 6,
                  name: t("Zusammenfassung"),
                  Component: SummaryForm,
                  showIcon: false,
                },
              ]}
              tab={tab}
              setTab={setTab}
              sidebarWidth="w-48"
            />
          ) : null}
        </ErrorMessageContext.Provider>
      </Modal.Body>
      <Modal.Footer>
        <div className="w-full flex flex-row justify-between">
          <div className="flex space-x-2">
            <Button onClick={onClose}>{t("Abbrechen")}</Button>
            {(devMode || jobConfigStatus === "draft") && tab >= 2 ? (
              // TODO enable and implement the action when backend support is available
              <Button
                disabled={sendingDraft}
                onClick={() => {
                  if (template === undefined) {
                    alert(
                      t(
                        "Etwas ist schief gelaufen, die Template Konfiguration fehlt."
                      )
                    );
                    return;
                  }
                  errorMessageHandler.clearMessages();
                  setSendingDraft(true);
                  submitForm("draft");
                }}
              >
                {sendingDraft ? <Spinner size="sm" /> : t("Entwurf speichern")}
              </Button>
            ) : null}
          </div>
          <div className="flex space-x-2">
            {jobConfigStatus === "draft" && tab > 2 && (
              <Button onClick={() => setTab((tab) => Math.max(2, tab - 1))}>
                {t("Zurück")}
              </Button>
            )}
            {tab >= 0 &&
              tab < 2 && ( // pre-draft
                <Button
                  disabled={
                    (tab === 0 && !workspace) || (tab === 1 && !template)
                  }
                  onClick={() => setTab((tab) => tab + 1)}
                >
                  {t("Weiter")}
                </Button>
              )}
            {jobConfigStatus === "draft" &&
              tab >= 2 &&
              tab < 6 && ( // draft
                <Button onClick={() => setTab((tab) => Math.min(6, tab + 1))}>
                  {t("Weiter")}
                </Button>
              )}
            {(jobConfigStatus === "ok" || tab === 6) && (
              <Button
                disabled={sendingConfig}
                onClick={() => {
                  if (template === undefined) {
                    alert(
                      t(
                        "Etwas ist schief gelaufen, die Template Konfiguration fehlt."
                      )
                    );
                    return;
                  }
                  const report = validator.validate(true) || {};
                  setCurrentValidationReport(report);
                  errorMessageHandler.clearMessages();
                  if (!report.ok) {
                    applyReportToMessageHandler(report, errorMessageHandler);
                    return;
                  }
                  setSendingConfig(true);
                  submitForm("ok");
                }}
              >
                {sendingConfig ? (
                  <Spinner size="sm" />
                ) : (
                  t(
                    jobConfigStatus === "draft"
                      ? "Job anlegen"
                      : "Änderungen übernehmen"
                  )
                )}
              </Button>
            )}
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
