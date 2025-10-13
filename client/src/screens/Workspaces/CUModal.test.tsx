import { act } from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import t from "../../utils/translation";
import CUModal from "./CUModal";

beforeEach(() => {
  jest.restoreAllMocks();
});

test("renders without crashing", async () => {
  await act(() => render(<CUModal show={true} />));
});

test("hidden if not shown", async () => {
  const modal = await act(() => render(<CUModal show={false} />));

  expect(modal.queryByText(t("Titel*"))).toBeNull();
});

test("shows the expected inputs", async () => {
  const modal = await act(() => render(<CUModal show={true} />));

  const element = modal.queryByLabelText(t("Titel*"));
  expect(element).toBeInTheDocument();
  expect(element).toBeInstanceOf(HTMLInputElement);
});

test("shows alert on bad inputs", async () => {
  // render
  const modal = await act(() => render(<CUModal show={true} />));

  expect(modal.queryByRole("alert")).not.toBeInTheDocument();

  // submit form
  fireEvent.click(modal.getByText(t("Erstellen")));
  await new Promise(process.nextTick);

  // assert
  expect(modal.queryByRole("alert")).toBeInTheDocument();
});

test("makes API-call on submission", async () => {
  // mock API
  let fetchMock = jest.fn((url: string) => {
    if (url.endsWith("api/admin/workspace"))
      return Promise.resolve({
        ok: true,
      });
    return Promise.resolve({
      ok: false,
    });
  }) as jest.Mock;
  jest.spyOn(global, "fetch").mockImplementation(fetchMock);

  // render
  const modal = await act(() => render(<CUModal show={true} />));

  // fill and submit form
  fireEvent.change(modal.getByLabelText(t("Titel*")), {
    target: { value: "Hello" },
  });
  fireEvent.blur(modal.getByLabelText(t("Titel*"))); // trigger validation
  fireEvent.click(modal.getByText(t("Erstellen")));
  await new Promise(process.nextTick);

  // assert
  expect(modal.queryByRole("alert")).not.toBeInTheDocument();
  expect(fetchMock).toBeCalledTimes(2); // submission + workspace-reload
});
