import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button, Alert, Spinner } from "flowbite-react";

import t from "../../../utils/translation";
import { ValidationMessages } from "../../../utils/forms";
import useGlobalStore from "../../../store";
import { credentialsValue, host } from "../../../App";
import SectionedForm from "../../../components/SectionedForm";
import Modal from "../../../components/Modal";
import { useFormStore } from "./store";
import { DataForm } from "./DataForm";
import { RightsForm } from "./RightsForm";

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
  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const fetchUserList = useGlobalStore((state) => state.user.fetchList);
  const formStore = useFormStore();

  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // reset form on hide
  useEffect(() => {
    setError(null);
    setTab(tab0);
    if (!show) useFormStore.setState(useFormStore.getInitialState(), true);
  }, [show, tab0]);

  // perform validation if existing configuration has been loaded
  useEffect(() => {
    if (!formStore.id) return;
    setCurrentValidationReport(validator.validate(true) || {});
    // eslint-disable-next-line
  }, [formStore.id]);

  return (
    <Modal show={show} width="5xl" height="xl" onClose={onClose} dismissible>
      <Modal.Header title={t("Neuen Nutzer erstellen")} />
      <Modal.Body>
        {error ? (
          <Alert onDismiss={() => setError(null)} color="failure">
            {error}
          </Alert>
        ) : null}
        <SectionedForm
          sections={[
            {
              tab: 0,
              name: t("Nutzerdaten"),
              Component: DataForm,
              ok: validator.children?.data?.report?.ok,
            },
            {
              tab: 1,
              name: t("Rechte"),
              Component: RightsForm,
              ok: validator.children?.rights?.report?.ok,
            },
          ]}
          tab={tab}
          setTab={setTab}
          sidebarWidth="w-36"
        />
      </Modal.Body>
      <Modal.Footer>
        <div className="w-full flex flex-row justify-between">
          <Button onClick={onClose}>{t("Abbrechen")}</Button>
          <div className="flex space-x-2">
            {formStore.id === undefined && tab > 0 && (
              <Button onClick={() => setTab((tab) => Math.max(0, tab - 1))}>
                {t("Zurück")}
              </Button>
            )}
            {formStore.id === undefined && tab < 1 && (
              <Button onClick={() => setTab((tab) => Math.min(1, tab + 1))}>
                {t("Weiter")}
              </Button>
            )}
            {(formStore.id !== undefined || tab === 1) && (
              <Button
                onClick={() => {
                  const report = validator.validate(true) || {};
                  setCurrentValidationReport(report);
                  if (!report.ok) {
                    setError(ValidationMessages.GenericBadForm());
                    return;
                  }
                  const formData = formStore.formatToConfig();
                  setSending(true);
                  fetch(host + "/api/admin/user", {
                    method: formStore.id ? "PUT" : "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    credentials: credentialsValue,
                    body: JSON.stringify(formData),
                  })
                    .then((response) => {
                      setSending(false);
                      if (response.ok) {
                        fetchUserList({});
                        onClose?.();
                        return;
                      }
                      response
                        .text()
                        .then((text) =>
                          setError(t("Unerwartete Antwort") + ": " + text)
                        );
                    })
                    .catch((error) => {
                      setSending(false);
                      console.error(error);
                      setError(
                        t("Fehler beim Senden") + ": " + error?.toString()
                      );
                    });
                }}
              >
                {sending ? (
                  <Spinner size="sm" />
                ) : formStore.id ? (
                  t("Änderungen übernehmen")
                ) : (
                  t("Erstellen")
                )}
              </Button>
            )}
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
