import { render } from "@testing-library/react";
import { Table } from "flowbite-react";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import {
  LastnameCell,
  FirstnameCell,
  EMailCell,
  GroupsCell,
  UsernameCell,
} from "./TableCells";

beforeEach(() => {
  jest.restoreAllMocks();
  useGlobalStore.setState(useGlobalStore.getInitialState());
});

test("lastname-cell renders header", () => {
  const cell = render(
    <Table>
      <Table.Head>
        <LastnameCell />
      </Table.Head>
    </Table>
  );
  expect(cell.getByText(t("Nachname"))).toBeTruthy();
});

test("lastname-cell renders cell", () => {
  const cell = render(
    <Table>
      <Table.Body>
        <LastnameCell user={{ id: "", username: "", lastname: "some name" }} />
      </Table.Body>
    </Table>
  );
  expect(cell.getByText("some name")).toBeTruthy();
});

test("firstname-cell renders header", () => {
  const cell = render(
    <Table>
      <Table.Head>
        <FirstnameCell />
      </Table.Head>
    </Table>
  );
  expect(cell.getByText(t("Vorname"))).toBeTruthy();
});

test("firstname-cell renders cell", () => {
  const cell = render(
    <Table>
      <Table.Body>
        <FirstnameCell
          user={{ id: "", username: "", firstname: "some name" }}
        />
      </Table.Body>
    </Table>
  );
  expect(cell.getByText("some name")).toBeTruthy();
});

test("email-cell renders header", () => {
  const cell = render(
    <Table>
      <Table.Head>
        <EMailCell />
      </Table.Head>
    </Table>
  );
  expect(cell.getByText(t("E-Mail"))).toBeTruthy();
});

test("email-cell renders cell", () => {
  const cell = render(
    <Table>
      <Table.Body>
        <EMailCell
          user={{ id: "", username: "", email: "some@email.domain" }}
        />
      </Table.Body>
    </Table>
  );
  expect(cell.getByText("some@email.domain")).toBeTruthy();
});

test("groups-cell renders header", () => {
  const cell = render(
    <Table>
      <Table.Head>
        <GroupsCell />
      </Table.Head>
    </Table>
  );
  expect(cell.getByText(t("Rollen"))).toBeTruthy();
});

test("groups-cell renders cell", () => {
  // mock store contents
  useGlobalStore.setState((state) => ({
    permission: {
      ...state.permission,
      groups: [
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
    workspace: {
      ...state.workspace,
      workspaceIds: ["ws0", "ws1"],
      workspaces: {
        ws0: { id: "ws0", name: "workspace 0" },
        ws1: { id: "ws1", name: "workspace 1" },
      },
    },
  }));
  const cell = render(
    <Table>
      <Table.Body>
        <GroupsCell
          user={{
            id: "",
            username: "",
            groups: [
              { id: "admin" },
              { id: "admin" },
              { id: "curator", workspace: "ws0" },
              { id: "curator", workspace: "ws1" },
            ],
          }}
        />
      </Table.Body>
    </Table>
  );
  expect(cell.getByText("Administrator")).toBeTruthy();
  expect(cell.getAllByText("Administrator").length === 1).toBeTruthy();
  expect(cell.getByText("Datenkurator: workspace 0, workspace 1")).toBeTruthy();
});

test("username-cell renders header", () => {
  const cell = render(
    <Table>
      <Table.Head>
        <UsernameCell />
      </Table.Head>
    </Table>
  );
  expect(cell.getByText(t("Benutzername"))).toBeTruthy();
});

test("username-cell renders cell", () => {
  const cell = render(
    <Table>
      <Table.Body>
        <UsernameCell user={{ id: "", username: "some username" }} />
      </Table.Body>
    </Table>
  );
  expect(cell.getByText("some username")).toBeTruthy();
});
