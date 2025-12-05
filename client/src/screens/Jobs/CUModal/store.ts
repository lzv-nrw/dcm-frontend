import { create } from "zustand";

import { JobConfig, ConfigStatus, Template, Workspace } from "../../../types";
import t from "../../../utils/translation";
import {
  createValidateWithChildren,
  mergeValidationReportIntoChildren,
  ValidationReportWithChildren,
  Validator,
} from "../../../utils/forms";
import {
  DataProcessing,
  DataProcessingFormChildren,
  DataProcessingFormValidator,
  validateMapping,
  validateOperations,
} from "./DataProcessingForm";
import {
  HotfolderDataSelection,
  OaiDataSelection,
  DataSelectionFormValidator,
  DataSelectionFormChildren,
  validatePath,
} from "./DataSelectionForm";
import {
  Description,
  DescriptionFormChildren,
  DescriptionFormValidator,
  validateName,
} from "./DescriptionForm";
import {
  combineDateAndTime,
  Scheduling,
  SchedulingFormChildren,
  SchedulingFormValidator,
} from "./SchedulingForm";
import { formatDateToISOString } from "../../../utils/dateTime";
import { operationTypeOrder } from "../../../components/OperationsForm/types";

export interface FormData {
  id?: string;
  status?: ConfigStatus;
  workspace?: Workspace;
  template?: Template;
  description?: Description;
  dataSelection?: OaiDataSelection | HotfolderDataSelection;
  dataProcessing?: DataProcessing;
  scheduling?: Scheduling;
}

type FormChildren =
  | "description"
  | "dataSelection"
  | "dataProcessing"
  | "scheduling";
type FormValidator = Validator<FormChildren>;

export interface FormStore extends FormData {
  validator: FormValidator;
  setCurrentValidationReport: (
    report: ValidationReportWithChildren<FormChildren>
  ) => void;
  setId: (id?: string) => void;
  setStatus: (status?: ConfigStatus) => void;
  setWorkspace: (workspace: Workspace, replace?: boolean) => void;
  setTemplate: (template: Template, replace?: boolean) => void;
  setDescription: (description: Description, replace?: boolean) => void;
  setDataSelection: (
    dataSelection: OaiDataSelection | HotfolderDataSelection,
    replace?: boolean
  ) => void;
  setDataProcessing: (
    dataProcessing: DataProcessing,
    replace?: boolean
  ) => void;
  setScheduling: (scheduling: Scheduling, replace?: boolean) => void;
  initFromConfig: (
    config: JobConfig,
    template: Template,
    workspace: Workspace
  ) => void;
  formatToConfig: (
    status: ConfigStatus,
    template: Template
  ) => // this changes the JobConfig.id (occurring in drafts) to optional
  Omit<JobConfig, "id"> & { id?: string };
}

export const useFormStore = create<FormStore>()((set, get) => ({
  validator: {
    validate: createValidateWithChildren<FormChildren>(() => get().validator),
    children: {
      description: {
        validate: createValidateWithChildren<DescriptionFormChildren>(
          () => get().validator.children?.description,
          (strict) => {
            if (strict) return { ok: true };
            return {};
          }
        ),
        children: {
          name: {
            validate: (strict: boolean) =>
              validateName(strict, get().description?.name),
          },
        },
      } as DescriptionFormValidator,
      dataSelection: {
        validate: createValidateWithChildren<DataSelectionFormChildren>(
          () => get().validator.children?.dataSelection,
          (strict) => {
            if (strict) return { ok: true };
            return {};
          }
        ),
        children: {
          path: {
            validate: (strict: boolean) => {
              if (get().template?.type !== "hotfolder") return undefined;
              return validatePath(
                strict,
                (get().dataSelection as HotfolderDataSelection)?.path
              );
            },
          },
        },
      } as DataSelectionFormValidator,
      dataProcessing: {
        validate: createValidateWithChildren<DataProcessingFormChildren>(
          () => get().validator.children?.dataProcessing,
          (strict) => {
            if (strict) return { ok: true };
            return {};
          }
        ),
        children: {
          mapping: {
            validate: (strict: boolean) => {
              if (get().template?.type === "hotfolder") return undefined;
              return validateMapping(strict, get().dataProcessing?.mapping);
            },
          },
          rightsOperations: {
            validate: (_: boolean) =>
              validateOperations(
                get().dataProcessing?.rightsOperations,
                get().dataProcessing?.rightsFieldsConfiguration || {},
                t("Rechte")
              ),
          },
          sigPropOperations: {
            validate: (_: boolean) =>
              validateOperations(
                get().dataProcessing?.sigPropOperations,
                get().dataProcessing?.sigPropFieldsConfiguration || {},
                t("Signifikante Eigenschaften")
              ),
          },
          preservationOperations: {
            validate: (_: boolean) =>
              validateOperations(
                get().dataProcessing?.preservationOperations,
                get().dataProcessing?.preservationFieldsConfiguration || {},
                t("Preservation")
              ),
          },
        },
      } as DataProcessingFormValidator,
      scheduling: {
        validate: createValidateWithChildren<SchedulingFormChildren>(
          () => get().validator.children?.scheduling,
          (strict) => {
            if (strict) return { ok: true };
            return {};
          }
        ),
      } as SchedulingFormValidator,
    },
  } as FormValidator,
  setCurrentValidationReport: (report) =>
    set({
      validator: mergeValidationReportIntoChildren(get().validator, report),
    }),
  setId: (id) => set({ id }),
  setStatus: (status) => set({ status }),
  status: "draft",
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
        store.setDataSelection({ path: config.dataSelection?.path }, true);
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
        rightsOperations: config.dataProcessing?.preparation?.rightsOperations,
        sigPropOperations:
          config.dataProcessing?.preparation?.sigPropOperations,
        preservationOperations:
          config.dataProcessing?.preparation?.preservationOperations,
      },
      true
    );
    // -------   schedule   -------
    if (config.schedule !== undefined) {
      if (config.schedule.start === undefined) {
        console.error("Missing start date. Falling back to no-scheduling.");
        store.setScheduling(
          {
            date: undefined,
            time: undefined,
            schedule: undefined,
            active: undefined,
          },
          true
        );
      } else {
        if (config.schedule.repeat === undefined)
          store.setScheduling(
            {
              date: new Date(config.schedule.start),
              time: new Date(config.schedule.start),
              schedule: "onetime",
              active: config.schedule?.active,
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
              date: new Date(config.schedule.start),
              time: new Date(config.schedule.start),
              schedule: config.schedule.repeat.unit,
              active: config.schedule?.active,
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
          path: (store.dataSelection as HotfolderDataSelection)?.path,
        };
        break;
      case "oai":
        dataSelection = {
          identifiers: (store.dataSelection as OaiDataSelection)?.identifiers,
          sets: (store.dataSelection as OaiDataSelection)?.sets,
          from:
            (store.dataSelection as OaiDataSelection)?.from !== undefined
              ? formatDateToISOString(
                  (store.dataSelection as OaiDataSelection).from as Date
                ).split("T")[0]
              : undefined,
          until: (store.dataSelection as OaiDataSelection)?.until
            ? formatDateToISOString(
                (store.dataSelection as OaiDataSelection).until as Date
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
    )
      mapping = undefined;
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
    if (
      store.scheduling?.date !== undefined &&
      store.scheduling?.time !== undefined
    ) {
      if (store.scheduling?.schedule === undefined) {
        console.error(
          "Missing schedule type. Falling back to 'onetime'-schedule."
        );
      }
      schedule = {
        active: store.scheduling.active ?? true,
        start: formatDateToISOString(
          combineDateAndTime(store.scheduling.date, store.scheduling.time)!
        ),
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
}));
