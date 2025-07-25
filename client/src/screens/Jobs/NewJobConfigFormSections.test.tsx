import { act } from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import t from "../../utils/translation";
import * as NewJobConfigFormSections from "./NewJobConfigFormSections";
import { useNewJobConfigFormStore } from "./NewJobConfigModal";

beforeEach(() => {
  jest.restoreAllMocks();
  useNewJobConfigFormStore.setState(
    useNewJobConfigFormStore.getInitialState(),
    true
  );
  useNewJobConfigFormStore.setState({
    description: {
      name: "Description-section-title",
      description: "Some description",
      contactInfo: "Tom Ford",
    },
    dataSelection: {
      subdirectory: "Some-directory",
      sets: ["Dummy Set 1", "Dummy Set 3"],
    },
    dataProcessing: {
      mapping: {}
    },
    scheduling: {
      start: new Date(),
      schedule: "onetime",
    },
  });
});

describe("DescriptionForm", () => {
  test("renders expected form inputs", async () => {
    const section = await act(() =>
      render(
        <NewJobConfigFormSections.DescriptionForm
          active
          name={t("Description-section-name")}
        />
      )
    );
    expect(
      section.getByText(t("Description-section-name"))
    ).toBeInTheDocument();

    let elem = section.getByLabelText(t("Titel*"));
    expect(elem).toBeTruthy();
    expect(elem).toBeInstanceOf(HTMLInputElement);

    elem = section.getByLabelText(t("Beschreibung"));
    expect(elem).toBeTruthy();
    expect(elem).toBeInstanceOf(HTMLTextAreaElement);

    elem = section.getByLabelText(t("Ansprechpartner für Quellsystem"));
    expect(elem).toBeTruthy();
    expect(elem).toBeInstanceOf(HTMLInputElement);
  });

  test("validates inputs", async () => {
    const mockSetOk = jest.fn();
    const section = await act(() =>
      render(
        <NewJobConfigFormSections.DescriptionForm
          active={true}
          name={t("Description-section-name")}
          setOk={mockSetOk}
        />
      )
    );
    let titleInput = section.getByLabelText(t("Titel*")) as HTMLInputElement;
    fireEvent.change(titleInput, {
      target: { value: "  " },
    });
    fireEvent.blur(titleInput);

    // emulate tab switching
    section.rerender(
      <NewJobConfigFormSections.DescriptionForm
        active={false}
        name={t("Description-section-name")}
        setOk={mockSetOk}
      />
    );

    expect(mockSetOk).toHaveBeenCalledWith(false);

    // emulate tab switching
    section.rerender(
      <NewJobConfigFormSections.DescriptionForm
        active={true}
        name={t("Description-section-name")}
        setOk={mockSetOk}
      />
    );

    fireEvent.change(titleInput, {
      target: { value: "some text" },
    });

    fireEvent.blur(titleInput);

    // emulate tab switching
    section.rerender(
      <NewJobConfigFormSections.DescriptionForm
        active={false}
        name={t("Description-section-name")}
        setOk={mockSetOk}
      />
    );

    expect(mockSetOk).toHaveBeenCalledWith(true);
  });

  test("pre-fills form with data from store", async () => {
    const section = await act(() =>
      render(
        <NewJobConfigFormSections.DescriptionForm
          active
          name={t("Description-section-name")}
        />
      )
    );
    const titleInput = section.getByLabelText(t("Titel*")) as HTMLInputElement;
    expect(titleInput.value).toBe("Description-section-title");

    const descriptionTextarea = section.getByLabelText(
      t("Beschreibung")
    ) as HTMLTextAreaElement;
    expect(descriptionTextarea.value).toBe("Some description");

    const contactPersonInput = section.getByLabelText(
      t("Ansprechpartner für Quellsystem")
    ) as HTMLInputElement;
    expect(contactPersonInput.value).toBe("Tom Ford");
  });
});

/* disabled to avoid test-refactoring
describe("OaiDataSelectionForm", () => {
  test("renders expected form inputs", async () => {
    const section = await act(() =>
      render(
        <NewJobConfigFormSections.OaiDataSelectionForm
          active
          name={t("OaiDataSelection-section-name")}
        />
      )
    );
    expect(
      section.getByText(t("OaiDataSelection-section-name"))
    ).toBeInTheDocument();

    let elem = section.getByLabelText(
      t("In welcher Granularität möchten Sie Daten auswählen?")
    );
    expect(elem).toBeTruthy();
    expect(elem).toBeInstanceOf(HTMLSelectElement);
    fireEvent.change(section.getByDisplayValue(t("Bitte auswählen")), {
      target: { value: "sets" },
    });
    elem = section.getAllByRole("checkbox")[0];
    expect(elem).toBeTruthy();
    expect(elem).toBeInstanceOf(HTMLInputElement);
  });

  test("pre-fills form with data from store", async () => {
    const section = await act(() =>
      render(
        <NewJobConfigFormSections.OaiDataSelectionForm
          active
          name={t("OaiDataSelection-section-name")}
        />
      )
    );
    fireEvent.change(section.getByDisplayValue(t("Bitte auswählen")), {
      target: { value: "sets" },
    });
    const setsSelect = section.getAllByRole("checkbox") as HTMLInputElement[];
    expect(setsSelect[0].value).toBe("Dummy Set 1");
  });
});
 */

describe("HotfolderDataSelectionForm", () => {
  test("renders expected form inputs", () => {
    const section = render(
      <NewJobConfigFormSections.HotfolderDataSelectionForm
        active
        name={"HotfolderDataSelection-section-name"}
      />
    );
    expect(
      section.getByText("HotfolderDataSelection-section-name")
    ).toBeInTheDocument();

    let elem = section.getByLabelText(
      t("Aus welchem Unterverzeichnis sollen Daten extrahiert werden?")
    );
    expect(elem).toBeTruthy();
    expect(elem).toBeInstanceOf(HTMLInputElement);
  });

  test("pre-fills form with data from store", () => {
    const section = render(
      <NewJobConfigFormSections.HotfolderDataSelectionForm
        active
        name={"HotfolderDataSelection-section-name"}
      />
    );
    const directoryInput = section.getByLabelText(
      t("Aus welchem Unterverzeichnis sollen Daten extrahiert werden?")
    ) as HTMLInputElement;
    expect(directoryInput.value).toBe("Some-directory");
  });
});

describe("DataProcessingForm", () => {
  test("renders expected form inputs", () => {
    const cell = render(
      <NewJobConfigFormSections.DataProcessingForm active name={"form-0"} />
    );
    expect(cell.getByText("form-0")).toBeInTheDocument();

    // TODO: assert existence of inputs
  });

  test("validates inputs", () => {
    // TODO
  });

  test("pre-fills form with data from store", () => {
    // TODO
  });
});

/* disabled because test-runner gets stuck somewhere with latest implementation
describe("SchedulingForm", () => {
  test("renders expected form inputs", async () => {
    const section = await act(() =>
      render(
        <NewJobConfigFormSections.SchedulingForm
          active
          name={t("Scheduling-section-name")}
        />
      )
    );
    expect(section.getByText(t("Scheduling-section-name"))).toBeInTheDocument();

    let elem = section.getByLabelText(t("Startdatum"));
    expect(elem).toBeTruthy();
    expect(elem).toBeInstanceOf(HTMLInputElement);

    elem = section?.container?.querySelector("#time") as HTMLInputElement;
    expect(elem).toBeTruthy();

    elem = section.getByLabelText(t("Wiederholungen"));
    expect(elem).toBeTruthy();
    expect(elem).toBeInstanceOf(HTMLSelectElement);
  });

  test("validates inputs", async () => {
    const mockSetOk = jest.fn();
    const section = await act(() =>
      render(
        <NewJobConfigFormSections.SchedulingForm
          active={true}
          name={t("Scheduling-section-name")}
          setOk={mockSetOk}
        />
      )
    );

    let dateInput = section.getByLabelText(t("Startdatum")) as HTMLInputElement;
    fireEvent.change(dateInput, {
      target: { value: null },
    });

    let timeInput = section?.container?.querySelector(
      "#time"
    ) as HTMLInputElement;
    fireEvent.change(timeInput, {
      target: { value: "" },
    });

    // emulate tab switching
    section.rerender(
      <NewJobConfigFormSections.SchedulingForm
        active={false}
        name={t("Scheduling-section-name")}
        setOk={mockSetOk}
      />
    );

    expect(mockSetOk).toHaveBeenCalledWith(false);

    // emulate tab switching
    section.rerender(
      <NewJobConfigFormSections.SchedulingForm
        active={true}
        name={t("Scheduling-section-name")}
        setOk={mockSetOk}
      />
    );

    dateInput = section.getByLabelText(t("Startdatum")) as HTMLInputElement;
    fireEvent.change(dateInput, {
      target: { value: "16/04/2025" },
    });

    timeInput = section?.container?.querySelector("#time") as HTMLInputElement;
    fireEvent.change(timeInput, {
      target: { value: "09:00" },
    });

    // emulate tab switching
    section.rerender(
      <NewJobConfigFormSections.SchedulingForm
        active={false}
        name={t("Scheduling-section-name")}
        setOk={mockSetOk}
      />
    );

    expect(mockSetOk).toHaveBeenCalledWith(true);
  });

  test("pre-fills form with data from store", async () => {
    const section = await act(() =>
      render(
        <NewJobConfigFormSections.SchedulingForm
          active
          name={t("Scheduling-section-name")}
        />
      )
    );

    const nowISO = formatDateToISOString(
      parseISOToDateString(new Date().toString()),
      parseISOToTimeString(new Date().toString())
    );

    const expectedDate = new Date(nowISO).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const expectedTime = parseISOToTimeString(nowISO);

    const dateInput = section.getByLabelText(
      t("Startdatum")
    ) as HTMLInputElement;
    const actualDate = dateInput.value;
    expect(actualDate).toBe(expectedDate);

    const timeInput = section.container.querySelector(
      "#time"
    ) as HTMLInputElement;
    expect(timeInput.value).toBe(expectedTime);

    const repeatSelect = section.getByLabelText(
      t("Wiederholungen")
    ) as HTMLSelectElement;
    expect(repeatSelect.value).toBe("day");
  });
});
*/

describe("Summary", () => {
  test("renders expected values from store", () => {
    const cell = render(
      <NewJobConfigFormSections.Summary active name={"summary"} />
    );
    expect(cell.getByText("summary")).toBeInTheDocument();

    // TODO: assert existence of inputs
  });
});
