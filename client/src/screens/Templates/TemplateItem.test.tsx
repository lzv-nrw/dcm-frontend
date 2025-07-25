import { act } from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";

import { PluginTemplateInfo, Template } from "../../types";
import TemplateItem from "./TemplateItem";

describe("Render templateItem correctly", () => {
  jest.restoreAllMocks();
  const template: Template = {
    status: "ok",
    id: "a",
    name: "Template 1",
    description: "Beschreibung für Template 1",
    type: "plugin",
    additionalInformation: {
      plugin: "demo",
      args: { arg0: "value0" },
    },
  };

  test("renders the template name, description, type", async () => {
    const view = await act(() => render(<TemplateItem template={template} />));

    expect(view.getByText(template?.name!)).toBeInTheDocument();
    expect(
      view.getByText(
        (template.additionalInformation as PluginTemplateInfo).plugin!,
        { exact: false }
      )
    ).toBeInTheDocument();
    expect(view.getByText(template.description!)).toBeInTheDocument();
  });
});
