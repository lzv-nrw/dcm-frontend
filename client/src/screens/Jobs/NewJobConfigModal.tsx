import { useEffect, useState } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { Button, Alert, Spinner } from "flowbite-react";

import t from "../../utils/translation";
import { formatDateToISOString } from "../../utils/dateTime";
import { JobConfig, JobConfigStatus, Template, Workspace } from "../../types";
import useGlobalStore from "../../store";
import { credentialsValue, host } from "../../App";
import SectionedForm from "../../components/SectionedForm";
import Modal from "../../components/Modal";
import { operationTypeOrder } from "../../components/OperationsForm/types";
import NewJobConfigWorkspaceSelect from "./NewJobConfigWorkspaceSelect";
import NewJobConfigTemplateSelect from "./NewJobConfigTemplateSelect";
import * as NewJobConfigFormSections from "./NewJobConfigFormSections";

export interface NewJobConfigFormData {
  id?: string;
  status?: JobConfigStatus;
  workspace?: Workspace;
  template?: Template;
  description?: NewJobConfigFormSections.Description;
  dataSelection?:
    | NewJobConfigFormSections.OaiDataSelection
    | NewJobConfigFormSections.HotfolderDataSelection;
  dataProcessing?: NewJobConfigFormSections.DataProcessing;
  scheduling?: NewJobConfigFormSections.Scheduling;
}

export interface NewJobConfigFormStore extends NewJobConfigFormData {
  setId: (id?: string) => void;
  setStatus: (status?: JobConfigStatus) => void;
  setWorkspace: (workspace: Workspace, replace?: boolean) => void;
  setTemplate: (template: Template, replace?: boolean) => void;
  setDescription: (
    description: NewJobConfigFormSections.Description,
    replace?: boolean
  ) => void;
  setDataSelection: (
    dataSelection:
      | NewJobConfigFormSections.OaiDataSelection
      | NewJobConfigFormSections.HotfolderDataSelection,
    replace?: boolean
  ) => void;
  setDataProcessing: (
    dataProcessing: NewJobConfigFormSections.DataProcessing,
    replace?: boolean
  ) => void;
  setScheduling: (
    scheduling: NewJobConfigFormSections.Scheduling,
    replace?: boolean
  ) => void;
  initFromConfig: (
    config: JobConfig,
    template: Template,
    workspace: Workspace
  ) => void;
  formatToConfig: (
    status: JobConfigStatus,
    template: Template
  ) => // this changes the JobConfig.id (occurring in drafts) to optional
  Omit<JobConfig, "id"> & { id?: string };
}

export const useNewJobConfigFormStore = create<NewJobConfigFormStore>()(
  (set, get) => ({
    setId: (id) => set({ id }),
    setStatus: (status) => set({ status }),
    setWorkspace: (workspace, replace = false) =>
      replace
        ? set({ workspace })
        : set({ workspace: { ...get().workspace, ...workspace } }),
    setTemplate: (template, replace = false) =>
      replace
        ? set({ template })
        : set({ template: { ...get().template, ...template } }),
    setDescription: (description, replace = false) =>
      replace
        ? set({ description })
        : set({ description: { ...get().description, ...description } }),
    setDataSelection: (dataSelection, replace = false) =>
      replace
        ? set({ dataSelection })
        : set({ dataSelection: { ...get().dataSelection, ...dataSelection } }),
    setDataProcessing: (dataProcessing, replace = false) =>
      replace
        ? set({ dataProcessing })
        : set({
            dataProcessing: { ...get().dataProcessing, ...dataProcessing },
          }),
    setScheduling: (scheduling, replace = false) =>
      replace
        ? set({ scheduling })
        : set({ scheduling: { ...get().scheduling, ...scheduling } }),
    initFromConfig: (config, template, workspace) => {
      const store = get();
      store.setId(config.id);
      store.setStatus(config.status);
      store.setWorkspace(workspace, true);
      store.setTemplate(template, true);
      store.setDescription(
        {
          name: config.name,
          description: config.description,
          contactInfo: config.contactInfo,
        },
        true
      );
      // -------   dataSelection   -------
      switch (template.type) {
        case "hotfolder":
          store.setDataSelection(
            { subdirectory: config.dataSelection?.path },
            true
          );
          break;
        case "oai":
          store.setDataSelection(
            {
              identifiers: config.dataSelection?.identifiers,
              sets: config.dataSelection?.sets,
              from: config.dataSelection?.from
                ? new Date(config.dataSelection.from)
                : undefined,
              until: config.dataSelection?.until
                ? new Date(config.dataSelection.until)
                : undefined,
            },
            true
          );
          break;
        default: // case "plugin":
        // nothing to do
      }
      // -------   dataProcessing   -------
      let mapping;
      if (["python", "xslt"].includes(config.dataProcessing?.mapping?.type))
        mapping = {
          type: config.dataProcessing?.mapping?.type,
          fileContents: config.dataProcessing.mapping.data?.contents,
          fileName: config.dataProcessing.mapping.data?.name,
          datetimeUploaded: config.dataProcessing.mapping.data?.datetimeUploaded,
        };
      store.setDataProcessing(
        {
          mapping: mapping,
          rightsOperations:
            config.dataProcessing?.preparation?.rightsOperations,
          sigPropOperations:
            config.dataProcessing?.preparation?.sigPropOperations,
          preservationOperations:
            config.dataProcessing?.preparation?.preservationOperations,
        },
        true
      );
      // -------   schedule   -------
      if (config.schedule?.active) {
        if (config.schedule.start === undefined) {
          console.error("Missing start date. Falling back to no-scheduling.");
          store.setScheduling(
            {
              schedule: undefined,
              start: undefined,
            },
            true
          );
        } else {
          if (config.schedule.repeat === undefined)
            store.setScheduling(
              {
                schedule: "onetime",
                start: new Date(config.schedule.start),
              },
              true
            );
          else {
            if (config.schedule.repeat.interval !== 1) {
              console.error(
                `Unsupported scheduling-interval '${config.schedule.repeat.interval}'.`
              );
            }
            store.setScheduling(
              {
                schedule: config.schedule.repeat.unit,
                start: new Date(config.schedule.start),
              },
              true
            );
          }
        }
      }
    },
    formatToConfig: (status, template) => {
      const store = get();
      // -------   dataSelection   -------
      let dataSelection;
      switch (template.type) {
        case "hotfolder":
          dataSelection = {
            path: (
              store.dataSelection as NewJobConfigFormSections.HotfolderDataSelection
            ).subdirectory,
          };
          break;
        case "oai":
          dataSelection = {
            identifiers: (
              store.dataSelection as NewJobConfigFormSections.OaiDataSelection
            ).identifiers,
            sets: (
              store.dataSelection as NewJobConfigFormSections.OaiDataSelection
            ).sets,
            from:
              (store.dataSelection as NewJobConfigFormSections.OaiDataSelection)
                .from !== undefined
                ? formatDateToISOString(
                    (
                      store.dataSelection as NewJobConfigFormSections.OaiDataSelection
                    ).from as Date
                  ).split("T")[0]
                : undefined,
            until: (
              store.dataSelection as NewJobConfigFormSections.OaiDataSelection
            ).until
              ? formatDateToISOString(
                  (
                    store.dataSelection as NewJobConfigFormSections.OaiDataSelection
                  ).until as Date
                ).split("T")[0]
              : undefined,
          };
          break;
        default: // case "plugin":
          dataSelection = undefined;
      }
      // -------   dataProcessing   -------
      let mapping;
      if (
        // currently, settings mapping-plugin is not supported here
        // to prevent unexpected behavior, any existing plugin-configration
        // (currently only occurring in demo-data) is deleted
        store.dataProcessing?.mapping?.type === undefined ||
        store.dataProcessing.mapping.type === "plugin"
      ) mapping = undefined;
      else {
        mapping = {
          type: store.dataProcessing.mapping.type,
          data: {
            contents: store.dataProcessing.mapping.fileContents,
            name: store.dataProcessing.mapping.fileName,
            datetimeUploaded: store.dataProcessing.mapping.datetimeUploaded,
          },
        };
      }
      // -------   schedule   -------
      let schedule;
      if (store.scheduling?.start !== undefined) {
        if (store.scheduling?.schedule === undefined) {
          console.error(
            "Missing schedule type. Falling back to 'onetime'-schedule."
          );
        }
        schedule = {
          active: true,
          start: formatDateToISOString(store.scheduling.start),
          ...((store.scheduling?.schedule ?? "onetime") === "onetime"
            ? {}
            : { repeat: { unit: store.scheduling.schedule, interval: 1 } }),
        };
      } else {
        schedule = { active: false };
      }

      return {
        id: store.id,
        status,
        templateId: template.id,
        name: store.description?.name,
        description: store.description?.description,
        contactInfo: store.description?.contactInfo,
        dataSelection,
        dataProcessing: {
          mapping,
          preparation: {
            rightsOperations:
              store.dataProcessing?.rightsOperations?.sort(
                (a, b) =>
                  operationTypeOrder.indexOf(a.type) -
                  operationTypeOrder.indexOf(b.type)
              ) ?? [],
            sigPropOperations:
              store.dataProcessing?.sigPropOperations?.sort(
                (a, b) =>
                  operationTypeOrder.indexOf(a.type) -
                  operationTypeOrder.indexOf(b.type)
              ) ?? [],
            preservationOperations:
              store.dataProcessing?.preservationOperations?.sort(
                (a, b) =>
                  operationTypeOrder.indexOf(a.type) -
                  operationTypeOrder.indexOf(b.type)
              ) ?? [],
          },
        },
        schedule,
      };
    },
  })
);

interface NewJobConfigModalProps {
  show: boolean;
  onClose?: () => void;
  tab?: number;
  editing?: boolean;
}

export default function NewJobConfigModal({
  show,
  onClose,
  tab: tab0 = 0,
}: NewJobConfigModalProps) {
  const [tab, setTab] = useState(tab0);
  const [descriptionOk, setDescriptionOk] = useState<boolean | null>(null);
  const [dataSelectionOk, setDataSelectionOk] = useState<boolean | null>(null);
  const [dataProcessingOk, setDataProcessingOk] = useState<boolean | null>(
    null
  );
  const [schedulingOk, setSchedulingOk] = useState<boolean | null>(null);

  const formatToConfig = useNewJobConfigFormStore(
    (state) => state.formatToConfig
  );
  const [workspace, setWorkspace] = useNewJobConfigFormStore(
    useShallow((state) => [state.workspace, state.setWorkspace])
  );
  const [template, setTemplate] = useNewJobConfigFormStore(
    useShallow((state) => [state.template, state.setTemplate])
  );
  const jobConfigStatus = useNewJobConfigFormStore((state) => state.status);
  const fetchJobConfigIds = useGlobalStore((state) => state.job.fetchList);

  const [error, setError] = useState<string | null>(null);
  const [sendingDraft, setSendingDraft] = useState(false);
  const [sendingConfig, setSendingConfig] = useState(false);

  // reset form on hide
  useEffect(() => {
    setError(null);
    setTab(tab0);
    if (!show)
      useNewJobConfigFormStore.setState(
        useNewJobConfigFormStore.getInitialState(),
        true
      );
  }, [show, tab0]);

  return (
    <Modal show={show} size="5xl" onClose={onClose} dismissible={true}>
      <Modal.Header className="max-w-full">
        <div className="max-w-full flex flex-col space-y-2">
          <p className="font-bold">
            {!jobConfigStatus
              ? t("Neuen Job anlegen")
              : jobConfigStatus === "draft"
              ? t("Job-Entwurf bearbeiten")
              : t("Job bearbeiten")}
          </p>
          <div className="max-w-full flex items-center justify-start gap-2">
            <p
              className={`${
                template ? "max-w-[50%]" : "max-w-full"
              } w-fit text-sm dcm-clamp-text`}
            >
              {workspace ? workspace.name : null}
            </p>
            {template ? (
              <>
                <span className="px-2">-</span>
                <p className="max-w-[50%] w-fit text-sm dcm-clamp-text">
                  {template.name}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </Modal.Header>
      <Modal.Body>
        {error ? (
          <Alert onDismiss={() => setError(null)} color="failure">
            {error}
          </Alert>
        ) : null}
        <div>
          {tab === 0 ? (
            <NewJobConfigWorkspaceSelect
              onSelect={(w) => setWorkspace(w, true)}
            />
          ) : null}
          {workspace && tab === 1 ? (
            <NewJobConfigTemplateSelect
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
                  Component: NewJobConfigFormSections.DescriptionForm,
                  ok: descriptionOk,
                  setOk: setDescriptionOk,
                },
                {
                  tab: 3,
                  name: t("Datenauswahl"),
                  Component: (() => {
                    switch (template?.type) {
                      case "oai":
                        return NewJobConfigFormSections.OaiDataSelectionForm;
                      case "hotfolder":
                        return NewJobConfigFormSections.HotfolderDataSelectionForm;
                      default:
                        return NewJobConfigFormSections.EmptyDataSelectionForm;
                    }
                  })(),
                  ok: template?.type ? dataSelectionOk : undefined,
                  setOk: template?.type ? setDataSelectionOk : undefined,
                },
                {
                  tab: 4,
                  name: t("Datenaufbereitung"),
                  Component: NewJobConfigFormSections.DataProcessingForm,
                  ok: dataProcessingOk,
                  setOk: setDataProcessingOk,
                },
                {
                  tab: 5,
                  name: t("Zeitplan"),
                  Component: NewJobConfigFormSections.SchedulingForm,
                  ok: schedulingOk,
                  setOk: setSchedulingOk,
                },
                {
                  tab: 6,
                  name: t("Zusammenfassung"),
                  Component: NewJobConfigFormSections.Summary,
                },
              ]}
              tab={tab}
              setTab={setTab}
              sidebarWidth="w-44"
            />
          ) : null}
        </div>
        <div className="space-y-2">
          <div className="pt-2 flex flex-row justify-between">
            <div className="flex space-x-2">
              <Button onClick={onClose}>{t("Abbrechen")}</Button>
              {tab >= 2 ? (
                // TODO enable and implement the action when backend support is available
                <Button
                  onClick={() => {
                    if (template === undefined) {
                      alert(
                        t(
                          "Etwas ist schief gelaufen, die Template Konfiguration fehlt."
                        )
                      );
                      return;
                    }
                    const formData = formatToConfig("draft", template);
                    setSendingDraft(true);
                    fetch(host + "/api/curator/job-config", {
                      method: formData.id === undefined ? "POST" : "PUT",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      credentials: credentialsValue,
                      body: JSON.stringify(formData),
                    })
                      .then((response) => {
                        setSendingDraft(false);
                        if (response.ok) {
                          fetchJobConfigIds({});
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
                        setSendingDraft(false);
                        console.error(error);
                        setError(
                          t("Fehler beim Senden") + ": " + error?.toString()
                        );
                      });
                  }}
                >
                  {sendingDraft ? (
                    <Spinner size="sm" />
                  ) : (
                    t("Entwurf speichern")
                  )}
                </Button>
              ) : null}
            </div>
            <div className="flex space-x-2">
              {tab > 2 && (
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
              {tab >= 2 &&
                tab < 6 && ( // draft
                  <Button onClick={() => setTab((tab) => Math.min(6, tab + 1))}>
                    {t("Weiter")}
                  </Button>
                )}
              {tab === 6 && (
                <Button
                  onClick={() => {
                    if (template === undefined) {
                      alert(
                        t(
                          "Etwas ist schief gelaufen, die Template Konfiguration fehlt."
                        )
                      );
                      return;
                    }
                    const formData = formatToConfig("ok", template);
                    setSendingConfig(true);
                    fetch(host + "/api/curator/job-config", {
                      method: formData.id === undefined ? "POST" : "PUT",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      credentials: credentialsValue,
                      body: JSON.stringify(formData),
                    })
                      .then((response) => {
                        setSendingConfig(false);
                        if (response.ok) {
                          fetchJobConfigIds({});
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
                        setSendingConfig(false);
                        console.error(error);
                        setError(
                          t("Fehler beim Senden") + ": " + error?.toString()
                        );
                      });
                  }}
                >
                  {sendingConfig ? (
                    <Spinner size="sm" />
                  ) : !jobConfigStatus || jobConfigStatus === "draft" ? (
                    t("Job anlegen")
                  ) : (
                    t("Änderungen übernehmen")
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}
