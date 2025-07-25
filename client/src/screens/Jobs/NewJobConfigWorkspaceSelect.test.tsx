import { act } from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import NewJobConfigWorkspaceSelect from "./NewJobConfigWorkspaceSelect";

beforeEach(() => {
  jest.restoreAllMocks();
  useGlobalStore.setState(useGlobalStore.getInitialState());
  useGlobalStore.setState((state) => ({
    workspace: {
      ...state.workspace,
      workspaces: {
        w0: { id: "w0", name: "abc" },
        w1: { id: "w1", name: "def" },
      },
    },
  }));
});

test("renders header and inputs", async () => {
  const selectDisplay = await act(() =>
    render(<NewJobConfigWorkspaceSelect />)
  );

  expect(
    selectDisplay.getByText(
      t("In welchem Arbeitsbereich soll der Job angelegt werden?")
    )
  ).toBeInTheDocument();

  expect(selectDisplay.getByText("abc")).toBeInTheDocument();
  expect(selectDisplay.getByText("def")).toBeInTheDocument();
});

test("calls onSelect-callback", async () => {
  const mockOnSelect = jest.fn();
  const selectDisplay = await act(() =>
    render(<NewJobConfigWorkspaceSelect onSelect={mockOnSelect} />)
  );

  fireEvent.click(selectDisplay.getByText("abc"));

  expect(mockOnSelect).toHaveBeenCalledWith({
    id: "w0",
    name: "abc",
  });
});
test("check selected workspace", async () => {
  const selectDisplay = await act(() =>
    render(<NewJobConfigWorkspaceSelect />)
  );

  const workspaceBlock = selectDisplay.getByText("abc");
  fireEvent.click(workspaceBlock);

  const firstParent = workspaceBlock.closest(".border-cyan-700");

  expect(firstParent).not.toBeNull();
});
