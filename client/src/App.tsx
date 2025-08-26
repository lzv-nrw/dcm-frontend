import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router";
import { Spinner } from "flowbite-react";

import t from "./utils/translation";
import useGlobalStore from "./store";
import CustomNavbar from "./components/CustomNavbar/CustomNavbar";
import LoginScreen from "./screens/Login/LoginScreen";
import DashboardScreen from "./screens/Dashboard/Dashboard";
import HomeScreen from "./screens/Home/HomeScreen";
import UsersScreen from "./screens/Users/UsersScreen";
import TemplatesScreen from "./screens/Templates/TemplatesScreen";
import WorkspacesScreen from "./screens/Workspaces/WorkspacesScreen";
import JobsScreen from "./screens/Jobs/JobsScreen";
import JobDetailsScreen from "./screens/JobDetails/JobDetailsScreen";

export const host: string = process.env.REACT_APP_API_URL || "";
export const credentialsValue = process.env.REACT_APP_API_URL
  ? "include"
  : "same-origin";
export const devMode = document.cookie
  .split(";")
  .find((cookie) => cookie.startsWith("dev=yes"))
  ? true
  : false;

// return a div-tag for a SECRET_KEY-Banner
function SecretKeyBanner() {
  return (
    <div role="alert" className="w-full p-1 bg-red-500">
      <div className="mx-auto">
        <p className="text-center text-sm font-bold text-slate-50">
          {t(
            "Warnung! Der SECRET_KEY ist nicht konfiguriert, die Sitzung ist eventuell unsicher. Bitte wenden Sie sich an den Systemadministrator."
          )}
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { loggedIn, me, acl, setLoggedIn, fetchMe, fetchACL } = useGlobalStore(
    useShallow((state) => ({
      loggedIn: state.session.loggedIn,
      me: state.session.me,
      acl: state.session.acl,
      setLoggedIn: state.session.setLoggedIn,
      fetchMe: state.session.fetchMe,
      fetchACL: state.session.fetchACL,
    }))
  );
  const [initialized, setInitialized] = useState(false);
  const [secretKeyOk, setSecretKeyOk] = useState<boolean | null>(null);
  const [logoAvailable, setLogoAvailable] = useState<boolean | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // initialize session
  useEffect(() => {
    fetch(host + "/api/auth/login", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: credentialsValue,
    })
      .then((response) => {
        if (response.ok) {
          setLoggedIn(true);
          fetchMe({});
          fetchACL({});
        } else setLoggedIn(false);
      })
      .catch((error) => {
        console.error(error);
        setLoggedIn(false);
      });
  }, [setLoggedIn, fetchMe, fetchACL]);

  // update initialization-state
  useEffect(() => {
    if (loggedIn === undefined) return;
    if ((loggedIn && acl !== undefined && me !== undefined) || !loggedIn)
      setInitialized(true);
  }, [loggedIn, acl, me]);

  // change defaultSecretKey depending on whether it was set in the
  // environment variable or not
  useEffect(() => {
    fetch(host + "/api/misc/secret-key", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (response.ok) {
          setSecretKeyOk(true);
        }
        if (response.status === 404) {
          setSecretKeyOk(false);
        }
      })
      .catch((error) => {
        console.error("Error while verifying SECRET_KEY:", error);
      });
  }, [setSecretKeyOk]);

  return (
    <>
      <header className="sticky top-0 z-50 w-[100%]">
        {secretKeyOk === false && <SecretKeyBanner />}
        <div className="w-full relative flex justify-center items-center bg-white">
          <div
            className="absolute left-7 h-10 w-36 hover:cursor-pointer"
            onClick={() => navigate("/")}
          >
            {logoAvailable === null || logoAvailable === true ? (
              <img
                src={host + "/logo"}
                className="max-w-full max-h-full"
                onLoad={() => setLogoAvailable(true)}
                onError={() => setLogoAvailable(false)}
                alt="logo"
              />
            ) : (
              <div className="w-full h-full border-0 rounded-3xl bg-gray-300" />
            )}
          </div>
          <h1 className="flex justify-center py-7 font-bold text-2xl">
            Digital Curation Manager
          </h1>
          {devMode && (
            <span className="text-xs mt-5 w-0 text-nowrap">dev-Modus</span>
          )}
        </div>
        {loggedIn === true && <CustomNavbar />}
      </header>
      <div className="w-[100%] h-full">
        {initialized && loggedIn === false && location.pathname !== "/" ? (
          <Navigate to="/login" />
        ) : null}
        <section className="w-full">
          {initialized ? (
            <Routes>
              <Route
                path="/"
                element={loggedIn ? <HomeScreen /> : <Navigate to="/login" />}
              />
              <Route
                path="/dashboard"
                element={<DashboardScreen acceptedWidgets={["demo"]} />}
              />
              <Route
                path="/login"
                element={!loggedIn ? <LoginScreen /> : <Navigate to="/" />}
              />
              {acl ? (
                <>
                  <Route path="/jobs" element={<JobsScreen useACL />} />
                  <Route
                    path="/job-details"
                    element={<JobDetailsScreen useACL />}
                  />
                  <Route path="/users" element={<UsersScreen useACL />} />
                  <Route
                    path="/templates"
                    element={<TemplatesScreen useACL />}
                  />
                  <Route
                    path="/workspaces"
                    element={<WorkspacesScreen useACL />}
                  />
                </>
              ) : null}
            </Routes>
          ) : (
            <div className="flex h-full w-full justify-center items-center">
              <Spinner size="xl" />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
