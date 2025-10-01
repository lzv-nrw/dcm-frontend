import { act } from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import t from "../../utils/translation";
import { clearCookies } from "../../utils/session";
import useGlobalStore from "../../store";
import LoginScreen from "./LoginScreen";

describe("LoginScreen", () => {
  beforeEach(() => {
    clearCookies();
    jest.clearAllMocks();
  });

  test("renders userId, password inputs and login button", async () => {
    const login = await act(() => render(<LoginScreen />));

    const userNameInput = login.getByLabelText(t("Benutzername"));
    expect(userNameInput).toBeInTheDocument();
    expect(userNameInput).toBeInstanceOf(HTMLInputElement);
    const passwordInput = login.getByLabelText(t("Passwort"));
    expect(passwordInput).toBeTruthy();
    expect(passwordInput).toBeInstanceOf(HTMLInputElement);
    expect(passwordInput.getAttribute("type")).toBe("password");
    const loginButton = login.getByText(t("Anmelden")).parentElement;
    expect(loginButton).toBeInTheDocument();
    expect(loginButton?.parentElement).toBeInstanceOf(HTMLFormElement);
  });

  test("shows error when fields are empty", async () => {
    const login = await act(() => render(<LoginScreen />));

    fireEvent.submit(login.getByRole("form"));

    await new Promise(process.nextTick);

    expect(
      login.getByText(t("Bitte füllen Sie alle erforderlichen Felder aus."))
    ).toBeInTheDocument();
  });

  test("shows and hides passwordText when toggle is clicked", async () => {
    const login = await act(() => render(<LoginScreen />));

    const toggle = login.getByLabelText("toggle hidden password");
    const passwordInput = login.getByLabelText(t("Passwort"));
    expect(toggle).toBeInTheDocument();
    expect(toggle.children[0]).toBeInTheDocument();

    fireEvent.click(toggle.children[0]);
    await new Promise(process.nextTick);

    expect(passwordInput.getAttribute("type")).toBe("text");

    fireEvent.click(toggle.children[0]);
    await new Promise(process.nextTick);

    expect(passwordInput.getAttribute("type")).toBe("password");
  });
});

describe("LoginPageRequests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCookies();
    useGlobalStore.setState(useGlobalStore.getInitialState());
  });

  test("should make a login request with correct data", async () => {
    // mock store content
    useGlobalStore.setState((state) => ({
      session: { ...state.session, setMe: jest.fn(), fetchACL: jest.fn() },
    }));
    // mock API
    jest.spyOn(global, "fetch").mockImplementation(
      jest.fn((url: string) => {
        if (url.endsWith("api/auth/login"))
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ id: "0", username: "user0" }),
          });
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      }) as jest.Mock
    );

    // render
    const login = await act(() => render(<LoginScreen />));

    // fill in form and submit
    fireEvent.change(login.getByLabelText(t("Benutzername")), {
      target: { value: "testUser" },
    });
    fireEvent.change(login.getByLabelText(t("Passwort")), {
      target: { value: "testPassword" },
    });
    fireEvent.submit(login.getByRole("form"));

    await new Promise(process.nextTick);

    // assert login actions
    expect(useGlobalStore.getState().session.loggedIn).toBeTruthy();
    expect(useGlobalStore.getState().session.setMe).toHaveBeenCalledTimes(1);
    expect(useGlobalStore.getState().session.fetchACL).toHaveBeenCalledTimes(1);
  });

  test("should display an error message if login fails", async () => {
    // mock store content
    useGlobalStore.setState((state) => ({
      session: { ...state.session, fetchMe: jest.fn(), fetchACL: jest.fn() },
    }));
    // mock API
    jest.spyOn(global, "fetch").mockImplementation(
      jest.fn((url: string) => {
        if (url.endsWith("api/auth/login"))
          return Promise.resolve({
            ok: false,
            status: 401,
            text: async () => "Unauthorized",
          });
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      }) as jest.Mock
    );

    // render
    const login = await act(() => render(<LoginScreen />));

    // assert initial state
    expect(login.queryByRole("alert")).toBeNull();

    // fill in form and submit
    fireEvent.change(login.getByLabelText(t("Benutzername")), {
      target: { value: "wrongUser" },
    });
    fireEvent.change(login.getByLabelText(t("Passwort")), {
      target: { value: "wrongPassword" },
    });
    fireEvent.submit(login.getByRole("form"));

    await new Promise(process.nextTick);

    // assert
    await waitFor(() => expect(login.getByRole("alert")).toBeInTheDocument());
    expect(useGlobalStore.getState().session.fetchMe).toHaveBeenCalledTimes(0);
    expect(useGlobalStore.getState().session.fetchACL).toHaveBeenCalledTimes(0);
  });

  test("should handle network errors", async () => {
    // mock store content
    useGlobalStore.setState((state) => ({
      session: { ...state.session, fetchMe: jest.fn(), fetchACL: jest.fn() },
    }));
    // mock API
    jest
      .spyOn(global, "fetch")
      .mockRejectedValueOnce(new Error("Network error"));

    // render
    const login = await act(() => render(<LoginScreen />));

    // fill in form and submit
    fireEvent.change(login.getByLabelText(t("Benutzername")), {
      target: { value: "testUser" },
    });
    fireEvent.change(login.getByLabelText(t("Passwort")), {
      target: { value: "testPassword" },
    });
    fireEvent.submit(login.getByRole("form"));

    await new Promise(process.nextTick);

    // assert
    await waitFor(() => expect(login.getByRole("alert")).toBeInTheDocument());
    expect(
      login.getByText(t("Fehler beim Senden"), { exact: false })
    ).toBeInTheDocument();
    expect(useGlobalStore.getState().session.fetchMe).toHaveBeenCalledTimes(0);
    expect(useGlobalStore.getState().session.fetchACL).toHaveBeenCalledTimes(0);
  });
});
