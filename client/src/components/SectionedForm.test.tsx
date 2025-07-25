import { act, useState } from "react";
import { render, fireEvent, RenderResult } from "@testing-library/react";
import "@testing-library/jest-dom";

import SectionedForm, { FormSectionComponentProps } from "./SectionedForm";

function SomeFormSection(props: FormSectionComponentProps) {
  return <div>{props.name}</div>;
}

const SECTIONS = [
  {
    tab: 0,
    name: "section 1",
    Component: SomeFormSection,
  },
  {
    tab: 1,
    name: "section 2",
    Component: SomeFormSection,
  },
];

test.each([
  { tab: 0, text: "section 1" },
  { tab: 1, text: "section 2" },
])("shows sections according to tab", async ({ tab, text }) => {
  // render
  const form = await act(() =>
    render(<SectionedForm tab={tab} sections={SECTIONS} />)
  );

  // assert
  expect(form.getByRole("navigation", { name: "Sidebar" })).toBeInTheDocument();
  expect(form.getAllByText(text)).toHaveLength(2);
});

test("changes tab when clicking on navigation", async () => {
  function SectionedFormWrapper() {
    const [tab, setTab] = useState(0);
    return <SectionedForm tab={tab} sections={SECTIONS} setTab={setTab} />;
  }

  // render
  const form = await act(() => render(<SectionedFormWrapper />));

  // assert initial state
  let sec1s = form.getAllByText("section 1");
  expect(sec1s).toHaveLength(2);
  expect(sec1s[1].parentElement).not.toHaveClass("hidden");
  let sec2s = form.getAllByText("section 2");
  expect(sec2s).toHaveLength(2);
  expect(sec2s[1].parentElement).toHaveClass("hidden");

  // click navigation
  fireEvent.click(sec2s[0]);
  await new Promise(process.nextTick);

  // assert final state
  expect(sec1s).toHaveLength(2);
  expect(sec1s[1].parentElement).toHaveClass("hidden");
});

test.each([
  {
    ok: undefined,
    assert: (form: RenderResult) => {
      expect(form.queryByLabelText("valid")).toBeNull();
      expect(form.queryByLabelText("invalid")).toBeNull();
    },
  },
  {
    ok: null,
    assert: (form: RenderResult) => {
      expect(form.queryByLabelText("valid")).toBeNull();
      expect(form.queryByLabelText("invalid")).toBeNull();
    },
  },
  {
    ok: false,
    assert: (form: RenderResult) => {
      expect(form.getByLabelText("invalid")).toBeInTheDocument();
      expect(form.queryByLabelText("valid")).toBeNull();
    },
  },
  {
    ok: true,
    assert: (form: RenderResult) => {
      expect(form.getByLabelText("valid")).toBeInTheDocument();
      expect(form.queryByLabelText("invalid")).toBeNull();
    },
  },
])("indicates validation", async ({ ok, assert }) => {
  // render
  const form = await act(() =>
    render(
      <SectionedForm
        tab={1}
        sections={[
          {
            tab: 0,
            name: "section 1",
            Component: SomeFormSection,
            ok: ok,
          },
        ]}
        setTab={() => {}}
      />
    )
  );

  // assert
  assert(form);
});
