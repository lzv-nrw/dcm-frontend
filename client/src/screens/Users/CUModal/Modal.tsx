import { createContext, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button, Spinner } from "flowbite-react";
import { FiAlertCircle } from "react-icons/fi";

import t from "../../../utils/translation";
import { applyReportToMessageHandler } from "../../../utils/forms";
import useGlobalStore from "../../../store";
import { credentialsValue, host } from "../../../App";
import SectionedForm from "../../../components/SectionedForm";
import Modal from "../../../components/Modal";
import MessageBox, {
  MessageHandler,
  useMessageHandler,
} from "../../../components/MessageBox";
import { useFormStore } from "./store";
import { DataForm } from "./DataForm";
import { GroupsForm } from "./GroupsForm";

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
  const users = useGlobalStore((state) => state.user.users);
  const fetchUserList = useGlobalStore((state) => state.user.fetchList);

  const [validator, setCurrentValidationReport] = useFormStore(
    useShallow((state) => [state.validator, state.setCurrentValidationReport])
  );

  const formStore = useFormStore();

  const errorMessageHandler = useMessageHandler([]);
  const [sending, setSending] = useState(false);

  // reset form on hide
  useEffect(() => {
    errorMessageHandler.clearMessages();
    setSending(false);
    setTab(tab0);
    if (!show) useFormStore.setState(useFormStore.getInitialState(), true);
    // eslint-disable-next-line
  }, [show, tab0]);

  // perform validation if existing configuration has been loaded
  useEffect(() => {
    if (!formStore.id) return;
    setCurrentValidationReport(validator.validate(true) || {});
    // eslint-disable-next-line
  }, [formStore.id]);

  return (
    <Modal show={show} width="5xl" height="2xl" onClose={onClose} dismissible>
      <Modal.Header
        title={
          formStore.id ? t("Nutzer bearbeiten") : t("Neuen Nutzer erstellen")
        }
      >
        {formStore.id ? (
          <div className="flex flex-row space-x-2 items-center text-lg">
            <FiAlertCircle />
            <span>
              {t(
                "In bestehenden Nutzerkonfigurationen können nicht mehr alle Felder geändert werden."
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
                name: t("Nutzerdaten"),
                Component: DataForm,
                ok: validator.children?.data?.report?.ok,
              },
              {
                tab: 1,
                name: t("Rechte"),
                Component: GroupsForm,
                ok: validator.children?.groups?.report?.ok,
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
                disabled={sending}
                onClick={() => {
                  const report = validator.validate(true) || {};
                  setCurrentValidationReport(report);
                  errorMessageHandler.clearMessages();
                  if (!report.ok) {
                    applyReportToMessageHandler(report, errorMessageHandler);
                    return;
                  }
                  setSending(true);
                  fetch(host + "/api/admin/user", {
                    method: formStore.id ? "PUT" : "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    credentials: credentialsValue,
                    body: JSON.stringify({
                      ...users[formStore.id ?? ""],
                      ...formStore.formatToConfig(),
                    }),
                  })
                    .then((response) => {
                      setSending(false);
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
                      fetchUserList({});
                      onClose?.();
                    })
                    .catch((error) => {
                      setSending(false);
                      console.error(error);
                      errorMessageHandler.pushMessage({
                        id: "failed-submit-error",
                        text: `${t(
                          `Fehler beim Absenden der Konfiguration`
                        )}: ${error.message}`,
                      });
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
