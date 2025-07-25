import { act } from "react";
import { render, fireEvent, RenderResult } from "@testing-library/react";
import "@testing-library/jest-dom";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import { User, Template, Workspace } from "../../types";
import WorkspaceDisplay from "./WorkspaceDisplay";

const demoUser: User = {
  id: "0",
  username: "user0",
  firstname: "Pete",
  lastname: "Programmer",
  email: "pete@lzv.nrw",
};
const demoTemplate: Template = {
  status: "ok",
  id: "t0",
  name: "Template 0",
  type: "plugin",
  additionalInformation: { plugin: "", args: {} },
};
const demoWorkspace: Workspace = {
  id: "ws0",
  name: "Workspace 0",
  templates: [],
  users: [],
};

function MinimalDisplayWithStore({ useACL = false }: { useACL?: boolean }) {
  const workspace = useGlobalStore(
    (state) => state.workspace.workspaces[demoWorkspace.id]
  );
  return <WorkspaceDisplay workspace={workspace} useACL={useACL} />;
}

beforeEach(() => {
  jest.restoreAllMocks();
  useGlobalStore.setState(useGlobalStore.getInitialState());
  useGlobalStore.setState((state) => ({
    user: {
      ...state.user,
      users: {
        [demoUser.id]: demoUser,
        dummy: {
          id: "dummy",
          username: "dummy",
          firstname: "dummy",
          lastname: "dummy",
        },
      },
    },
    template: {
      ...state.template,
      templates: {
        [demoTemplate.id!]: demoTemplate,
        dummy: {
          status: "ok",
          id: "dummy",
          name: "dummy",
          type: "plugin",
          additionalInformation: { plugin: "", args: {} },
        },
      },
    },
    workspace: {
      ...state.workspace,
      workspaces: { [demoWorkspace.id]: demoWorkspace },
    },
  }));
  // mock API
  let workspaces = { ws0: demoWorkspace };
  jest.spyOn(global, "fetch").mockImplementation(
    jest.fn((url: string, options) => {
      if (url.endsWith("api/admin/workspace") && options.method === "PUT") {
        workspaces.ws0 = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
        });
      }
      if (
        url.includes("api/admin/workspace") &&
        (options.method === "GET" || options.method === undefined)
      ) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(workspaces.ws0),
        });
      }
      return Promise.resolve({
        ok: false,
      });
    }) as jest.Mock
  );
});

test("renders without crashing", async () => {
  await act(() => render(<MinimalDisplayWithStore />));
});

test("shows the expected elements", async () => {
  const display = await act(() => render(<MinimalDisplayWithStore />));

  expect(display.getByText(demoWorkspace.name)).toBeInTheDocument();
  expect(display.queryByText(demoTemplate.name!)).toBeNull();
  expect(display.queryByText(demoUser.firstname!)).toBeNull();
  expect(display.getByText(t("Templates"))).toBeInTheDocument();
  expect(display.getByText(t("Nutzer"))).toBeInTheDocument();
  expect(display.getAllByText("+")).toHaveLength(2);
});

test("add template to workspace", async () => {
  const display = await act(() => render(<MinimalDisplayWithStore />));

  const templateBtn = display.getAllByText("+")[0];
  expect(
    templateBtn.compareDocumentPosition(display.getByText(t("Templates")))
  ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
  expect(
    templateBtn.compareDocumentPosition(display.getByText(t("Nutzer")))
  ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

  // open menu ...
  fireEvent.click(templateBtn);
  await new Promise(process.nextTick);
  expect(display.getByText(demoTemplate.name!)).toBeInTheDocument();

  // ... and add template
  fireEvent.click(display.getByText(demoTemplate.name!));
  await new Promise(process.nextTick);

  // assert
  expect(display.queryByText("dummy")).toBeNull(); // menu closed
});

test("add user to workspace", async () => {
  const display = await act(() => render(<MinimalDisplayWithStore />));

  const userBtn = display.getAllByText("+")[1];
  expect(
    userBtn.compareDocumentPosition(display.getByText(t("Templates")))
  ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
  expect(userBtn.compareDocumentPosition(display.getByText(t("Nutzer")))).toBe(
    Node.DOCUMENT_POSITION_PRECEDING
  );

  // open modal
  fireEvent.click(userBtn);
  await new Promise(process.nextTick);
  expect(display.getByText(t("Nutzer hinzufügen"))).toBeInTheDocument();
});

test.each([
  {
    acl: { MODIFY_USERCONFIG: true, MODIFY_TEMPLATE: true },
    assert: (display: RenderResult) => {
      expect(display.getAllByText("+")).toHaveLength(2);
    },
  },
  {
    acl: { MODIFY_USERCONFIG: true },
    assert: (display: RenderResult) => {
      expect(display.getAllByText("+")).toHaveLength(1);
    },
  },
  {
    acl: { MODIFY_TEMPLATE: true },
    assert: (display: RenderResult) => {
      expect(display.getAllByText("+")).toHaveLength(1);
    },
  },
  {
    acl: { MODIFY_WORKSPACE: false },
    assert: (display: RenderResult) => {
      expect(display.queryAllByText("+")).toHaveLength(0);
    },
  },
])("hide UI if useACL", async ({ acl, assert }) => {
  // mock store
  useGlobalStore.setState((state) => ({
    session: { ...state.session, acl: acl },
  }));

  // render
  const display = await act(() => render(<MinimalDisplayWithStore useACL />));

  // assert
  assert(display);
});
