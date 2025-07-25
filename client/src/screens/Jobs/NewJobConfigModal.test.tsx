import { act, useEffect } from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";

import t from "../../utils/translation";
import NewJobConfigModal, {
  NewJobConfigFormStore,
  useNewJobConfigFormStore,
} from "./NewJobConfigModal";

describe("useNewJobConfigFormStore", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    useNewJobConfigFormStore.setState(
      useNewJobConfigFormStore.getInitialState(),
      true
    );
  });

  test.each([
    { prop: "workspace", setter: "setWorkspace" },
    { prop: "template", setter: "setTemplate" },
    { prop: "description", setter: "setDescription" },
    { prop: "dataSelection", setter: "setDataSelection" },
    { prop: "dataProcessing", setter: "setDataProcessing" },
    { prop: "scheduling", setter: "setScheduling" },
  ])("setter-actions work", async ({ prop, setter }) => {
    const value = { some: "value" };
    let store: NewJobConfigFormStore;
    function Run(p: { onFail?: () => void }) {
      store = useNewJobConfigFormStore();
      useEffect(() => (store as any)[setter](value), []);
      return <></>;
    }

    // render and eval
    await act(() => render(<Run />));

    expect((useNewJobConfigFormStore.getState() as any)[prop]).toStrictEqual(
      value
    );
  });
});

describe("NewJobConfigModal", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("hidden if not shown", async () => {
    const modal = await act(() => render(<NewJobConfigModal show={false} />));

    expect(modal.queryByText(t("Neuen Job anlegen"))).toBeNull();
  });

  test("shows the expected buttons tab2", async () => {
    // render
    const modal = await act(() =>
      render(<NewJobConfigModal show={true} tab={2} />)
    );

    // assert
    expect(modal.getByText(t("Abbrechen"))).toBeInTheDocument();
    expect(modal.getByText(t("Entwurf speichern"))).toBeInTheDocument();
    expect(modal.queryByText(t("Zurück"))).toBeNull();
    expect(modal.getByText(t("Weiter"))).toBeInTheDocument();
  });

  test.each([3, 4, 5])("shows the expected buttons tab3..5", async (tab) => {
    // mock API
    jest.spyOn(global, "fetch").mockImplementation(
      jest.fn((url: string) =>
        Promise.resolve({
          ok: true,
          json: () => {
            if (url.endsWith("api/curator/job-config/configuration/rights"))
              return Promise.resolve({});
            if (
              url.endsWith(
                "api/curator/job-config/configuration/significant-properties"
              )
            )
              return Promise.resolve({});
          },
        })
      ) as jest.Mock
    );
    // render
    const modal = await act(() =>
      render(<NewJobConfigModal show={true} tab={tab} />)
    );

    // assert
    expect(modal.getByText(t("Abbrechen"))).toBeInTheDocument();
    expect(modal.getByText(t("Entwurf speichern"))).toBeInTheDocument();
    expect(modal.getByText(t("Zurück"))).toBeInTheDocument();
    expect(modal.getByText(t("Weiter"))).toBeInTheDocument();
  });

  test("shows the expected buttons tab6", async () => {
    // mock API
    jest.spyOn(global, "fetch").mockImplementation(
      jest.fn((url: string) =>
        Promise.resolve({
          ok: true,
          json: () => {
            if (url.endsWith("api/curator/job-config/configuration/rights"))
              return Promise.resolve({});
            if (
              url.endsWith(
                "api/curator/job-config/configuration/significant-properties"
              )
            )
              return Promise.resolve({});
          },
        })
      ) as jest.Mock
    );
    // render
    const modal = await act(() =>
      render(<NewJobConfigModal show={true} tab={6} />)
    );

    // assert
    expect(modal.getByText(t("Abbrechen"))).toBeInTheDocument();
    expect(modal.getByText(t("Entwurf speichern"))).toBeInTheDocument();
    expect(modal.getByText(t("Zurück"))).toBeInTheDocument();
    expect(modal.getByText(t("Job anlegen"))).toBeInTheDocument();
    expect(modal.queryByText(t("Weiter"))).toBeNull();
  });

  // TODO: add integration test that runs through the wizard
});
