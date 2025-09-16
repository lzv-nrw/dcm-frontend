import { act } from "react";
import { MemoryRouter, Routes, Route } from "react-router";
import {
  render,
  waitFor,
  fireEvent,
  RenderResult,
} from "@testing-library/react";
import "@testing-library/jest-dom";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import TemplatesScreen from "./TemplatesScreen";

beforeEach(() => {
  jest.restoreAllMocks();
  useGlobalStore.setState(useGlobalStore.getInitialState());
});

test("should render the template title", async () => {
  // render
  const view = await act(() => render(<TemplatesScreen />));

  // assert
  expect(view.getByText(t("Templates"))).toBeInTheDocument();
});

test("should render the new template button", async () => {
  // render
  const view = await act(() => render(<TemplatesScreen />));

  // assert
  expect(
    view.getByRole("button", { name: t("Template erstellen") })
  ).toBeInTheDocument();
});

test("should render filter/search/sort", async () => {
  // render
  const view = await act(() => render(<TemplatesScreen />));

  // assert
  expect(view.getByLabelText(t("Filtern nach"))).toBeInTheDocument();
  expect(view.getByPlaceholderText(t("Suche nach"))).toBeInTheDocument();
  expect(view.getByLabelText(t("Sortieren nach"))).toBeInTheDocument();
});

test("shows error if fetch fails", async () => {
  // render
  const view = await act(() => render(<TemplatesScreen />));

  // assert
  await waitFor(() => expect(view.queryByRole("alert")).toBeInTheDocument());
});

test("shows no error if fetch successful", async () => {
  // mock API
  jest.spyOn(global, "fetch").mockImplementation(
    jest.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: () => {
          if (url.endsWith("api/admin/templates"))
            return Promise.resolve(["t0"]);
          if (url.endsWith("api/admin/template/hotfolders"))
            return Promise.resolve([]);
          if (url.endsWith("api/admin/template?id=t0"))
            return Promise.resolve({
              id: "t0",
              name: "template 0",
              type: "plugin",
              additionalInformation: { plugin: "", args: {} },
            });
          if (url.endsWith("api/admin/workspaces")) return Promise.resolve([]);
        },
      })
    ) as jest.Mock
  );

  // render
  const view = await act(() => render(<TemplatesScreen />));

  // assert
  await waitFor(() => expect(view.queryByRole("alert")).toBeNull());
  expect(view.getByText("template 0")).toBeInTheDocument();
});

test("open new template modal", async () => {
  // render
  const view = await act(() => render(<TemplatesScreen />));

  // open modal
  fireEvent.click(view.getByText(t("Template erstellen")));
  await new Promise(process.nextTick);

  // assert
  expect(view.getByText(t("Neues Template erstellen"))).toBeInTheDocument();
});

test("filter table", async () => {
  // mock store
  useGlobalStore.setState((state) => ({
    template: {
      ...state.template,
      templates: {
        t0: {
          status: "ok",
          id: "t0",
          name: "template 0",
          type: "plugin",
          additionalInformation: { plugin: "demo", args: { arg0: "value0" } },
        },
        t1: {
          status: "ok",
          id: "t1",
          name: "template 1",
          type: "hotfolder",
          additionalInformation: { sourceId: "some-id" },
        },
      },
    },
    workspace: {
      ...state.workspace,
      workspaces: {
        ws0: {
          id: "ws0",
          name: "workspace 0",
          templates: ["t0"],
        },
      },
    },
  }));

  // render
  const view = await act(() => render(<TemplatesScreen />));
  expect(view.getByDisplayValue(t("Arbeitsbereich"))).toBeTruthy();

  // two templates
  expect(view.getAllByTestId("flowbite-card")).toHaveLength(2);
  expect(view.queryByText("template 0")).toBeTruthy();
  expect(view.queryByText("template 1")).toBeTruthy();
  // disabled and one filter-option
  expect(view.getByDisplayValue(t("Arbeitsbereich")).children).toHaveLength(2);

  // select filter
  fireEvent.change(view.getByDisplayValue(t("Arbeitsbereich")), {
    target: { value: "ws0" },
  });

  await new Promise(process.nextTick);

  // now only one template in table
  expect(view.getAllByTestId("flowbite-card")).toHaveLength(1);
  expect(view.queryByText("template 0")).toBeTruthy();
  expect(view.queryByText("template 1")).toBeFalsy();
});

test.each([
  { searchString: "abc", n: 1 },
  { searchString: "def", n: 1 },
  { searchString: "ghi", n: 0 },
  { searchString: "123", n: 1 },
  { searchString: "hotfolder", n: 1 },
  { searchString: "uvw", n: 1 },
  { searchString: "789", n: 2 },
])("search for TextInput", async ({ searchString, n }) => {
  // mock store
  useGlobalStore.setState((state) => ({
    template: {
      ...state.template,
      templates: {
        t0: {
          status: "ok",
          id: "t0",
          name: "abc",
          description: "123",
          type: "hotfolder",
          additionalInformation: {
            sourceId: "src0",
          },
        },
        t1: {
          status: "ok",
          id: "t1",
          name: "def",
          description: "456",
          type: "plugin",
          additionalInformation: { plugin: "xyz-789", args: {} },
        },
      },
      hotfolders: {
        src0: { id: "src0", name: "hotfolder: uvw-789", mount: "" },
      },
    },
  }));

  // render
  const view = await act(() => render(<TemplatesScreen />));
  expect(view.getByPlaceholderText(t("Suche nach"))).toBeTruthy();

  // two templates
  let cards = view.queryAllByTestId("flowbite-card");
  expect(cards).toHaveLength(2);

  // filter search
  fireEvent.change(view.getByPlaceholderText(t("Suche nach")), {
    target: { value: searchString },
  });

  await new Promise(process.nextTick);

  // now filtered templates
  cards = view.queryAllByTestId("flowbite-card");
  expect(cards).toHaveLength(n);
  if (n === 1)
    expect(cards[0].textContent?.includes(searchString)).toBeTruthy();
});

test("sort table", async () => {
  // mock store
  useGlobalStore.setState((state) => ({
    template: {
      ...state.template,
      templates: {
        t0: {
          status: "ok",
          id: "t0",
          name: "template 0",
          type: "plugin",
          additionalInformation: { plugin: "demo", args: { arg0: "value0" } },
        },
        t1: {
          status: "ok",
          id: "t1",
          name: "template 1",
          type: "hotfolder",
          additionalInformation: { sourceId: "some-id" },
        },
      },
    },
  }));

  // render
  const view = await act(() => render(<TemplatesScreen />));
  expect(view.getByDisplayValue(t("Titel"))).toBeTruthy();

  // two templates
  let rows = view.getAllByTestId("flowbite-card");
  expect(rows).toHaveLength(2);
  expect(rows[0].textContent?.includes("template 0")).toBeTruthy();
  expect(rows[1].textContent?.includes("template 1")).toBeTruthy();

  // change order
  fireEvent.change(view.getByDisplayValue(t("Titel")), {
    target: { value: "type" },
  });

  await new Promise(process.nextTick);

  // now reversed order in list
  rows = view.getAllByTestId("flowbite-card");
  expect(rows).toHaveLength(2);
  expect(rows[1].textContent?.includes("template 0")).toBeTruthy();
  expect(rows[0].textContent?.includes("template 1")).toBeTruthy();
});

test.each([
  { acl: {}, redirect: true },
  { acl: { VIEW_SCREEN_TEMPLATES: false }, redirect: true },
  { acl: { VIEW_SCREEN_TEMPLATES: true }, redirect: false },
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
      <MemoryRouter initialEntries={["/templates"]}>
        <Routes>
          <Route path="/" element={"Redirected"} />
          <Route path="/templates" element={<TemplatesScreen useACL />} />
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
    acl: { VIEW_SCREEN_TEMPLATES: true, CREATE_TEMPLATE: true },
    assert: (view: RenderResult) => {
      expect(view.getByText(t("Template erstellen"))).toBeInTheDocument();
    },
  },
  {
    acl: { VIEW_SCREEN_TEMPLATES: true, CREATE_TEMPLATE: false },
    assert: (view: RenderResult) => {
      expect(view.queryByText(t("Template erstellen"))).toBeNull();
    },
  },
  {
    acl: { VIEW_SCREEN_TEMPLATES: true, READ_TEMPLATE: true },
    assert: (view: RenderResult) => {
      expect(view.getByTestId("flowbite-card")).toBeInTheDocument();
      expect(
        view.queryByText(t("Kein Lese-Zugriff auf Templatekonfigurationen."))
      ).toBeNull();
    },
  },
  {
    acl: { VIEW_SCREEN_TEMPLATES: true, READ_TEMPLATE: false },
    assert: (view: RenderResult) => {
      expect(view.queryByTestId("flowbite-card")).toBeNull();
      expect(
        view.getByText(t("Kein Lese-Zugriff auf Templatekonfigurationen."))
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
    template: {
      ...state.template,
      templates: {
        t0: {
          status: "ok",
          id: "t0",
          name: "",
          type: "plugin",
          additionalInformation: { plugin: "demo", args: { arg0: "value0" } },
        },
      },
    },
  }));
  // render
  const view = await act(() =>
    render(
      <MemoryRouter>
        <TemplatesScreen useACL />
      </MemoryRouter>
    )
  );

  // assert
  assert(view);
});
