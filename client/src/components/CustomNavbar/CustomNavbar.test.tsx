import { act } from "react";
import { MemoryRouter } from "react-router";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import md5 from "md5";

import t from "../../utils/translation";
import { clearCookies } from "../../utils/session";
import useGlobalStore from "../../store";
import CustomNavbar from "./CustomNavbar";

const userMock = {
  id: "testUser",
  username: "testUser",
  firstname: "testUserFirstName",
  lastname: "testUserLastName",
  groups: [{ id: "admin" }],
  email: "test@example.com",
};

describe("CustomNavbar component render", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCookies();
    useGlobalStore.setState(useGlobalStore.getInitialState());
  });

  test("has context menu when user is logged in", async () => {
    // mock store content
    useGlobalStore.setState((state) => ({
      session: { ...state.session, loggedIn: true, me: userMock },
    }));
    // render
    const navbar = await act(() =>
      render(
        <MemoryRouter>
          <CustomNavbar />
        </MemoryRouter>
      )
    );

    // open menu ...
    fireEvent.click(navbar.getByRole("img"));
    await new Promise(process.nextTick);

    // .. and assert
    expect(navbar.getByText(userMock.username)).toBeInTheDocument();
    expect(navbar.getByText(`${userMock.firstname} ${userMock.lastname}`)).toBeInTheDocument();
    expect(navbar.getByText(t("Abmelden"))).toBeInTheDocument();
  });

  test.each([
    { acl: { VIEW_SCREEN_WORKSPACES: true }, linkText: t("Arbeitsbereiche") },
    { acl: { VIEW_SCREEN_USERCONFIGS: true }, linkText: t("Nutzer") },
    { acl: { VIEW_SCREEN_JOBS: true }, linkText: t("Jobs") },
    { acl: { VIEW_SCREEN_TEMPLATES: true }, linkText: t("Templates") },
  ])("Display links according to acl-table", async ({ acl, linkText }) => {
    const allTexts = [
      t("Arbeitsbereiche"),
      t("Nutzer"),
      t("Jobs"),
      t("Templates"),
    ];
    // mock store content
    useGlobalStore.setState((state) => ({
      session: { ...state.session, loggedIn: true, acl: acl },
    }));
    // render
    const navbar = await act(() =>
      render(
        <MemoryRouter>
          <CustomNavbar />
        </MemoryRouter>
      )
    );

    // check contents
    expect(navbar.getByText(linkText)).toBeInTheDocument();
    for (const text of allTexts) {
      if (text === linkText) continue;
      expect(navbar.queryByText(text)).not.toBeInTheDocument();
    }
  });

  test("Highlight the active link based on the location", async () => {
    // mock store content
    useGlobalStore.setState((state) => ({
      session: {
        ...state.session,
        loggedIn: true,
        acl: { VIEW_SCREEN_USERCONFIGS: true },
      },
    }));
    // render
    const navbar = await act(() =>
      render(
        <MemoryRouter initialEntries={["/users"]}>
          <CustomNavbar />
        </MemoryRouter>
      )
    );

    expect(navbar.getByText(t("Nutzer"))).toHaveClass("active");
  });

  test("Renders gravatar image with correct URL", async () => {
    // mock store content
    useGlobalStore.setState((state) => ({
      session: { ...state.session, loggedIn: true, me: userMock },
    }));
    // render
    const navbar = await act(() =>
      render(
        <MemoryRouter>
          <CustomNavbar />
        </MemoryRouter>
      )
    );

    // assert img
    const gravatarHash = md5(userMock.email.trim().toLowerCase()).toString();
    const expectedGravatarUrl = `https://www.gravatar.com/avatar/${gravatarHash}?s=200&d=identicon`;

    expect(navbar.getByRole(t("img"))).toHaveAttribute(
      "src",
      expectedGravatarUrl
    );
  });

  test("Session is reset on logout", async () => {
    // mock store content
    useGlobalStore.setState((state) => ({
      session: { ...state.session, loggedIn: true, me: userMock },
    }));
    // mock API
    jest
      .spyOn(global, "fetch")
      .mockImplementation(
        jest.fn(() => Promise.resolve({ ok: true })) as jest.Mock
      );
    // mock session
    document.cookie = "session=a";
    // render
    const navbar = await act(() =>
      render(
        <MemoryRouter>
          <CustomNavbar />
        </MemoryRouter>
      )
    );
    // validate initial state
    expect(useGlobalStore.getState().session.loggedIn).toBeTruthy();
    expect(document.cookie.includes("session")).toBeTruthy();

    // perform logout
    fireEvent.click(navbar.getByRole("img"));
    await new Promise(process.nextTick);

    fireEvent.click(navbar.getByText(t("Abmelden")));
    await new Promise(process.nextTick);

    // check state
    expect(useGlobalStore.getState().session.loggedIn).toBeFalsy();
    expect(document.cookie.includes("session")).toBeFalsy();
  });
});
