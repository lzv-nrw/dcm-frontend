import { act } from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import t from "../../utils/translation";
import GroupMembershipInput from "./GroupMembershipInput";

test("renders without crashing", async () => {
  await act(() => render(<GroupMembershipInput groups={[]} workspaces={[]} />));
});

test("shows the expected inputs", async () => {
  const input = await act(() =>
    render(
      <GroupMembershipInput
        groups={[
          { id: "g0", name: "group 0", workspaces: false },
          { id: "g1", name: "group 1", workspaces: true },
        ]}
        workspaces={[
          { id: "ws0", name: "workspace 0" },
          { id: "ws1", name: "workspace 1" },
        ]}
      />
    )
  );

  expect(input.getAllByRole("option")).toHaveLength(5);
  expect(input.queryByText("group 0")).toBeInTheDocument();
  expect(input.queryByText("group 1")).toBeInTheDocument();
  expect(input.queryByText(t("Keine Zuordnung"))).toBeInTheDocument();
  expect(input.queryByText("workspace 0")).toBeInTheDocument();
  expect(input.queryByText("workspace 1")).toBeInTheDocument();
  expect(input.queryByText(t("Hinzufügen"))).toBeInTheDocument();
});

test("workspace select is disabled for certain groups", async () => {
  const input = await act(() =>
    render(
      <GroupMembershipInput
        groups={[
          { id: "g0", name: "group 0", workspaces: false },
          { id: "g1", name: "group 1", workspaces: true },
        ]}
        workspaces={[
          { id: "ws0", name: "workspace 0" },
          { id: "ws1", name: "workspace 1" },
        ]}
      />
    )
  );

  // assert initial state (disabled)
  expect(input.getByDisplayValue(t("Keine Zuordnung"))).toBeDisabled();

  // change group
  fireEvent.change(input.getByDisplayValue(t("group 0")), {
    target: { value: "g1" },
  });
  await new Promise(process.nextTick);

  // assert select now enabled
  expect(input.getByDisplayValue(t("Keine Zuordnung"))).not.toBeDisabled();
});

test("add/remove group memberships", async () => {
  // render
  const onChange = jest.fn();
  const input = await act(() =>
    render(
      <GroupMembershipInput
        groups={[{ id: "g0", name: "group 0", workspaces: true }]}
        workspaces={[{ id: "ws0", name: "workspace 0" }]}
        onChange={onChange}
      />
    )
  );

  // click to add (without workspace)
  fireEvent.click(input.getByText(t("Hinzufügen")));
  await new Promise(process.nextTick);

  // assert
  expect(onChange).toBeCalledTimes(2);
  expect(onChange).toBeCalledWith([]);
  expect(onChange).toBeCalledWith([{ id: "g0" }]);
  expect(input.queryAllByDisplayValue("group 0")).toHaveLength(2);
  expect(input.queryByDisplayValue("workspace 0")).not.toBeInTheDocument(); // no textinput and option invisible

  // click to remove
  fireEvent.click(input.getByText(t("Entfernen")));
  await new Promise(process.nextTick);

  // assert
  expect(onChange).toBeCalledTimes(3);
  expect(onChange).toBeCalledWith([]);
  expect(input.getAllByDisplayValue("group 0")).toHaveLength(1);

  // select workspace and add again
  fireEvent.change(input.getByDisplayValue(t("Keine Zuordnung")), {
    target: { value: "ws0" },
  });
  fireEvent.click(input.getByText(t("Hinzufügen")));
  await new Promise(process.nextTick);

  // assert
  expect(onChange).toBeCalledTimes(4);
  expect(onChange).toBeCalledWith([{ id: "g0", workspace: "ws0" }]);
  expect(input.getAllByDisplayValue("group 0")).toHaveLength(2);
  expect(input.getAllByDisplayValue("workspace 0")).toHaveLength(2); // now textinput and also option
});
