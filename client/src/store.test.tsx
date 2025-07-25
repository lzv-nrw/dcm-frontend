import { act, useEffect } from "react";
import { render } from "@testing-library/react";

import useGlobalStore, {
  PermissionConfigStore,
  SessionStore,
  TemplateStore,
  UserStore,
  WorkspaceStore,
} from "./store";
import { ACL, GroupInfo, User } from "./types";

describe("SessionStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGlobalStore.setState(useGlobalStore.getInitialState());
  });

  test("set login", async () => {
    // setup sessionStore and dummy-component
    let sessionStore: SessionStore;
    function Login(p: { makeLogin: boolean }) {
      sessionStore = useGlobalStore((state) => state.session);
      useEffect(() => {
        if (p.makeLogin) sessionStore.setLoggedIn(true);
      }, [sessionStore.setLoggedIn]);
      return <></>;
    }

    // render and eval
    await act(() => render(<Login makeLogin={false} />));
    expect(sessionStore!.loggedIn).toBeFalsy();

    // render and eval again
    await act(() => render(<Login makeLogin={true} />));
    expect(sessionStore!.loggedIn).toBeTruthy();
  });

  test("successful fetchMe", async () => {
    // mock fetch-API
    const user: User = { id: "some-id", username: "some-name" };
    jest.spyOn(global, "fetch").mockImplementation(
      jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(user),
        })
      ) as jest.Mock
    );

    // setup sessionStore and dummy-component
    let sessionStore: SessionStore;
    function FetchMe(p: { onSuccess?: () => void }) {
      sessionStore = useGlobalStore((state) => state.session);
      useEffect(
        () => sessionStore.fetchMe({ onSuccess: p.onSuccess }),
        [sessionStore.fetchMe]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchMe />));

    expect(sessionStore!.me).toEqual(user);

    // render again with success-callback
    const markSuccess = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchMe onSuccess={markSuccess} />));
    expect(markSuccess).toHaveBeenCalledTimes(1);
  });

  test("failed fetchMe", async () => {
    // mock fetch-API
    jest
      .spyOn(global, "fetch")
      .mockImplementation(
        jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock
      );

    // setup sessionStore and dummy-component
    let sessionStore: SessionStore;
    function FetchMe(p: { onFail?: () => void }) {
      sessionStore = useGlobalStore((state) => state.session);
      useEffect(
        () => sessionStore.fetchMe({ onFail: p.onFail }),
        [sessionStore.fetchMe]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchMe />));
    expect(sessionStore!.me).toBeUndefined();

    // render again with fail-callback
    const markFail = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchMe onFail={markFail} />));
    expect(markFail).toHaveBeenCalledTimes(1);
  });

  test("successful fetchACL", async () => {
    // mock fetch-API
    const acl: ACL = { KEY: true };
    jest.spyOn(global, "fetch").mockImplementation(
      jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(acl),
        })
      ) as jest.Mock
    );

    // setup sessionStore and dummy-component
    let sessionStore: SessionStore;
    function FetchACL(p: { onSuccess?: () => void }) {
      sessionStore = useGlobalStore((state) => state.session);
      useEffect(
        () => sessionStore.fetchACL({ onSuccess: p.onSuccess }),
        [sessionStore.fetchACL]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchACL />));

    expect(sessionStore!.acl).toEqual(acl);

    // render again with success-callback
    const markSuccess = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchACL onSuccess={markSuccess} />));
    expect(markSuccess).toHaveBeenCalledTimes(1);
  });

  test("failed fetchACL", async () => {
    // mock fetch-API
    jest
      .spyOn(global, "fetch")
      .mockImplementation(
        jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock
      );

    // setup sessionStore and dummy-component
    let sessionStore: SessionStore;
    function FetchACL(p: { onFail?: () => void }) {
      sessionStore = useGlobalStore((state) => state.session);
      useEffect(
        () => sessionStore.fetchACL({ onFail: p.onFail }),
        [sessionStore.fetchACL]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchACL />));
    expect(sessionStore!.acl).toBeUndefined();

    // render again with fail-callback
    const markFail = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchACL onFail={markFail} />));
    expect(markFail).toHaveBeenCalledTimes(1);
  });
});

describe("PermissionConfigStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGlobalStore.setState(useGlobalStore.getInitialState());
  });

  test("successful fetchGroups", async () => {
    // mock fetch-API
    const groups: GroupInfo[] = [{id: "g0", name: "group 0", workspaces: true}];
    jest.spyOn(global, "fetch").mockImplementation(
      jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(groups),
        })
      ) as jest.Mock
    );

    // setup permissionConfigStore and dummy-component
    let permissionConfigStore: PermissionConfigStore;
    function FetchGroups(p: { onSuccess?: () => void }) {
      permissionConfigStore = useGlobalStore((state) => state.permission);
      useEffect(
        () => permissionConfigStore.fetchGroups({ onSuccess: p.onSuccess }),
        [permissionConfigStore.fetchGroups]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchGroups />));

    expect(permissionConfigStore!.groups).toEqual(groups);

    // render again with success-callback
    const markSuccess = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchGroups onSuccess={markSuccess} />));
    expect(markSuccess).toHaveBeenCalledTimes(1);
  });

  test("failed fetchGroups", async () => {
    // mock fetch-API
    jest
      .spyOn(global, "fetch")
      .mockImplementation(
        jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock
      );

    // setup permissionConfigStore and dummy-component
    let permissionConfigStore: PermissionConfigStore;
    function FetchGroups(p: { onFail?: () => void }) {
      permissionConfigStore = useGlobalStore((state) => state.permission);
      useEffect(
        () => permissionConfigStore.fetchGroups({ onFail: p.onFail }),
        [permissionConfigStore.fetchGroups]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchGroups />));
    expect(permissionConfigStore!.groups).toBeUndefined();

    // render again with fail-callback
    const markFail = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchGroups onFail={markFail} />));
    expect(markFail).toHaveBeenCalledTimes(1);
  });
});

describe("UserStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGlobalStore.setState(useGlobalStore.getInitialState());
  });

  test("skip fetchList due to ACL", async () => {
    // mock store
    useGlobalStore.setState((state) => ({
      session: { ...state.session, acl: {READ_TEMPLATE: false} },
    }));
    // mock fetch-API
    const fetchMock = jest.fn() as jest.Mock;
    jest.spyOn(global, "fetch").mockImplementation(fetchMock);

    // setup userStore and dummy-component
    let userStore: UserStore;
    function FetchList(p: { onSuccess?: () => void }) {
      userStore = useGlobalStore((state) => state.user);
      useEffect(
        () => userStore.fetchList({ useACL: true }),
        [userStore.fetchList]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchList />));

    expect(fetchMock).not.toBeCalled();
  });

  test("successful fetchList", async () => {
    // mock fetch-API
    const userIds = ["0", "1"];
    jest.spyOn(global, "fetch").mockImplementation(
      jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(userIds),
        })
      ) as jest.Mock
    );

    // setup userStore and dummy-component
    let userStore: UserStore;
    function FetchList(p: { onSuccess?: () => void }) {
      userStore = useGlobalStore((state) => state.user);
      useEffect(
        () => userStore.fetchList({ onSuccess: p.onSuccess }),
        [userStore.fetchList]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchList />));

    expect(userStore!.userIds).toHaveLength(2);
    expect(userStore!.userIds).toEqual(userIds);

    // render again with success-callback
    const markSuccess = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchList onSuccess={markSuccess} />));
    expect(markSuccess).toHaveBeenCalledTimes(1);
  });

  test("failed fetchList", async () => {
    // mock fetch-API
    jest
      .spyOn(global, "fetch")
      .mockImplementation(
        jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock
      );

    // setup userStore and dummy-component
    let userStore: UserStore;
    function FetchList(p: { onFail?: () => void }) {
      userStore = useGlobalStore((state) => state.user);
      useEffect(
        () => userStore.fetchList({ onFail: p.onFail }),
        [userStore.fetchList]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchList />));
    expect(userStore!.userIds).toHaveLength(0);

    // render again with fail-callback
    const markFail = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchList onFail={markFail} />));
    expect(markFail).toHaveBeenCalledTimes(1);
  });

  test("successful fetchUser", async () => {
    // mock fetch-API
    const userConfig = { userId: "some-id" };

    jest.spyOn(global, "fetch").mockImplementation(
      jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(userConfig),
        })
      ) as jest.Mock
    );

    // setup userStore and dummy-component
    let userStore: UserStore;
    function FetchUser(p: { onSuccess?: () => void }) {
      userStore = useGlobalStore((state) => state.user);
      useEffect(
        () =>
          userStore.fetchUser({
            userId: userConfig.userId,
            onSuccess: p.onSuccess,
          }),
        [userStore.fetchUser]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchUser />));
    expect(Object.keys(userStore!.users)).toEqual([userConfig.userId]);
    expect(Object.values(userStore!.users)).toEqual([userConfig]);

    // render again with success-callback
    const markSuccess = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchUser onSuccess={markSuccess} />));
    expect(markSuccess).toHaveBeenCalledTimes(1);
  });

  test("fail fetchUser", async () => {
    // mock fetch-API
    jest
      .spyOn(global, "fetch")
      .mockImplementation(
        jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock
      );

    // setup userStore and dummy-component
    let userStore: UserStore;
    function FetchUser(p: { onFail?: () => void }) {
      userStore = useGlobalStore((state) => state.user);
      useEffect(
        () => userStore.fetchUser({ userId: "some-id", onFail: p.onFail }),
        [userStore.fetchUser]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchUser />));
    expect(Object.keys(userStore!.users)).toHaveLength(0);

    // render again with fail-callback
    const markFail = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchUser onFail={markFail} />));
    expect(markFail).toHaveBeenCalledTimes(1);
  });
});

describe("TemplateStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGlobalStore.setState(useGlobalStore.getInitialState());
  });

  test("skip fetchList due to ACL", async () => {
    // mock store
    useGlobalStore.setState((state) => ({
      session: { ...state.session, acl: {READ_TEMPLATE: false} },
    }));
    // mock fetch-API
    const fetchMock = jest.fn() as jest.Mock;
    jest.spyOn(global, "fetch").mockImplementation(fetchMock);

    // setup templateStore and dummy-component
    let templateStore: TemplateStore;
    function FetchList(p: { onSuccess?: () => void }) {
      templateStore = useGlobalStore((state) => state.template);
      useEffect(
        () => templateStore.fetchList({ useACL: true }),
        [templateStore.fetchList]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchList />));

    expect(fetchMock).not.toBeCalled();
  });

  test("successful fetchList", async () => {
    // mock fetch-API
    const templateIds = ["0", "1"];
    jest.spyOn(global, "fetch").mockImplementation(
      jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(templateIds),
        })
      ) as jest.Mock
    );

    // setup templateStore and dummy-component
    let templateStore: TemplateStore;
    function FetchList(p: { onSuccess?: () => void }) {
      templateStore = useGlobalStore((state) => state.template);
      useEffect(
        () => templateStore.fetchList({ onSuccess: p.onSuccess }),
        [templateStore.fetchList]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchList />));

    expect(templateStore!.templateIds).toHaveLength(2);
    expect(templateStore!.templateIds).toEqual(templateIds);

    // render again with success-callback
    const markSuccess = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchList onSuccess={markSuccess} />));
    expect(markSuccess).toHaveBeenCalledTimes(1);
  });

  test("failed fetchList", async () => {
    // mock fetch-API
    jest
      .spyOn(global, "fetch")
      .mockImplementation(
        jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock
      );

    // setup templateStore and dummy-component
    let templateStore: TemplateStore;
    function FetchList(p: { onFail?: () => void }) {
      templateStore = useGlobalStore((state) => state.template);
      useEffect(
        () => templateStore.fetchList({ onFail: p.onFail }),
        [templateStore.fetchList]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchList />));
    expect(templateStore!.templateIds).toHaveLength(0);

    // render again with fail-callback
    const markFail = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchList onFail={markFail} />));
    expect(markFail).toHaveBeenCalledTimes(1);
  });

  test("successful fetchTemplates", async () => {
    // mock fetch-API
    const template = {
      id: "t0",
      name: "template 0",
      type: "oai",
      additionalInformation: {},
    };
    jest.spyOn(global, "fetch").mockImplementation(
      jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(template),
        })
      ) as jest.Mock
    );

    // setup templateStore and dummy-component
    let templateStore: TemplateStore;
    function FetchTemplate(p: { onSuccess?: () => void }) {
      templateStore = useGlobalStore((state) => state.template);
      useEffect(
        () =>
          templateStore.fetchTemplate({
            templateId: template.id,
            onSuccess: p.onSuccess,
          }),
        [templateStore.fetchTemplate]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchTemplate />));
    expect(Object.keys(templateStore!.templates)).toEqual([template.id]);
    expect(Object.values(templateStore!.templates)).toEqual([template]);

    // render again with success-callback
    const markSuccess = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchTemplate onSuccess={markSuccess} />));
    expect(markSuccess).toHaveBeenCalledTimes(1);
  });

  test("fail FetchTemplate", async () => {
    // mock fetch-API
    jest
      .spyOn(global, "fetch")
      .mockImplementation(
        jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock
      );

    // setup templateStore and dummy-component
    let templateStore: TemplateStore;
    function FetchTemplate(p: { onFail?: () => void }) {
      templateStore = useGlobalStore((state) => state.template);
      useEffect(
        () =>
          templateStore.fetchTemplate({
            templateId: "some-id",
            onFail: p.onFail,
          }),
        [templateStore.fetchTemplate]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchTemplate />));
    expect(Object.keys(templateStore!.templates)).toHaveLength(0);

    // render again with fail-callback
    const markFail = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchTemplate onFail={markFail} />));
    expect(markFail).toHaveBeenCalledTimes(1);
  });
});

describe("WorkspaceStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGlobalStore.setState(useGlobalStore.getInitialState());
  });

  test("skip fetchList due to ACL", async () => {
    // mock store
    useGlobalStore.setState((state) => ({
      session: { ...state.session, acl: {READ_WORKSPACE: false} },
    }));
    // mock fetch-API
    const fetchMock = jest.fn() as jest.Mock;
    jest.spyOn(global, "fetch").mockImplementation(fetchMock);

    // setup workspaceStore and dummy-component
    let workspaceStore: WorkspaceStore;
    function FetchList(p: { onSuccess?: () => void }) {
      workspaceStore = useGlobalStore((state) => state.workspace);
      useEffect(
        () => workspaceStore.fetchList({ useACL: true }),
        [workspaceStore.fetchList]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchList />));

    expect(fetchMock).not.toBeCalled();
  });

  test("successful fetchList", async () => {
    // mock fetch-API
    const workspaceIds = ["0", "1"];
    jest.spyOn(global, "fetch").mockImplementation(
      jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(workspaceIds),
        })
      ) as jest.Mock
    );

    // setup workspaceStore and dummy-component
    let workspaceStore: WorkspaceStore;
    function FetchList(p: { onSuccess?: () => void }) {
      workspaceStore = useGlobalStore((state) => state.workspace);
      useEffect(
        () => workspaceStore.fetchList({ onSuccess: p.onSuccess }),
        [workspaceStore.fetchList]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchList />));

    expect(workspaceStore!.workspaceIds).toHaveLength(2);
    expect(workspaceStore!.workspaceIds).toEqual(workspaceIds);

    // render again with success-callback
    const markSuccess = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchList onSuccess={markSuccess} />));
    expect(markSuccess).toHaveBeenCalledTimes(1);
  });

  test("failed fetchList", async () => {
    // mock fetch-API
    jest
      .spyOn(global, "fetch")
      .mockImplementation(
        jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock
      );

    // setup workspaceStore and dummy-component
    let workspaceStore: WorkspaceStore;
    function FetchList(p: { onFail?: () => void }) {
      workspaceStore = useGlobalStore((state) => state.workspace);
      useEffect(
        () => workspaceStore.fetchList({ onFail: p.onFail }),
        [workspaceStore.fetchList]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchList />));
    expect(workspaceStore!.workspaceIds).toHaveLength(0);

    // render again with fail-callback
    const markFail = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchList onFail={markFail} />));
    expect(markFail).toHaveBeenCalledTimes(1);
  });

  test("successful fetchWorkspace", async () => {
    // mock fetch-API
    const workspace = { id: "ws0", name: "workspace 0" };
    jest.spyOn(global, "fetch").mockImplementation(
      jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(workspace),
        })
      ) as jest.Mock
    );

    // setup workspaceStore and dummy-component
    let workspaceStore: WorkspaceStore;
    function FetchWorkspace(p: { onSuccess?: () => void }) {
      workspaceStore = useGlobalStore((state) => state.workspace);
      useEffect(
        () =>
          workspaceStore.fetchWorkspace({
            workspaceId: workspace.id,
            onSuccess: p.onSuccess,
          }),
        [workspaceStore.fetchWorkspace]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchWorkspace />));
    expect(Object.keys(workspaceStore!.workspaces)).toEqual([workspace.id]);
    expect(Object.values(workspaceStore!.workspaces)).toEqual([workspace]);

    // render again with success-callback
    const markSuccess = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchWorkspace onSuccess={markSuccess} />));
    expect(markSuccess).toHaveBeenCalledTimes(1);
  });

  test("fail fetchWorkspace", async () => {
    // mock fetch-API
    jest
      .spyOn(global, "fetch")
      .mockImplementation(
        jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock
      );

    // setup workspaceStore and dummy-component
    let workspaceStore: WorkspaceStore;
    function FetchWorkspace(p: { onFail?: () => void }) {
      workspaceStore = useGlobalStore((state) => state.workspace);
      useEffect(
        () =>
          workspaceStore.fetchWorkspace({
            workspaceId: "some-id",
            onFail: p.onFail,
          }),
        [workspaceStore.fetchWorkspace]
      );
      return <></>;
    }

    // render and eval
    await act(() => render(<FetchWorkspace />));
    expect(Object.keys(workspaceStore!.workspaces)).toHaveLength(0);

    // render again with fail-callback
    const markFail = jest.fn().mockResolvedValue(undefined);
    await act(() => render(<FetchWorkspace onFail={markFail} />));
    expect(markFail).toHaveBeenCalledTimes(1);
  });
});
