import { create } from "zustand";

import { host, credentialsValue } from "./App";
import {
  ACL,
  User,
  GroupInfo,
  Template,
  HotfolderImportSource,
  Workspace,
  JobConfig,
  JobInfo,
  RecordInfo,
} from "./types";
import { WidgetConfig } from "./components/Widgets/types";

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
  hotfolderImportSources: Record<string, HotfolderImportSource>;
  fetchHotfolderImportSources: (p: {
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
    fetchMe: ({ onSuccess, onFail }) => {
      fetch(host + "/api/user/config", { credentials: credentialsValue })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unexpected response (${response.statusText}).`);
          }
          return response.json();
        })
        .then((json) => {
          set((state) => ({
            session: {
              ...state.session,
              me: json,
            },
          }));
          onSuccess?.();
        })
        .catch((error) => {
          console.error(error);
          onFail?.(error.message);
        });
    },
    fetchACL: ({ onSuccess, onFail }) => {
      fetch(host + "/api/user/acl", { credentials: credentialsValue })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unexpected response (${response.statusText}).`);
          }
          return response.json();
        })
        .then((json) => {
          set((state) => ({
            session: {
              ...state.session,
              acl: json,
            },
          }));
          onSuccess?.();
        })
        .catch((error) => {
          console.error(error);
          onFail?.(error.message);
        });
    },
  },
  permission: {
    fetchGroups: ({ useACL = false, onSuccess, onFail }) => {
      // TODO:
      // if (useACL && !get().session.acl?.READ_GROUP_INFO) return;
      fetch(host + "/api/admin/permissions/groups", {
        credentials: credentialsValue,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unexpected response (${response.statusText}).`);
          }
          return response.json();
        })
        .then((json) => {
          set((state) => ({
            permission: {
              ...state.permission,
              groups: json,
            },
          }));
          onSuccess?.();
        })
        .catch((error) => {
          console.error(error);
          onFail?.(error.message);
        });
    },
  },
  user: {
    userIds: [],
    users: {},
    fetchUser: ({ userId, onSuccess, onFail }) => {
      fetch(
        host +
          "/api/admin/user?" +
          new URLSearchParams({ id: userId }).toString(),
        { credentials: credentialsValue }
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unexpected response (${response.statusText}).`);
          }
          return response.json();
        })
        .then((json) => {
          set((state) => ({
            user: {
              ...state.user,
              users: { ...state.user.users, [userId]: json },
            },
          }));
          onSuccess?.(json);
        })
        .catch((error) => {
          console.error(error);
          onFail?.(error.message);
        });
    },
    fetchList: ({ useACL = false, onSuccess, onFail, replace = false }) => {
      if (useACL && !get().session.acl?.READ_USERCONFIG) return;
      fetch(host + "/api/admin/users", { credentials: credentialsValue })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unexpected response (${response.statusText}).`);
          }
          return response.json();
        })
        .then((json) => {
          set((state) =>
            replace
              ? { user: { ...state.user, userIds: json, users: {} } }
              : { user: { ...state.user, userIds: json } }
          );
          onSuccess?.();
        })
        .catch((error) => {
          console.error(error);
          onFail?.(error.message);
        });
    },
  },
  template: {
    templateIds: [],
    templates: {},
    fetchTemplate: ({ templateId, onSuccess, onFail }) => {
      fetch(
        host +
          "/api/admin/template?" +
          new URLSearchParams({ id: templateId }).toString(),
        { credentials: credentialsValue }
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unexpected response (${response.statusText}).`);
          }
          return response.json();
        })
        .then((json) => {
          set((state) => ({
            template: {
              ...state.template,
              templates: { ...state.template.templates, [templateId]: json },
            },
          }));
          onSuccess?.(json);
        })
        .catch((error) => {
          console.error(error);
          onFail?.(error.message);
        });
    },
    fetchList: ({ useACL = false, onSuccess, onFail, replace = false }) => {
      if (useACL && !get().session.acl?.READ_TEMPLATE) return;
      fetch(host + "/api/admin/templates", { credentials: credentialsValue })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unexpected response (${response.statusText}).`);
          }
          return response.json();
        })
        .then((json) => {
          set((state) => ({
            template: { ...state.template, templateIds: json },
          }));
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
          );
          onSuccess?.();
        })
        .catch((error) => {
          console.error(error);
          onFail?.(error.message);
        });
    },
    hotfolderImportSources: {},
    fetchHotfolderImportSources: ({ useACL = false, onSuccess, onFail }) => {
      if (useACL && !get().session.acl?.READ_TEMPLATE) return;
      fetch(host + "/api/admin/template/hotfolder-sources", {
        credentials: credentialsValue,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unexpected response (${response.statusText}).`);
          }
          return response.json();
        })
        .then((json) => {
          const srcsRecord: Record<string, HotfolderImportSource> = {};
          for (const src of json) {
            srcsRecord[src.id] = src;
          }
          set((state) => ({
            template: { ...state.template, hotfolderImportSources: srcsRecord },
          }));
          onSuccess?.();
        })
        .catch((error) => {
          console.error(error);
          onFail?.(error.message);
        });
    },
  },
  workspace: {
    workspaceIds: [],
    workspaces: {},
    fetchWorkspace: ({ workspaceId, onSuccess, onFail }) => {
      fetch(
        host +
          "/api/admin/workspace?" +
          new URLSearchParams({ id: workspaceId }).toString(),
        { credentials: credentialsValue }
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unexpected response (${response.statusText}).`);
          }
          return response.json();
        })
        .then((json) => {
          set((state) => ({
            workspace: {
              ...state.workspace,
              workspaces: {
                ...state.workspace.workspaces,
                [workspaceId]: json,
              },
            },
          }));
          onSuccess?.(json);
        })
        .catch((error) => {
          console.error(error);
          onFail?.(error.message);
        });
    },
    fetchList: ({ useACL = false, onSuccess, onFail }) => {
      if (useACL && !get().session.acl?.READ_WORKSPACE) return;
      fetch(host + "/api/admin/workspaces", { credentials: credentialsValue })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unexpected response (${response.statusText}).`);
          }
          return response.json();
        })
        .then((json) => {
          set((state) => ({
            workspace: { ...state.workspace, workspaceIds: json },
          }));
          onSuccess?.();
        })
        .catch((error) => {
          console.error(error);
          onFail?.(error.message);
        });
    },
  },
  job: {
    jobConfigIds: [],
    jobConfigs: {},
    fetchJobConfig: ({ jobConfigId, onSuccess, onFail }) => {
      fetch(
        host +
          "/api/curator/job-config?" +
          new URLSearchParams({ id: jobConfigId }).toString(),
        { credentials: credentialsValue }
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unexpected response (${response.statusText}).`);
          }
          return response.json();
        })
        .then((json) => {
          set((state) => ({
            job: {
              ...state.job,
              jobConfigs: { ...state.job.jobConfigs, [jobConfigId]: json },
            },
          }));
          onSuccess?.(json);
        })
        .catch((error) => {
          console.error(error);
          onFail?.(error.message);
        });
    },
    fetchList: ({ useACL = false, onSuccess, onFail, replace = false }) => {
      if (useACL && !get().session.acl?.READ_JOBCONFIG) return;
      fetch(host + "/api/curator/job-configs", {
        credentials: credentialsValue,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unexpected response (${response.statusText}).`);
          }
          return response.json();
        })
        .then((json) => {
          set((state) =>
            replace
              ? {
                  job: { ...state.job, jobConfigIds: json, jobConfigs: {} },
                }
              : {
                  job: { ...state.job, jobConfigIds: json },
                }
          );
          onSuccess?.();
        })
        .catch((error) => {
          console.error(error);
          onFail?.(error.message);
        });
    },
    jobInfos: {},
    fetchJobInfo: ({ token, useACL, forceReload, onSuccess, onFail }) => {
      if (useACL && !get().session.acl?.READ_JOB) return;
      if (!forceReload && get().job.jobInfos[token]) {
        onSuccess?.(get().job.jobInfos[token]);
        return;
      }
      fetch(
        host +
          "/api/curator/job/info?" +
          new URLSearchParams({ token }).toString(),
        {
          credentials: credentialsValue,
        }
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unexpected response (${response.statusText}).`);
          }
          return response.json();
        })
        .then((json) => {
          set((state) => ({
            job: {
              ...state.job,
              jobInfos: { ...state.job.jobInfos, [token]: json },
            },
          }));
          onSuccess?.(json);
        })
        .catch((error) => {
          console.error(error);
          onFail?.(error.message);
        });
    },
    fetchRecordsByJobConfig: ({ jobConfigId, success, onSuccess, onFail }) => {
      fetch(
        host +
          "/api/curator/job/records?" +
          new URLSearchParams({
            ...{ id: jobConfigId },
            ...(success === undefined ? {} : { success }),
          }).toString(),
        {
          credentials: credentialsValue,
        }
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unexpected response (${response.statusText}).`);
          }
          return response.json();
        })
        .then((json) => {
          onSuccess?.(json);
        })
        .catch((error) => {
          onFail?.(error.message);
        });
    },
  },
}));

export default useGlobalStore;
