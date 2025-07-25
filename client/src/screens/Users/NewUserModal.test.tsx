import { act } from "react";
import { render, fireEvent } from "@testing-library/react";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import { host, credentialsValue } from "../../App";
import NewUserModal from "./NewUserModal";

beforeEach(() => {
  jest.clearAllMocks();
  useGlobalStore.setState(useGlobalStore.getInitialState());
});

test("renders without crashing", async () => {
  await act(() => render(<NewUserModal show={true} />));
});

test("hidden if not shown", async () => {
  const modal = await act(() => render(<NewUserModal show={false} />));

  expect(modal.queryByText(t("Benutzername*"))).toBeNull();
});

test("shows the expected inputs", async () => {
  const modal = await act(() => render(<NewUserModal show={true} />));

  let element = modal.getByLabelText(t("Benutzername*"));
  expect(element).toBeTruthy();
  expect(element).toBeInstanceOf(HTMLInputElement);
  element = modal.getByLabelText(t("Vorname*"));
  expect(element).toBeTruthy();
  expect(element).toBeInstanceOf(HTMLInputElement);
  element = modal.getByLabelText(t("Nachname*"));
  expect(element).toBeTruthy();
  expect(element).toBeInstanceOf(HTMLInputElement);
  element = modal.getByLabelText(t("E-Mail*"));
  expect(element).toBeTruthy();
  expect(element).toBeInstanceOf(HTMLInputElement);
  expect(modal.getByText(t("Rollen"))).toBeTruthy();
});

test("shows alert on bad inputs", async () => {
  const modal = await act(() => render(<NewUserModal show={true} />));

  fireEvent.click(modal.getByText(t("Anlegen")));

  await new Promise(process.nextTick);

  expect(
    modal.getByText(t("Bitte füllen Sie alle erforderlichen Felder aus."))
  ).toBeTruthy();
});

test("submits form for good enough inputs", async () => {
  // mock store contents
  useGlobalStore.setState((state) => ({
    permission: {
      ...state.permission,
      groups: [
        {
          id: "g0",
          name: "group 0",
          workspaces: true,
        },
      ],
    },
    workspace: {
      ...state.workspace,
      workspaceIds: ["ws0"],
      workspaces: { ws0: { id: "ws0", name: "workspace 0" } },
    },
  }));
  // mock API
  const userConfig = {
    username: "user0",
    firstname: "firstname",
    lastname: "lastname",
    email: "test@lzv.nrw",
    groups: [{ id: "g0" }, { id: "g0", workspace: "ws0" }],
  };
  const fetchMock = jest.fn((url: string) => {
    // posting user
    if (url.endsWith("api/admin/user"))
      return Promise.resolve({
        ok: true,
        status: 200,
      });
    // fetch users
    if (url.endsWith("api/admin/permissions/groups"))
      return Promise.resolve({
        ok: true,
        json: Promise.resolve([]),
      });
    // anything else
    return Promise.resolve({
      ok: false,
      status: 500,
    });
  }) as jest.Mock;
  jest.spyOn(global, "fetch").mockImplementation(fetchMock);

  // render
  const modal = await act(() => render(<NewUserModal show={true} />));

  // fill in form
  fireEvent.change(modal.getByLabelText(t("Benutzername*")), {
    target: { value: userConfig.username },
  });
  fireEvent.blur(modal.getByLabelText(t("Benutzername*")));
  fireEvent.change(modal.getByLabelText(t("Vorname*")), {
    target: { value: userConfig.firstname },
  });
  fireEvent.blur(modal.getByLabelText(t("Vorname*")));
  fireEvent.change(modal.getByLabelText(t("Nachname*")), {
    target: { value: userConfig.lastname },
  });
  fireEvent.blur(modal.getByLabelText(t("Nachname*")));
  fireEvent.change(modal.getByLabelText(t("E-Mail*")), {
    target: { value: userConfig.email },
  });
  fireEvent.blur(modal.getByLabelText(t("E-Mail*")));
  // group without workspace
  fireEvent.click(modal.getByText(t("Hinzufügen")));
  // group with workspace
  fireEvent.change(modal.getByDisplayValue(t("Keine Zuordnung")), {
    target: { value: "ws0" },
  });
  fireEvent.click(modal.getByText(t("Hinzufügen")));
  fireEvent.click(modal.getByText(t("Anlegen")));
  await new Promise(process.nextTick);

  // assert
  expect(
    modal.queryByText(t("Bitte füllen Sie alle erforderlichen Felder aus."))
  ).toBeNull();
  expect(fetchMock).toBeCalledTimes(2);
  expect(fetchMock).toBeCalledWith(host + "/api/admin/user", {
    method: "POST",
    credentials: credentialsValue,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userConfig),
  });
});
