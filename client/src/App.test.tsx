import { act } from "react";
import { MemoryRouter } from "react-router";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";

import { clearCookies } from "./utils/session";
import useGlobalStore from "./store";
import App from "./App";

describe("App component render", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCookies();
    useGlobalStore.setState(useGlobalStore.getInitialState());
  });

  test.each([true, false])(
    "display the SecretKeyBanner if the the SECRET_KEY is set",
    async (ok) => {
      // mock API
      jest.spyOn(global, "fetch").mockImplementation(
        jest.fn((url: string) => {
          if (url.endsWith("api/misc/app-info"))
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ secretKeyOk: ok }),
            });
          if (url.endsWith("api/misc/welcome"))
            return Promise.resolve({
              ok: true,
              text: () => "welcome-text",
            });
          return Promise.resolve({ ok: true });
        }) as jest.Mock
      );

      // render
      const app = await act(() =>
        render(
          <MemoryRouter initialEntries={["/"]}>
            <App />
          </MemoryRouter>
        )
      );

      // assert
      let banner = null;
      try {
        banner = await app.findByRole(
          "alert",
          {},
          { interval: 5, timeout: 100 }
        );
      } catch {}
      if (ok) expect(banner).toBeNull();
      else expect(banner).toBeInTheDocument();
    }
  );
});

describe("App requests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCookies();
    useGlobalStore.setState(useGlobalStore.getInitialState());
  });

  test.each([
    { cookie: "session=a", ok: true },
    { cookie: null, ok: false },
  ])("restore session if cookie is set", async ({ cookie, ok }) => {
    // mock cookies
    expect(document.cookie.includes("session")).toBeFalsy();
    if (cookie) document.cookie = cookie;
    // mock store content
    useGlobalStore.setState((state) => ({
      session: { ...state.session, fetchMe: jest.fn(), fetchACL: jest.fn() },
    }));
    // mock API
    const fetch_mock = jest.fn((url: string) => {
      if (url.endsWith("api/auth/login"))
        return Promise.resolve({
          ok,
          status: 200,
        });
      return Promise.resolve({
        ok: false,
        status: 500,
      });
    }) as jest.Mock;
    jest.spyOn(global, "fetch").mockImplementation(fetch_mock);

    // render
    const app = await act(() =>
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      )
    );

    // assert actions
    expect(fetch_mock).toHaveBeenCalledTimes(2);
    expect(useGlobalStore.getState().session.fetchMe).toHaveBeenCalledTimes(
      ok ? 1 : 0
    );
    expect(useGlobalStore.getState().session.fetchACL).toHaveBeenCalledTimes(
      ok ? 1 : 0
    );
  });
});
