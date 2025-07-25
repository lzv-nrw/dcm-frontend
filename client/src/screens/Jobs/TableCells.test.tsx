import { render } from "@testing-library/react";
import { Table } from "flowbite-react";
import "@testing-library/jest-dom";

import t from "../../utils/translation";
import { StatusCell, IdCell } from "./TableCells";

describe("StatusCell", () => {
  test("status-cell renders header", () => {
    const cell = render(
      <Table>
        <Table.Head>
          <StatusCell />
        </Table.Head>
      </Table>
    );
    expect(cell.getByText(t("Status"))).toBeInTheDocument();
  });

  test("status-cell renders cell", () => {
    const cell = render(
      <Table>
        <Table.Body>
          <StatusCell config={{ id: "", status: "draft" }} />
        </Table.Body>
      </Table>
    );
    expect(cell.getByText(t("Entwurf"))).toBeInTheDocument();
  });
});

describe("IdCell", () => {
  test("id-cell renders header", () => {
    const cell = render(
      <Table>
        <Table.Head>
          <IdCell />
        </Table.Head>
      </Table>
    );
    expect(cell.getByText(t("ID"))).toBeInTheDocument();
  });

  test("id-cell renders cell", () => {
    const cell = render(
      <Table>
        <Table.Body>
          <IdCell config={{ id: "some-id", status: "draft" }} />
        </Table.Body>
      </Table>
    );
    expect(cell.getByText("some-id")).toBeInTheDocument();
  });
});
