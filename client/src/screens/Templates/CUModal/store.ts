import { create } from "zustand";

import {
  createValidateWithChildren,
  mergeValidationReportIntoChildren,
  ValidationReportWithChildren,
  Validator,
} from "../../../utils/forms";
import {
  ConfigStatus,
  HotfolderTemplateInfo,
  OAITemplateInfo,
  PluginTemplateInfo,
  Template,
} from "../../../types";
import {
  Description,
  DescriptionFormChildren,
  DescriptionFormValidator,
  validateName,
  validateWorkspaceId,
} from "./DescriptionForm";
import {
  Source,
  SourceFormChildren,
  SourceFormValidator,
  validateHotfolderSourceId,
  validateOAIMetadataPrefix,
  validateOAITransferUrlFilters,
  validateOAIUrl,
  validatePluginArgs,
  validatePluginPlugin,
  validateType,
} from "./SourceForm";
import {
  Target,
  TargetFormChildren,
  TargetFormValidator,
  validateTargetId,
} from "./TargetForm";

export interface FormData {
  id?: string;
  status?: ConfigStatus;
  linkedJobs?: number;
  workspaceId?: string;
  description?: Description;
  source?: Source;
  target?: Target;
}

type FormChildren = "description" | "source" | "target";
type FormValidator = Validator<FormChildren>;

export interface FormStore extends FormData {
  validator: FormValidator;
  setCurrentValidationReport: (
    report: ValidationReportWithChildren<FormChildren>
  ) => void;
  setId: (id?: string) => void;
  setStatus: (status?: ConfigStatus) => void;
  setLinkedJobs: (linkedJobs?: number) => void;
  setWorkspaceId: (id?: string) => void;
  setDescription: (description: Description, replace?: boolean) => void;
  setSource: (source: Source, replace?: boolean) => void;
  setTarget: (target: Target, replace?: boolean) => void;
  initFromConfig: (template: Template) => void;
  formatToConfig: (status: ConfigStatus) => Template;
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
          workspaceId: {
            validate: (strict: boolean) =>
              validateWorkspaceId(strict, get().description?.workspaceId),
          },
        },
      } as DescriptionFormValidator,
      source: {
        validate: createValidateWithChildren<SourceFormChildren>(
          () => get().validator.children?.source,
          (strict) => {
            if (strict) return validateType(strict, get().source?.type) ?? {};
            return {};
          }
        ),
        children: {
          pluginPlugin: {
            validate: (strict: boolean) => {
              if (get().source?.type !== "plugin") return undefined;
              return validatePluginPlugin(strict, get().source?.plugin?.plugin);
            },
          },
          pluginArgs: {
            validate: (strict: boolean) => {
              if (get().source?.type !== "plugin") return undefined;
              return validatePluginArgs(strict, get().source?.plugin?.args);
            },
          },
          hotfolderSourceId: {
            validate: (strict: boolean) => {
              if (get().source?.type !== "hotfolder") return undefined;
              return validateHotfolderSourceId(
                strict,
                get().source?.hotfolder?.sourceId
              );
            },
          },
          oaiUrl: {
            validate: (strict: boolean) => {
              if (get().source?.type !== "oai") return undefined;
              return validateOAIUrl(strict, get().source?.oai?.url);
            },
          },
          oaiMetadataPrefix: {
            validate: (strict: boolean) => {
              if (get().source?.type !== "oai") return undefined;
              return validateOAIMetadataPrefix(
                strict,
                get().source?.oai?.metadataPrefix
              );
            },
          },
          oaiTransferUrlFilters: {
            validate: (strict: boolean) => {
              if (get().source?.type !== "oai") return undefined;
              return validateOAITransferUrlFilters(
                strict,
                get().source?.oai?.transferUrlFilters
              );
            },
          },
        },
      } as SourceFormValidator,
      target: {
        validate: createValidateWithChildren<TargetFormChildren>(
          () => get().validator.children?.target,
          (strict) => {
            if (strict) return { ok: true };
            return {};
          }
        ),
        children: {
          targetId: {
            validate: (strict: boolean) =>
              validateTargetId(strict, get().target?.targetId),
          },
        },
      } as TargetFormValidator,
    },
  },
  setCurrentValidationReport: (report) =>
    set({
      validator: mergeValidationReportIntoChildren(get().validator, report),
    }),
  setId: (id) => set({ id }),
  setStatus: (status) => set({ status }),
  status: "draft",
  setLinkedJobs: (linkedJobs) => set({ linkedJobs }),
  linkedJobs: 0,
  setWorkspaceId: (id) => set({ workspaceId: id }),
  setDescription: (description, replace = false) =>
    replace
      ? set({ description })
      : set({ description: { ...get().description, ...description } }),
  setSource: (source, replace = false) =>
    replace ? set({ source }) : set({ source: { ...get().source, ...source } }),
  setTarget: (target, replace = false) =>
    replace ? set({ target }) : set({ target: { ...get().target, ...target } }),
  initFromConfig: (template: Template) => {
    const store = get();
    store.setId(template.id);
    store.setStatus(template.status);
    store.setLinkedJobs(template.linkedJobs);
    store.setWorkspaceId(template.workspaceId);
    store.setDescription(
      {
        name: template.name,
        description: template.description,
        workspaceId: template.workspaceId,
      },
      true
    );
    switch (template.type) {
      case "plugin":
        store.setSource(
          {
            type: "plugin",
            plugin: {
              plugin: (template.additionalInformation as PluginTemplateInfo)
                .plugin,
              args: JSON.stringify(
                (template.additionalInformation as PluginTemplateInfo).args
              ),
            },
          },
          true
        );
        break;
      case "hotfolder":
        store.setSource(
          {
            type: "hotfolder",
            hotfolder: {
              sourceId: (
                template.additionalInformation as HotfolderTemplateInfo
              ).sourceId,
            },
          },
          true
        );
        break;
      case "oai":
        store.setSource(
          {
            type: "oai",
            oai: {
              url: (template.additionalInformation as OAITemplateInfo).url,
              metadataPrefix: (
                template.additionalInformation as OAITemplateInfo
              ).metadataPrefix,
              metadataPrefixes: (
                template.additionalInformation as OAITemplateInfo
              ).metadataPrefix
                ? [
                    (template.additionalInformation as OAITemplateInfo)
                      .metadataPrefix!,
                  ]
                : undefined,
              transferUrlFilters: (
                template.additionalInformation as OAITemplateInfo
              ).transferUrlFilters,
            },
          },
          true
        );
        break;
      default:
      // nothing to do
    }
  },
  formatToConfig: (status) => {
    const store = get();

    let additionalInformation;
    switch (store.source?.type) {
      case "plugin":
        additionalInformation = {
          plugin: store.source.plugin?.plugin ?? "", // ?? "" fixes backend-sdk compatibility
          args: JSON.parse(
            store.source.plugin?.args && store.source.plugin?.args !== ""
              ? store.source.plugin.args
              : "{}"
          ),
        };
        break;
      case "hotfolder":
        additionalInformation = {
          sourceId: store.source.hotfolder?.sourceId ?? "", // ?? "" fixes backend-sdk compatibility
        };
        break;
      case "oai":
        additionalInformation = {
          url: store.source.oai?.url ?? "", // ?? "" fixes backend-sdk compatibility
          metadataPrefix: store.source.oai?.metadataPrefix,
          transferUrlFilters: store.source.oai?.transferUrlFilters,
        };
        break;
      default:
        additionalInformation = undefined;
    }

    return {
      id: store.id,
      status,
      workspaceId: store.workspaceId,
      ...store.description,
      type: store.source?.type,
      additionalInformation,
      // TODO: add targetId to template-object
      //...formStore.target,
    };
  },
}));
