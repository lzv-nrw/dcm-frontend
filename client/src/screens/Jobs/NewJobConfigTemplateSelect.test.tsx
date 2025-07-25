import { act } from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import NewJobConfigTemplateSelect from "./NewJobConfigTemplateSelect";

beforeEach(() => {
  jest.restoreAllMocks();
  useGlobalStore.setState(useGlobalStore.getInitialState());
  useGlobalStore.setState((state) => ({
    template: {
      ...state.template,
      templates: {
        t0: {
          status: "ok" as "ok",
          id: "t0",
          name: "template 0",
          description: "demo",
          type: "plugin",
          additionalInformation: { plugin: "demo", args: { arg0: "value0" } },
        },
        t1: {
          status: "ok" as "ok",
          id: "t1",
          name: "template 1",
          type: "plugin",
          additionalInformation: { plugin: "demo", args: { arg0: "value1" } },
        },
      },
    },
  }));
});

test("renders header and inputs", async () => {
  const selectDisplay = render(
    <NewJobConfigTemplateSelect
      workspace={{ id: "ws0", name: "workspace 0", templates: ["t0"] }}
    />
  );

  expect(
    selectDisplay.getByText(
      t("Bitte wählen Sie ein Template für Ihren Job aus")
    )
  ).toBeInTheDocument();

  expect(selectDisplay.getByText("template 0")).toBeInTheDocument();
});

test("calls onSelect-callback", async () => {
  const mockOnSelect = jest.fn();
  const selectDisplay = await act(() =>
    render(
      <NewJobConfigTemplateSelect
        workspace={{ id: "ws0", name: "workspace 0", templates: ["t0"] }}
        onSelect={mockOnSelect}
      />
    )
  );

  fireEvent.click(selectDisplay.getByText("template 0"));

  expect(mockOnSelect).toHaveBeenCalledWith({
    status: "ok",
    id: "t0",
    name: "template 0",
    description: "demo",
    type: "plugin",
    additionalInformation: { plugin: "demo", args: { arg0: "value0" } },
  });
});
