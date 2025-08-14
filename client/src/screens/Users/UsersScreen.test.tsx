import { act } from "react";
import { MemoryRouter, Routes, Route } from "react-router";
import {
  render,
  fireEvent,
  waitFor,
  RenderResult,
} from "@testing-library/react";
import "@testing-library/jest-dom";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import UsersScreen from "./UsersScreen";

beforeEach(() => {
  jest.restoreAllMocks();
  useGlobalStore.setState(useGlobalStore.getInitialState());
});

test("renders without crashing", async () => {
  await act(() => render(<UsersScreen />));
});

test("shows error if fetch fails", async () => {
  const view = await act(() => render(<UsersScreen />));
  await waitFor(() => expect(view.queryByRole("alert")).toBeInTheDocument());
});

test("shows no error if fetch successful", async () => {
  // mock API
  jest.spyOn(global, "fetch").mockImplementation(
    jest.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: () => {
          if (url.endsWith("api/admin/workspaces"))
            return Promise.resolve(["ws-0"]);
          if (url.endsWith("api/admin/workspace?id=ws-0"))
            return Promise.resolve({ id: "ws-0", name: "workspace 0" });
          if (url.endsWith("api/admin/users")) return Promise.resolve(["0"]);
          else return Promise.resolve({ userId: "0", firstname: "user 0" });
        },
      })
    ) as jest.Mock
  );

  // render
  const view = await act(() => render(<UsersScreen />));

  // assert
  await waitFor(() => expect(view.queryByRole("alert")).toBeNull());
  expect(view.getByText("user 0")).toBeInTheDocument();
});

test("open new user modal", async () => {
  // render
  const view = await act(() => render(<UsersScreen />));

  // open modal
  expect(view.queryByText(t("Neuen Nutzer erstellen"))).toBeTruthy();
  fireEvent.click(view.getByText(t("Neuen Nutzer erstellen")));
  await new Promise(process.nextTick);

  // assert
  expect(view.queryByLabelText(t("Benutzername*"))).toBeTruthy();
});

test("filter table", async () => {
  // mock store
  useGlobalStore.setState((state) => ({
    user: {
      ...state.user,
      users: {
        user0: {
          id: "user0",
          username: "user0",
          groups: [{ id: "group-0", workspace: "ws0" }],
        },
        user1: {
          id: "user1",
          username: "user1",
          groups: [{ id: "group-1" }],
        },
      },
    },
    workspace: {
      ...state.workspace,
      workspaces: {
        ws0: { id: "ws0", name: "workspace 0" },
      },
    },
  }));

  // render
  const view = await act(() => render(<UsersScreen />));
  expect(view.getByDisplayValue(t("Arbeitsbereich"))).toBeTruthy();

  // two users
  expect(view.getAllByTestId("table-row-element")).toHaveLength(2);
  expect(view.queryByText("user0")).toBeTruthy();
  expect(view.queryByText("user1")).toBeTruthy();
  // disabled and one filter-option
  expect(view.getByDisplayValue(t("Arbeitsbereich")).children).toHaveLength(2);

  // select filter
  fireEvent.change(view.getByDisplayValue(t("Arbeitsbereich")), {
    target: { value: "ws0" },
  });

  await new Promise(process.nextTick);

  // now only one user in table
  expect(view.getAllByTestId("table-row-element")).toHaveLength(1);
  expect(view.queryByText("user0")).toBeTruthy();
  expect(view.queryByText("user1")).toBeFalsy();
});

test.each([
  { searchString: "user0", n: 1 },
  { searchString: "abc", n: 1 },
  { searchString: "123", n: 1 },
  { searchString: "uvw", n: 1 },
  { searchString: "Administrator", n: 1 },
  { searchString: "Datenkurator", n: 1 },
  { searchString: "workspace 0", n: 1 },
  { searchString: "common group", n: 2 },
])("search for TextInput", async ({ searchString, n }) => {
  // mock store
  useGlobalStore.setState((state) => ({
    user: {
      ...state.user,
      users: {
        user0: {
          id: "user0",
          username: "user0",
          firstname: "abc",
          lastname: "123",
          email: "uvw",
          groups: [
            { id: "common" },
            { id: "admin" },
            { id: "curator", workspace: "ws0" },
          ],
        },
        user1: {
          id: "user1",
          username: "user1",
          firstname: "def",
          lastname: "456",
          email: "xyz",
          groups: [{ id: "common" }],
        },
      },
    },
    workspace: {
      ...state.workspace,
      workspaces: { ws0: { id: "ws0", name: "workspace 0" } },
    },
    permission: {
      ...state.permission,
      groups: [
        {
          id: "common",
          name: "common group",
          workspaces: true,
        },
        {
          id: "admin",
          name: "Administrator",
          workspaces: true,
        },
        {
          id: "curator",
          name: "Datenkurator",
          workspaces: true,
        },
      ],
    },
  }));

  // render
  const view = await act(() => render(<UsersScreen />));
  expect(view.getByPlaceholderText(t("Suche nach"))).toBeTruthy();

  // two users
  let rows = view.getAllByTestId("table-row-element");
  expect(rows).toHaveLength(2);

  // filter search
  fireEvent.change(view.getByPlaceholderText(t("Suche nach")), {
    target: { value: searchString },
  });

  await new Promise(process.nextTick);

  // now only one user
  rows = view.getAllByTestId("table-row-element");
  expect(rows).toHaveLength(n);
  expect(rows[0].textContent?.includes(searchString)).toBeTruthy();
});

test("sort table", async () => {
  // mock store
  useGlobalStore.setState((state) => ({
    user: {
      ...state.user,
      users: {
        user0: { id: "user0", username: "user0", lastname: "b" },
        user1: { id: "user1", username: "user1", lastname: "a" },
      },
    },
  }));

  // render
  const view = await act(() => render(<UsersScreen />));
  expect(view.getByDisplayValue(t("Nachname"))).toBeTruthy();

  // two users
  let rows = view.getAllByTestId("table-row-element");
  expect(rows).toHaveLength(2);
  expect(rows[1].textContent?.includes("user0")).toBeTruthy();
  expect(rows[0].textContent?.includes("user1")).toBeTruthy();

  // change order
  fireEvent.change(view.getByDisplayValue(t("Nachname")), {
    target: { value: "username" },
  });

  await new Promise(process.nextTick);

  // now reversed order in table
  rows = view.getAllByTestId("table-row-element");
  expect(rows).toHaveLength(2);
  expect(rows[0].textContent?.includes("user0")).toBeTruthy();
  expect(rows[1].textContent?.includes("user1")).toBeTruthy();
});

test.each([
  { acl: {}, redirect: true },
  { acl: { VIEW_SCREEN_USERCONFIGS: false }, redirect: true },
  { acl: { VIEW_SCREEN_USERCONFIGS: true }, redirect: false },
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
      <MemoryRouter initialEntries={["/users"]}>
        <Routes>
          <Route path="/" element={"Redirected"} />
          <Route path="/users" element={<UsersScreen useACL />} />
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
    acl: { VIEW_SCREEN_USERCONFIGS: true, CREATE_USERCONFIG: true },
    assert: (view: RenderResult) => {
      expect(view.getByText(t("Neuen Nutzer erstellen"))).toBeInTheDocument();
    },
  },
  {
    acl: { VIEW_SCREEN_USERCONFIGS: true, CREATE_USERCONFIG: false },
    assert: (view: RenderResult) => {
      expect(view.queryByText(t("Neuen Nutzer erstellen"))).toBeNull();
    },
  },
  {
    acl: { VIEW_SCREEN_USERCONFIGS: true, READ_USERCONFIG: true },
    assert: (view: RenderResult) => {
      expect(view.queryAllByTestId("table-row-element")).toHaveLength(1);
      expect(
        view.queryByText(t("Kein Lese-Zugriff auf Nutzerkonfigurationen."))
      ).toBeNull();
    },
  },
  {
    acl: { VIEW_SCREEN_USERCONFIGS: true, READ_USERCONFIG: false },
    assert: (view: RenderResult) => {
      expect(view.queryByRole("table")).toBeNull();
      expect(view.queryAllByTestId("table-row-element")).toHaveLength(0);
      expect(
        view.getByText(t("Kein Lese-Zugriff auf Nutzerkonfigurationen."))
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
    user: {
      ...state.user,
      users: { user0: { id: "user0", username: "user0" } },
    },
  }));
  // render
  const view = await act(() =>
    render(
      <MemoryRouter>
        <UsersScreen useACL />
      </MemoryRouter>
    )
  );

  // assert
  assert(view);
});
