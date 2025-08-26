import { createContext, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button, Spinner } from "flowbite-react";
import { FiAlertCircle } from "react-icons/fi";

import t from "../../../utils/translation";
import { applyReportToMessageHandler } from "../../../utils/forms";
import useGlobalStore from "../../../store";
import { credentialsValue, devMode, host } from "../../../App";
import Modal from "../../../components/Modal";
import SectionedForm from "../../../components/SectionedForm";
import MessageBox, {
  MessageHandler,
  useMessageHandler,
} from "../../../components/MessageBox";
import { useFormStore } from "./store";
import DescriptionForm from "./DescriptionForm";
import SourceForm from "./SourceForm";
import TargetForm from "./TargetForm";
import { ConfigStatus } from "../../../types";

export const ErrorMessageContext = createContext<MessageHandler | undefined>(
  undefined
);

interface CUModalProps {
  show: boolean;
  onClose?: () => void;
}

export default function CUModal({ show, onClose }: CUModalProps) {
  const [tab, setTab] = useState(0);
  const templates = useGlobalStore((state) => state.template.templates);
  const fetchTemplateList = useGlobalStore((state) => state.template.fetchList);

  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );
  const formStore = useFormStore();

  const errorMessageHandler = useMessageHandler([]);
  const [sendingDraft, setSendingDraft] = useState(false);
  const [sendingConfig, setSendingConfig] = useState(false);

  // reset form on hide
  useEffect(() => {
    errorMessageHandler.clearMessages();
    setSendingDraft(false);
    setSendingConfig(false);
    setTab(0);
    if (!show) useFormStore.setState(useFormStore.getInitialState(), true);
    // eslint-disable-next-line
  }, [show]);

  // perform validation if existing configuration has been loaded
  useEffect(() => {
    if (!formStore.id) return;
    setCurrentValidationReport(validator.validate(true) || {});
    // eslint-disable-next-line
  }, [formStore.id]);

  /**
   * Submits form to API.
   * @param status form status identifier
   * @returns fetch-promise
   */
  async function submitForm(status: ConfigStatus) {
    return fetch(host + "/api/admin/template", {
      method: formStore.id === undefined ? "POST" : "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: credentialsValue,
      body: JSON.stringify({
        ...templates[formStore.id ?? ""],
        ...formStore.formatToConfig(status),
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
        fetchTemplateList({});
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

  return (
    <Modal show={show} width="5xl" height="2xl" onClose={onClose} dismissible>
      <Modal.Header
        title={
          !formStore.id
            ? t("Neues Template erstellen")
            : formStore.status === "draft"
            ? t("Template-Entwurf bearbeiten")
            : t("Template bearbeiten")
        }
      >
        {(formStore.linkedJobs ?? 0) > 0 ? (
          <div className="flex flex-row space-x-2 items-center text-lg">
            <FiAlertCircle />
            <span>
              {t(
                "In mit Jobs verknüpften Templates können nicht mehr alle Felder geändert werden."
              )}
            </span>
          </div>
        ) : null}
      </Modal.Header>
      <Modal.Body>
        <ErrorMessageContext.Provider value={errorMessageHandler}>
          <MessageBox
            className="my-1"
            messages={errorMessageHandler.messages}
            messageTitle={t("Ein Fehler ist aufgetreten:")}
            onDismiss={errorMessageHandler.clearMessages}
          />
          <SectionedForm
            sections={[
              {
                tab: 0,
                name: t("Beschreibung"),
                Component: DescriptionForm,
                ok: validator.children.description?.report?.ok,
              },
              {
                tab: 1,
                name: t("Quellsystem"),
                Component: SourceForm,
                ok: validator.children.source?.report?.ok,
              },
              {
                tab: 2,
                name: t("Zielsystem"),
                Component: TargetForm,
                ok: validator.children.target?.report?.ok,
              },
            ]}
            tab={tab}
            setTab={setTab}
            sidebarWidth="w-36"
          />
        </ErrorMessageContext.Provider>
      </Modal.Body>
      <Modal.Footer>
        <div className="w-full flex flex-row justify-between">
          <div className="flex space-x-2">
            <Button onClick={onClose}>{t("Abbrechen")}</Button>
            {(devMode || formStore.status === "draft") && (
              <Button
                disabled={sendingDraft}
                onClick={() => {
                  errorMessageHandler.clearMessages();
                  setSendingDraft(true);
                  submitForm("draft");
                }}
              >
                {sendingDraft ? <Spinner size="sm" /> : t("Entwurf speichern")}
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            {formStore.status === "draft" && tab > 0 && (
              <Button onClick={() => setTab((tab) => Math.max(0, tab - 1))}>
                {t("Zurück")}
              </Button>
            )}
            {formStore.status === "draft" && tab >= 0 && tab < 2 && (
              <Button onClick={() => setTab((tab) => Math.min(2, tab + 1))}>
                {t("Weiter")}
              </Button>
            )}
            {(formStore.status === "ok" || tab >= 2) && (
              <Button
                disabled={sendingConfig}
                onClick={() => {
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
                    formStore.status === "draft"
                      ? "Erstellen"
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
