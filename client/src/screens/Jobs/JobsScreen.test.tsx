import { act } from "react";
import { MemoryRouter, Routes, Route } from "react-router";
import {
  render,
  fireEvent,
  waitFor,
  RenderResult,
} from "@testing-library/react";
import "@testing-library/jest-dom";

import t from "../../utils/translation";
import useGlobalStore from "../../store";
import JobsScreen from "./JobsScreen";

beforeEach(() => {
  jest.restoreAllMocks();
  useGlobalStore.setState(useGlobalStore.getInitialState());
});

test("shows error if fetch fails", async () => {
  const view = await act(() =>
    render(
      <MemoryRouter>
        <JobsScreen />
      </MemoryRouter>
    )
  );
  await waitFor(() => expect(view.queryByRole("alert")).toBeInTheDocument());
});

test("shows no error if fetch successful", async () => {
  // mock API
  jest.spyOn(global, "fetch").mockImplementation(
    jest.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: () => {
          if (url.endsWith("api/admin/workspaces")) return Promise.resolve([]);
          if (url.endsWith("api/admin/templates")) return Promise.resolve([]);
          if (url.endsWith("api/curator/job-config?id=jc0"))
            return Promise.resolve({
              id: "jc0",
              status: "draft",
              templateId: "",
            });
          if (url.endsWith("api/curator/job-configs"))
            return Promise.resolve(["jc0"]);
        },
      })
    ) as jest.Mock
  );

  // render
  const view = await act(() =>
    render(
      <MemoryRouter>
        <JobsScreen />
      </MemoryRouter>
    )
  );

  // assert
  await waitFor(() => expect(view.queryByRole("alert")).toBeNull());
  // TODO: fix after implementing store-actions
  // expect(view.getByText( ??? )).toBeInTheDocument();
});

test("open new job config modal", async () => {
  // render
  const view = await act(() =>
    render(
      <MemoryRouter>
        <JobsScreen />
      </MemoryRouter>
    )
  );

  // open modal
  expect(view.queryByText(t("Abbrechen"))).toBeNull();
  expect(view.queryByText(t("Neuen Job anlegen"))).toBeTruthy();
  fireEvent.click(view.getByText(t("Neuen Job anlegen")));
  await new Promise(process.nextTick);

  // assert
  expect(view.getByText(t("Abbrechen"))).toBeInTheDocument();
});

test.each([
  { acl: {}, redirect: true },
  { acl: { VIEW_SCREEN_JOBS: false }, redirect: true },
  { acl: { VIEW_SCREEN_JOBS: true }, redirect: false },
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
      <MemoryRouter initialEntries={["/jobs"]}>
        <Routes>
          <Route path="/" element={"Redirected"} />
          <Route path="/jobs" element={<JobsScreen useACL />} />
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
    acl: { VIEW_SCREEN_JOBS: true, CREATE_JOBCONFIG: true },
    assert: (view: RenderResult) => {
      expect(view.getByText(t("Neuen Job anlegen"))).toBeInTheDocument();
    },
  },
  {
    acl: { VIEW_SCREEN_JOBS: true, CREATE_JOBCONFIG: false },
    assert: (view: RenderResult) => {
      expect(view.queryByText(t("Neuen Job anlegen"))).toBeNull();
    },
  },
  {
    acl: { VIEW_SCREEN_JOBS: true, READ_JOBCONFIG: true },
    assert: (view: RenderResult) => {
      expect(view.queryAllByTestId("table-row-element")).toHaveLength(1);
      expect(
        view.queryByText(t("Kein Lese-Zugriff auf Jobkonfigurationen."))
      ).toBeNull();
    },
  },
  {
    acl: { VIEW_SCREEN_JOBS: true, READ_JOBCONFIG: false },
    assert: (view: RenderResult) => {
      expect(view.queryByRole("table")).toBeNull();
      expect(view.queryAllByTestId("table-row-element")).toHaveLength(0);
      expect(
        view.getByText(t("Kein Lese-Zugriff auf Jobkonfigurationen."))
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
    job: {
      ...state.job,
      jobConfigs: { jc0: { id: "jc0", status: "draft" } },
    },
  }));
  // render
  const view = await act(() =>
    render(
      <MemoryRouter>
        <JobsScreen useACL />
      </MemoryRouter>
    )
  );

  // assert
  assert(view);
});

// TODO: test tools sort/order/..
