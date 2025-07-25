import { useEffect, useState } from "react";
import { create } from "zustand";
import { Alert, Button, Spinner } from "flowbite-react";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import { credentialsValue, host } from "../../App";
import Modal from "../../components/Modal";
import SectionedForm from "../../components/SectionedForm";
import * as NewTemplateFormSections from "./NewTemplateFormSections";

export interface NewTemplateFormData {
  description?: NewTemplateFormSections.Description;
  source?: NewTemplateFormSections.Source;
  target?: NewTemplateFormSections.Target;
}

export interface NewJobConfigFormStore extends NewTemplateFormData {
  setDescription: (description: NewTemplateFormSections.Description) => void;
  setSource: (source: NewTemplateFormSections.Source) => void;
  setTarget: (target: NewTemplateFormSections.Target) => void;
}

export const useNewTemplateFormStore = create<NewJobConfigFormStore>()(
  (set) => ({
    setDescription: (description) => set({ description }),
    setSource: (source) => set({ source }),
    setTarget: (target) => set({ target }),
  })
);

interface NewTemplateModalProps {
  show: boolean;
  onClose?: () => void;
}

export default function NewTemplateModal({
  show,
  onClose,
}: NewTemplateModalProps) {
  const [tab, setTab] = useState(0);
  const fetchTemplateList = useGlobalStore((state) => state.template.fetchList);
  const formStore = useNewTemplateFormStore();

  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [descriptionOk, setDescriptionOk] = useState<boolean | null>(null);
  const type = useNewTemplateFormStore((state) => state.source?.type);
  const [sourceOk, setSourceOk] = useState<boolean | null>(null);
  const [targetOk, setTargetOk] = useState<boolean | null>(null);

  // reset form on show/hide
  useEffect(() => {
    setError(null);
    setSending(false);
    setTab(0);
    setDescriptionOk(null);
    setSourceOk(null);
    setTargetOk(null);
    useNewTemplateFormStore.setState(
      useNewTemplateFormStore.getInitialState(),
      true
    );
  }, [show]);

  /**
   * Helper to find appropriate form section.
   * @param type source type identifier
   * @returns form section depending on type
   */
  function getSourceForm(type: "plugin" | "hotfolder" | "oai" | undefined) {
    switch (type) {
      case undefined:
        return NewTemplateFormSections.EmptySourceForm;
      case "plugin":
        return NewTemplateFormSections.PluginSourceForm;
      case "hotfolder":
        return NewTemplateFormSections.HotfolderSourceForm;
      case "oai":
        return NewTemplateFormSections.OAISourceForm;
      default:
        throw Error(
          `Unknown source type '${type}' while selecting form in NewTemplate-modal.`
        );
    }
  }

  return (
    <Modal show={show} size="4xl" onClose={onClose} dismissible={true}>
      <Modal.Header>{t("Neues Template")}</Modal.Header>
      <Modal.Body>
        <div className="min-h-96 overflow-y-auto">
          <SectionedForm
            sections={[
              {
                tab: 0,
                name: t("Beschreibung"),
                Component: NewTemplateFormSections.DescriptionForm,
                ok: descriptionOk,
                setOk: setDescriptionOk,
              },
              {
                tab: 1,
                name: t("Quellsystem"),
                Component: getSourceForm(type),
                ok: sourceOk,
                setOk: setSourceOk,
              },
              {
                tab: 2,
                name: t("Zielsystem"),
                Component: NewTemplateFormSections.TargetForm,
                ok: targetOk,
                setOk: setTargetOk,
              },
            ]}
            tab={tab}
            setTab={setTab}
            sidebarWidth="w-36"
          />
        </div>
        {error ? (
          <Alert color="failure" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null}
        <div className="space-y-2">
          <div className="pt-2 flex flex-row justify-between">
            <div className="flex space-x-2">
              <Button onClick={onClose}>{t("Abbrechen")}</Button>
              <Button
                disabled={true}
                onClick={() => {
                  // TODO
                  onClose?.();
                }}
              >
                {t("Entwurf speichern")}
              </Button>
            </div>
            <div className="flex space-x-2">
              {tab > 0 && (
                <Button onClick={() => setTab((tab) => Math.max(0, tab - 1))}>
                  {t("Zurück")}
                </Button>
              )}
              {tab >= 0 &&
                tab < 2 && ( // draft
                  <Button onClick={() => setTab((tab) => Math.min(2, tab + 1))}>
                    {t("Weiter")}
                  </Button>
                )}
              {tab >= 2 && (
                <Button
                  onClick={() => {
                    let valid = true;
                    [
                      { ok: descriptionOk, setOk: setDescriptionOk },
                      { ok: sourceOk, setOk: setSourceOk },
                      { ok: targetOk, setOk: setTargetOk },
                    ].forEach(({ ok, setOk }) => {
                      if (!ok) {
                        setOk?.(false);
                        valid = false;
                        setError(
                          t("Bitte füllen Sie alle erforderlichen Felder aus.")
                        );
                      }
                    });
                    if (!valid) return;
                    setError(null);
                    setSending(true);
                    fetch(host + "/api/admin/template", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      credentials: credentialsValue,
                      body: JSON.stringify({
                        status: "ok",
                        ...formStore.description,
                        // TODO: add targetId to template-object
                        //...formStore.target,
                        type: formStore.source?.type,
                        additionalInformation:
                          formStore.source?.additionalInformation,
                      }),
                    })
                      .then((response) => {
                        setSending(false);
                        if (!response.ok) {
                          throw new Error(
                            `Unexpected response (${response.statusText}).`
                          );
                        }
                        fetchTemplateList({});
                        onClose?.();
                        return;
                      })
                      .catch((error) => {
                        setSending(false);
                        setError(
                          t("Fehler beim Senden") + ": " + error?.toString()
                        );
                      });
                  }}
                >
                  {sending ? <Spinner /> : t("Erstellen")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}
