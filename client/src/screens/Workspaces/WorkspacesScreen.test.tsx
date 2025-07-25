import { act } from "react";
import { MemoryRouter, Routes, Route } from "react-router";
import { render, fireEvent, RenderResult } from "@testing-library/react";
import "@testing-library/jest-dom";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import WorkspacesScreen from "./WorkspacesScreen";

beforeEach(() => {
  jest.restoreAllMocks();
  useGlobalStore.setState(useGlobalStore.getInitialState());
});

test("renders without crashing", async () => {
  await act(() => render(<WorkspacesScreen />));
});

test("shows the expected elements", async () => {
  const workspaces = await act(() => render(<WorkspacesScreen />));

  let button = workspaces.getByRole("button", {
    name: t("Arbeitsbereich erstellen"),
  });
  expect(button).toBeInTheDocument();
  expect(button).toBeInstanceOf(HTMLButtonElement);
  expect(workspaces.getByText(t("Arbeitsbereiche"))).toBeInTheDocument();
});

test("shows modal for new workspaces", async () => {
  // render
  const workspaces = await act(() => render(<WorkspacesScreen />));

  // open dialog
  fireEvent.click(
    workspaces.getByRole("button", {
      name: t("Arbeitsbereich erstellen"),
    })
  );
  await new Promise(process.nextTick);

  // assert
  expect(
    Object.keys(workspaces.getAllByText(t("Arbeitsbereich erstellen")))
  ).toHaveLength(2);
  expect(workspaces.getByText(t("Titel*"))).toBeInTheDocument();
});

test("load data from API", async () => {
  const workspaceIds = ["ws0", "ws1"];
  const workspaceData = {
    ws0: { name: "workspace 0" },
    ws1: { name: "workspace 1" },
  };
  // mock API
  jest.spyOn(global, "fetch").mockImplementation(
    jest.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: () => {
          if (url.endsWith("api/admin/workspaces"))
            return Promise.resolve(workspaceIds);
          else if (url.endsWith("api/admin/workspace?id=ws0"))
            return Promise.resolve(workspaceData.ws0);
          else if (url.endsWith("api/admin/workspace?id=ws1"))
            return Promise.resolve(workspaceData.ws1);
          else if (url.endsWith("api/admin/users")) return Promise.resolve([]);
          else if (url.endsWith("api/admin/templates"))
            return Promise.resolve([]);
          return Promise.resolve(null);
        },
      })
    ) as jest.Mock
  );

  // render
  const workspaces = await act(() => render(<WorkspacesScreen />));

  // open dialog
  fireEvent.click(
    workspaces.getByRole("button", {
      name: t("Arbeitsbereich erstellen"),
    })
  );
  await new Promise(process.nextTick);

  // assert
  expect(workspaces.queryByText(workspaceData.ws0.name)).toBeInTheDocument();
  expect(workspaces.queryByText(workspaceData.ws1.name)).toBeInTheDocument();
});

test.each([
  { acl: {}, redirect: true },
  { acl: { VIEW_SCREEN_WORKSPACES: false }, redirect: true },
  { acl: { VIEW_SCREEN_WORKSPACES: true }, redirect: false },
])("redirect if not allowed", async ({ acl, redirect }) => {
  // mock store
  useGlobalStore.setState((state) => ({
    session: {
      ...state.session,
      acl: acl,
    },
  }));
  // render
  const view = await act(() =>
    render(
      <MemoryRouter initialEntries={["/workspaces"]}>
        <Routes>
          <Route path="/" element={"Redirected"} />
          <Route path="/workspaces" element={<WorkspacesScreen useACL />} />
        </Routes>
      </MemoryRouter>
    )
  );

  // assert
  if (redirect) expect(view.getByText("Redirected")).toBeInTheDocument();
  else expect(view.queryByText("Redirected")).toBeNull();
});

test.each([
  {
    acl: { VIEW_SCREEN_WORKSPACES: true, CREATE_WORKSPACE: true },
    assert: (view: RenderResult) => {
      expect(view.getByText(t("Arbeitsbereich erstellen"))).toBeInTheDocument();
    },
  },
  {
    acl: { VIEW_SCREEN_WORKSPACES: true, CREATE_WORKSPACE: false },
    assert: (view: RenderResult) => {
      expect(view.queryByText(t("Arbeitsbereich erstellen"))).toBeNull();
    },
  },
  {
    acl: { VIEW_SCREEN_WORKSPACES: true, READ_WORKSPACE: true },
    assert: (view: RenderResult) => {
      expect(view.getByTestId("flowbite-card")).toBeInTheDocument();
      expect(
        view.queryByText(
          t("Kein Lese-Zugriff auf Arbeitsbereichkonfigurationen.")
        )
      ).toBeNull();
    },
  },
  {
    acl: { VIEW_SCREEN_WORKSPACES: true, READ_WORKSPACE: false },
    assert: (view: RenderResult) => {
      expect(view.queryByTestId("flowbite-card")).toBeNull();
      expect(
        view.getByText(
          t("Kein Lese-Zugriff auf Arbeitsbereichkonfigurationen.")
        )
      ).toBeInTheDocument();
    },
  },
])("hide UI if useACL", async ({ acl, assert }) => {
  // mock store
  useGlobalStore.setState((state) => ({
    session: {
      ...state.session,
      acl: acl,
    },
    workspace: {
      ...state.workspace,
      workspaces: { ws0: { id: "ws0", name: "" } },
    },
  }));

  // render
  const view = await act(() =>
    render(
      <MemoryRouter>
        <WorkspacesScreen useACL />
      </MemoryRouter>
    )
  );

  // assert
  assert(view);
});
