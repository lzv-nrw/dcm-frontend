import { WidgetConfig } from "./components/Widgets/types";

export interface ACL {
  [key: string]: undefined | boolean;
  CREATE_USERCONFIG?: boolean;
  DELETE_USERCONFIG?: boolean;
  READ_USERCONFIG?: boolean;
  MODIFY_USERCONFIG?: boolean;

  CREATE_WORKSPACE?: boolean;
  DELETE_WORKSPACE?: boolean;
  READ_WORKSPACE?: boolean;
  MODIFY_WORKSPACE?: boolean;

  CREATE_TEMPLATE?: boolean;
  DELETE_TEMPLATE?: boolean;
  READ_TEMPLATE?: boolean;
  MODIFY_TEMPLATE?: boolean;

  CREATE_JOBCONFIG?: boolean;
  DELETE_JOBCONFIG?: boolean;
  READ_JOBCONFIG?: boolean;
  MODIFY_JOBCONFIG?: boolean;

  CREATE_JOB?: boolean;
  DELETE_JOB?: boolean;
  READ_JOB?: boolean;
  MODIFY_JOB?: boolean;

  VIEW_SCREEN_USERCONFIGS?: boolean;
  VIEW_SCREEN_WORKSPACES?: boolean;
  VIEW_SCREEN_TEMPLATES?: boolean;
  VIEW_SCREEN_JOBS?: boolean;
}

export interface GroupMembership {
  id: string;
  workspace?: string;
}

export interface User {
  id: string;
  externalId?: string;
  status?: "ok" | "inactive" | "deleted";
  username?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  groups?: GroupMembership[];
  widgetConfig?: Record<string, WidgetConfig>;
  userCreated?: string;
  datetimeCreated?: string;
  userModified?: string;
  datetimeModified?: string;
}

export type PublicUserInfo = Pick<
  User,
  "id" | "username" | "firstname" | "lastname" | "email"
>;

export interface GroupInfo {
  id: string;
  name: string;
  workspaces: boolean;
}

export interface PluginTemplateInfo {
  plugin?: string;
  args?: {
    [key: string]: any;
  };
}

export interface HotfolderTemplateInfo {
  sourceId?: string;
}

export interface TransferUrlFilter {
  regex: string;
  path?: string;
}

export interface OAITemplateInfo {
  url?: string;
  metadataPrefix?: string;
  transferUrlFilters?: TransferUrlFilter[];
}

export interface HotfolderImportSource {
  id: string;
  name: string;
  path: string;
  description?: string;
}

export type TemplateType = "oai" | "hotfolder" | "plugin";

export interface Template {
  status: ConfigStatus;
  id?: string;
  workspaceId?: string;
  name?: string;
  description?: string;
  type?: TemplateType;
  additionalInformation?:
    | PluginTemplateInfo
    | HotfolderTemplateInfo
    | OAITemplateInfo;
  userCreated?: string;
  datetimeCreated?: string;
  userModified?: string;
  datetimeModified?: string;
  linkedJobs?: number;
}

export interface Workspace {
  id: string;
  name: string;
  templates?: string[];
  users?: string[];
  userCreated?: string;
  datetimeCreated?: string;
  userModified?: string;
  datetimeModified?: string;
}

export type ConfigStatus = "draft" | "ok";

export interface JobConfig {
  id: string;
  status: ConfigStatus;
  workspaceId?: string;
  templateId?: string;
  latestExec?: string;
  scheduledExec?: string;
  name?: string;
  description?: string;
  contactInfo?: string;
  dataSelection?: any; // FIXME: replace with actual data-structures after new job-config wizard is ready (maybe move types here)
  dataProcessing?: any; // FIXME: replace with actual data-structures after new job-config wizard is ready (maybe move types here)
  schedule?: any; // FIXME: replace with actual data-structures after new job-config wizard is ready (maybe move types here)
  userCreated?: string;
  datetimeCreated?: string;
  userModified?: string;
  datetimeModified?: string;
}

export interface RecordInfo {
  reportId: string;
  success: boolean;
  token?: string;
  originSystemId?: string;
  externalId?: string;
  sipId?: string;
  ieId?: string;
  datetimeProcessed?: string;
}

export interface JobInfo {
  token: string;
  jobConfigId?: string;
  userTriggered?: string;
  datetimeTriggered?: string;
  triggerType: "manual" | "onetime" | "scheduled" | "test";
  status?: string;
  success?: string;
  datetimeStarted?: string;
  datetimeEnded?: string;
  report?: {
    [key: string]: any;
    data: {
      success?: boolean;
      records?: Record<
        string,
        {
          success?: boolean;
          completed?: boolean;
          stages?: Record<
            string,
            { completed?: boolean; success?: boolean; logId?: string }
          >;
        }
      >;
    };
    children: {
      [key: string]: {
        [key: string]: any;
        log: {
          [key: string]: {
            body: string;
            datetime: string;
            origin: string;
          }[];
        };
      };
    };
  };
  templateId?: string;
  workspaceId?: string;
  records?: RecordInfo[];
}
