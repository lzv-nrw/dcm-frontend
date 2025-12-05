import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { NavLink, useLocation, useNavigate } from "react-router";
import { Avatar, Navbar } from "flowbite-react";

import t from "../../utils/translation";
import { createGravatar } from "../../utils/util";
import useGlobalStore from "../../store";
import { host, credentialsValue } from "../../App";
import { clearCookies } from "../../utils/session";
import ContextMenu from "../ContextMenu";
import DCMAvatar from "../DCMAvatar";

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
  const { me, acl, useGravatar } = useGlobalStore(
    useShallow((state) => ({
      me: state.session.me,
      acl: state.session.acl,
      useGravatar: state.app.info?.useGravatar ?? false,
    }))
  );
  const location = useLocation();
  const navigate = useNavigate();
  const [openContextMenu, setOpenContextMenu] = useState(false);

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
        <ContextMenu
          open={openContextMenu}
          onOpenChange={setOpenContextMenu}
          header={
            <>
              <div>{`${me?.firstname ?? ""} ${me?.lastname ?? ""}`}</div>
              <div>{me?.username ?? ""}</div>
            </>
          }
          items={[
            {
              children: t("Passwort ändern"),
              onClick: () => navigate("/password-update"),
            },
            {
              children: t("Abmelden"),
              onClick: () => logout(),
            },
          ]}
        >
          <div className="hover:cursor-pointer">
            {useGravatar ? (
              <Avatar
                alt="user avatar"
                img={createGravatar(me?.email)}
                rounded
              />
            ) : (
              <DCMAvatar user={me ?? { id: "" }} />
            )}
          </div>
        </ContextMenu>
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
