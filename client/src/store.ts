import { create } from "zustand";

import t from "./utils/translation";
import {
  ACL,
  User,
  GroupInfo,
  Template,
  Hotfolder,
  Workspace,
  JobConfig,
  JobInfo,
  RecordInfo,
} from "./types";
import { WidgetConfig } from "./components/Widgets/types";
import { defaultJSONFetch } from "./utils/api";

export interface SessionStore {
  loggedIn?: boolean;
  setLoggedIn: (loggedIn: boolean) => void;
  me?: User;
  setMe: (me: User) => void;
  setWidgetConfig: (widgetConfig: Record<string, WidgetConfig>) => void;
  fetchMe: (p: {
    onSuccess?: () => void;
    onFail?: (error: string) => void;
  }) => void;
  acl?: ACL;
  fetchACL: (p: {
    onSuccess?: () => void;
    onFail?: (error: string) => void;
  }) => void;
}

export interface PermissionConfigStore {
  groups?: GroupInfo[];
  fetchGroups: (p: {
    useACL?: boolean;
    onSuccess?: () => void;
    onFail?: (error: string) => void;
  }) => void;
}

export interface UserStore {
  userIds: string[];
  users: Record<string, User>;
  fetchUser: (p: {
    userId: string;
    onSuccess?: (user: User) => void;
    onFail?: (error: string) => void;
  }) => void;
  fetchList: (p: {
    useACL?: boolean;
    onSuccess?: () => void;
    onFail?: (error: string) => void;
    replace?: boolean;
  }) => void;
}

export interface TemplateStore {
  templateIds: string[];
  templates: Record<string, Template>;
  fetchTemplate: (p: {
    templateId: string;
    onSuccess?: (template: Template) => void;
    onFail?: (error: string) => void;
  }) => void;
  fetchList: (p: {
    useACL?: boolean;
    onSuccess?: () => void;
    onFail?: (error: string) => void;
    replace?: boolean;
  }) => void;
  hotfolders: Record<string, Hotfolder>;
  fetchHotfolders: (p: {
    useACL?: boolean;
    onSuccess?: () => void;
    onFail?: (error: string) => void;
  }) => void;
}

export interface WorkspaceStore {
  workspaceIds: string[];
  workspaces: Record<string, Workspace>;
  fetchWorkspace: (p: {
    workspaceId: string;
    onSuccess?: (workspace: Workspace) => void;
    onFail?: (error: string) => void;
  }) => void;
  fetchList: (p: {
    useACL?: boolean;
    onSuccess?: () => void;
    onFail?: (error: string) => void;
    replace?: boolean;
  }) => void;
}

export interface JobStore {
  jobConfigIds: string[];
  jobConfigs: Record<string, JobConfig>;
  fetchJobConfig: (p: {
    jobConfigId: string;
    onSuccess?: (jobConfig: JobConfig) => void;
    onFail?: (error: string) => void;
  }) => void;
  fetchList: (p: {
    useACL?: boolean;
    onSuccess?: () => void;
    onFail?: (error: string) => void;
    replace?: boolean;
  }) => void;
  jobInfos: Record<string, JobInfo>;
  fetchJobInfo: (p: {
    token: string;
    useACL?: boolean;
    forceReload?: boolean;
    onSuccess?: (jobInfo: JobInfo) => void;
    onFail?: (error: string) => void;
  }) => void;
  fetchRecordsByJobConfig: (p: {
    jobConfigId: string;
    success?: "true" | "false";
    onSuccess?: (records: RecordInfo[]) => void;
    onFail?: (error: string) => void;
  }) => void;
}

interface GlobalStore {
  session: SessionStore;
  permission: PermissionConfigStore;
  user: UserStore;
  template: TemplateStore;
  workspace: WorkspaceStore;
  job: JobStore;
}

const useGlobalStore = create<GlobalStore>()((set, get) => ({
  session: {
    loggedIn: undefined,
    setLoggedIn: (loggedIn) =>
      set((state) => ({ session: { ...state.session, loggedIn } })),
    setMe: (me) => {
      set((state) => ({
        session: {
          ...state.session,
          me,
        },
      }));
    },
    setWidgetConfig: (widgetConfig) => {
      set((state) => ({
        session: {
          ...state.session,
          me: {
            ...(state.session.me ?? { id: "?", username: "?" }),
            widgetConfig,
          },
        },
      }));
    },
    fetchMe: ({ onSuccess, onFail }) =>
      defaultJSONFetch(
        "/api/user/config",
        t("Nutzerkonfiguration (eigener Account)"),
        (json) =>
          set((state) => ({
            session: {
              ...state.session,
              me: json,
            },
          })),
        onSuccess,
        onFail
      ),
    fetchACL: ({ onSuccess, onFail }) =>
      defaultJSONFetch(
        "/api/user/acl",
        t("ACL (eigener Account)"),
        (json) =>
          set((state) => ({
            session: {
              ...state.session,
              acl: json,
            },
          })),
        onSuccess,
        onFail
      ),
  },
  permission: {
    fetchGroups: ({ useACL = false, onSuccess, onFail }) => {
      // TODO:
      // if (useACL && !get().session.acl?.READ_GROUP_INFO) return;
      defaultJSONFetch(
        "/api/admin/permissions/groups",
        t("Nutzergruppen"),
        (json) =>
          set((state) => ({
            permission: {
              ...state.permission,
              groups: json,
            },
          })),
        onSuccess,
        onFail
      );
    },
  },
  user: {
    userIds: [],
    users: {},
    fetchUser: ({ userId, onSuccess, onFail }) =>
      defaultJSONFetch(
        "/api/admin/user?" + new URLSearchParams({ id: userId }).toString(),
        t("Nutzerkonfiguration") +
          ` '${get().user.users[userId]?.username ?? userId}'`,
        (json) =>
          set((state) => ({
            user: {
              ...state.user,
              users: { ...state.user.users, [userId]: json },
            },
          })),
        onSuccess,
        onFail
      ),
    fetchList: ({ useACL = false, onSuccess, onFail, replace = false }) => {
      if (useACL && !get().session.acl?.READ_USERCONFIG) return;
      defaultJSONFetch(
        "/api/admin/users",
        t("Nutzerliste"),
        (json) =>
          set((state) =>
            replace
              ? { user: { ...state.user, userIds: json, users: {} } }
              : { user: { ...state.user, userIds: json } }
          ),
        onSuccess,
        onFail
      );
    },
  },
  template: {
    templateIds: [],
    templates: {},
    fetchTemplate: ({ templateId, onSuccess, onFail }) =>
      defaultJSONFetch(
        "/api/admin/template?" +
          new URLSearchParams({ id: templateId }).toString(),
        t("Template") +
          ` '${get().template.templates[templateId]?.name ?? templateId}'`,
        (json) =>
          set((state) => ({
            template: {
              ...state.template,
              templates: { ...state.template.templates, [templateId]: json },
            },
          })),
        onSuccess,
        onFail
      ),
    fetchList: ({ useACL = false, onSuccess, onFail, replace = false }) => {
      if (useACL && !get().session.acl?.READ_TEMPLATE) return;
      defaultJSONFetch(
        "/api/admin/templates",
        t("Templateliste"),
        (json) =>
          set((state) =>
            replace
              ? {
                  template: {
                    ...state.template,
                    templateIds: json,
                    templates: {},
                  },
                }
              : {
                  template: { ...state.template, templateIds: json },
                }
          ),
        onSuccess,
        onFail
      );
    },
    hotfolders: {},
    fetchHotfolders: ({ useACL = false, onSuccess, onFail }) => {
      if (useACL && !get().session.acl?.READ_TEMPLATE) return;
      defaultJSONFetch(
        "/api/admin/template/hotfolders",
        t("Hotfoldern"),
        (json) =>
          set((state) => ({
            template: {
              ...state.template,
              hotfolders: Object.fromEntries(
                json.map((hotfolder: Hotfolder) => [hotfolder.id, hotfolder])
              ),
            },
          })),
        onSuccess,
        onFail
      );
    },
  },
  workspace: {
    workspaceIds: [],
    workspaces: {},
    fetchWorkspace: ({ workspaceId, onSuccess, onFail }) =>
      defaultJSONFetch(
        "/api/admin/workspace?" +
          new URLSearchParams({ id: workspaceId }).toString(),
        t("Arbeitsbereich") +
          ` '${get().workspace.workspaces[workspaceId]?.name ?? workspaceId}'`,
        (json) =>
          set((state) => ({
            workspace: {
              ...state.workspace,
              workspaces: {
                ...state.workspace.workspaces,
                [workspaceId]: json,
              },
            },
          })),
        onSuccess,
        onFail
      ),
    fetchList: ({ useACL = false, onSuccess, onFail, replace = false }) => {
      if (useACL && !get().session.acl?.READ_WORKSPACE) return;
      defaultJSONFetch(
        "/api/admin/workspaces",
        t("Arbeitsbereichliste"),
        (json) =>
          set((state) =>
            replace
              ? {
                  workspace: {
                    ...state.workspace,
                    workspaceIds: json,
                    workspaces: {},
                  },
                }
              : {
                  workspace: { ...state.workspace, workspaceIds: json },
                }
          ),
        onSuccess,
        onFail
      );
    },
  },
  job: {
    jobConfigIds: [],
    jobConfigs: {},
    fetchJobConfig: ({ jobConfigId, onSuccess, onFail }) =>
      defaultJSONFetch(
        "/api/curator/job-config?" +
          new URLSearchParams({ id: jobConfigId }).toString(),
        t("Jobkonfiguration") +
          ` '${get().job.jobConfigs[jobConfigId]?.name ?? jobConfigId}'`,
        (json) =>
          set((state) => ({
            job: {
              ...state.job,
              jobConfigs: { ...state.job.jobConfigs, [jobConfigId]: json },
            },
          })),
        onSuccess,
        onFail
      ),
    fetchList: ({ useACL = false, onSuccess, onFail, replace = false }) => {
      if (useACL && !get().session.acl?.READ_JOBCONFIG) return;
      defaultJSONFetch(
        "/api/curator/job-configs",
        t("Jobliste"),
        (json) =>
          set((state) =>
            replace
              ? {
                  job: { ...state.job, jobConfigIds: json, jobConfigs: {} },
                }
              : {
                  job: { ...state.job, jobConfigIds: json },
                }
          ),
        onSuccess,
        onFail
      );
    },
    jobInfos: {},
    fetchJobInfo: ({ token, useACL, forceReload, onSuccess, onFail }) => {
      if (useACL && !get().session.acl?.READ_JOB) return;
      if (!forceReload && get().job.jobInfos[token]) {
        onSuccess?.(get().job.jobInfos[token]);
        return;
      }
      defaultJSONFetch(
        "/api/curator/job/info?" + new URLSearchParams({ token }).toString(),
        t("Job") + ` '${token}'`,
        (json) =>
          set((state) => ({
            job: {
              ...state.job,
              jobInfos: { ...state.job.jobInfos, [token]: json },
            },
          })),
        onSuccess,
        onFail
      );
    },
    fetchRecordsByJobConfig: ({ jobConfigId, success, onSuccess, onFail }) =>
      defaultJSONFetch(
        "/api/curator/job/records?" +
          new URLSearchParams({
            ...{ id: jobConfigId },
            ...(success === undefined ? {} : { success }),
          }).toString(),
        t("Records zur Konfiguration") +
          ` '${get().job.jobConfigs[jobConfigId]?.name ?? jobConfigId}'`,
        undefined,
        onSuccess,
        onFail
      ),
  },
}));

export default useGlobalStore;
