import { useShallow } from "zustand/react/shallow";
import { NavLink, useLocation, useNavigate } from "react-router";
import { Avatar, Dropdown, Navbar, Button } from "flowbite-react";

import t from "../../utils/translation";
import { createGravatar } from "../../utils/util";
import useGlobalStore from "../../store";
import { host, credentialsValue } from "../../App";
import { clearCookies } from "../../utils/session";

export interface CustomNavlinks {
  path: string;
  label: string;
  aclKey?: string;
}

export const NavLinksList: CustomNavlinks[] = [
  { path: "/dashboard", label: "Übersicht" },
  { path: "/jobs", label: "Jobs", aclKey: "VIEW_SCREEN_JOBS" },
  {
    path: "/workspaces",
    label: "Arbeitsbereiche",
    aclKey: "VIEW_SCREEN_WORKSPACES",
  },
  { path: "/templates", label: "Templates", aclKey: "VIEW_SCREEN_TEMPLATES" },
  { path: "/users", label: "Nutzer", aclKey: "VIEW_SCREEN_USERCONFIGS" },
];

export default function CustomNavbar() {
  const { me, acl } = useGlobalStore(
    useShallow((state) => ({
      me: state.session.me,
      acl: state.session.acl,
    }))
  );
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Logs current user out by clearing browser (store and persistent)
   * data.
   */
  function logout() {
    fetch(host + "/api/auth/logout", {
      method: "GET",
      credentials: credentialsValue,
    })
      .then((response) => {
        if (!response.ok) {
          throw Error(`Logout not successful: ${response.statusText}.`);
        }
        // reset store
        useGlobalStore.setState(useGlobalStore.getInitialState());
        // clear storage
        localStorage.clear();
        sessionStorage.clear();
        // clear cookies (by settings expiration to now)
        clearCookies();
        // redirect to home
        navigate("/");
      })
      .catch((error) => {
        alert(error.message);
      });
  }

  return (
    <Navbar
      fluid
      className="App-nav h-16 px-8 border-y border-[#333] border-solid"
    >
      <div className="flex md:order-2">
        <Dropdown
          arrowIcon={false}
          inline
          label={
            <Avatar alt="user avatar" img={createGravatar(me?.email)} rounded />
          }
        >
          <Dropdown.Header>
            <span className="username block text-sm">{me?.username}</span>
            {me?.email ? (
              <span className="block truncate text-sm font-medium">
                {me?.email}
              </span>
            ) : null}
            <Button
              id="logOutBtn"
              onClick={logout}
              color="light"
              className="mx-2 my-2"
            >
              Abmelden
            </Button>
          </Dropdown.Header>
        </Dropdown>
        <Navbar.Toggle />
      </div>
      <Navbar.Collapse>
        {NavLinksList.map(({ path, label, aclKey }) => {
          // check ACL whether to render individual link
          if (!aclKey || acl?.[aclKey]) {
            return (
              <Navbar.Link
                as={NavLink}
                key={path}
                to={path}
                active={location.pathname === path}
              >
                {t(label)}
              </Navbar.Link>
            );
          }
          return null;
        })}
      </Navbar.Collapse>
    </Navbar>
  );
}
