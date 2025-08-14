import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Alert, Button, Spinner } from "flowbite-react";
import { FiAlertCircle } from "react-icons/fi";

import t from "../../../utils/translation";
import { ValidationMessages } from "../../../utils/forms";
import useGlobalStore from "../../../store";
import { credentialsValue, devMode, host } from "../../../App";
import Modal from "../../../components/Modal";
import SectionedForm from "../../../components/SectionedForm";
import { useFormStore } from "./store";
import DescriptionForm from "./DescriptionForm";
import SourceForm from "./SourceForm";
import TargetForm from "./TargetForm";
import { ConfigStatus } from "../../../types";

interface CUModalProps {
  show: boolean;
  onClose?: () => void;
}

export default function CUModal({ show, onClose }: CUModalProps) {
  const [tab, setTab] = useState(0);
  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const fetchTemplateList = useGlobalStore((state) => state.template.fetchList);
  const formStore = useFormStore();

  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // reset form on hide
  useEffect(() => {
    setError(null);
    setSending(false);
    setTab(0);
    if (!show) useFormStore.setState(useFormStore.getInitialState(), true);
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
      body: JSON.stringify(formStore.formatToConfig(status)),
    })
      .then((response) => {
        setSending(false);
        if (response.ok) {
          fetchTemplateList({});
          onClose?.();
          return;
        }
        response
          .text()
          .then((text) => setError(t("Unerwartete Antwort") + ": " + text));
      })
      .catch((error) => {
        setSending(false);
        console.error(error);
        setError(t("Fehler beim Senden") + ": " + error?.toString());
      });
  }

  return (
    <Modal show={show} width="5xl" height="2xl" onClose={onClose} dismissible>
      <Modal.Header
        title={
          formStore.id
            ? t("Template bearbeiten")
            : t("Neues Template erstellen")
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
        {error ? (
          <Alert color="failure" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null}
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
      </Modal.Body>
      <Modal.Footer>
        <div className="w-full flex flex-row justify-between">
          <div className="flex space-x-2">
            <Button onClick={onClose}>{t("Abbrechen")}</Button>
            {(devMode || formStore.status === "draft") && (
              <Button
                onClick={() => {
                  setError(null);
                  setSending(true);
                  submitForm("draft");
                }}
              >
                {t("Entwurf speichern")}
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
                onClick={() => {
                  const report = validator.validate(true) || {};
                  setCurrentValidationReport(report);
                  if (!report.ok) {
                    setError(ValidationMessages.GenericBadForm());
                    return;
                  }
                  setError(null);
                  setSending(true);
                  submitForm("ok");
                }}
              >
                {sending ? (
                  <Spinner />
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
