// src/App.js
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/Users/UsersPage";
import RatesPage from "./pages/Rates/RatesPage";
import HoldingsPage from "./pages/Holdings/HoldingsPage";
import WealthPage from "./pages/Wealth/WealthPage";
import WealthReport from "./pages/WealthReport";
import TagsPage from "./pages/Tags/TagsPage";
import NotesPage from "./pages/Notes/NotesPage";
import SettingsPage from "./pages/Settings";
import HelpPage from "./pages/Help";
import MyListPage from "./pages/MyList/MyListPage";
import PortfolioPage from "./pages/PortfolioPage";

function App() {
  const [user, setUser] = useState(undefined);   // Firebase Auth user
  const [role, setRole] = useState(null);       // Role from Firestore

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      //debugger
      setUser(u);

      if (u) {
        // Get the user's role from Firestore
        const userRef = doc(db, "users", u.email);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();
          setRole(data.role);
        } else {
          setRole(null);
          navigate("/not-authorized");
        }
      } else {
        setRole(null);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (
    location.pathname !== "/not-authorized" &&
    (user === undefined || (user && role === null))
  ) {
    return <div>Loading...</div>;
    
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? (role === "admin" ? <Dashboard /> : <Navigate to="/not-authorized" />) : <Login />}
      />
      <Route
        path="/dashboard"
        element={user && role === "admin" ? <Dashboard /> : <Navigate to="/" />}
      />
      <Route
        path="/users"
        element={user && role === "admin" ? <UsersPage /> : <Navigate to="/" />}
      />
      <Route
        path="/rates"
        element={<RatesPage />}
      />
      <Route
        path="/holdings"
        element={<HoldingsPage />}
      />
      <Route
        path="/wealth"
        element={<WealthPage />}
      />
      <Route
        path="/tags"
        element={<TagsPage />}
      />
      <Route
        path="/notes"
        element={<NotesPage />}
      />
      <Route
        path="/wealthreport"
        element={<WealthReport />}
      />
      <Route
        path="/settings"
        element={<SettingsPage />}
      />
      <Route
        path="/help"
        element={<HelpPage />}
      />
      <Route
        path="/mylist"
        element={<MyListPage />}
      />
        <Route
          path="/portfolio"
          element={<PortfolioPage />}
        />
      <Route
        path="/not-authorized"
        element={
          <div style={{ padding: 40 }}>
            <h2>Not Authorized</h2>
            <button
              onClick={async () => {
                await auth.signOut();
                window.location.href = "/";
              }}
              style={{
                margin: "16px 0",
                padding: "8px 20px",
                background: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Sign Out
            </button>
          </div>
        }
      />
    </Routes>
  );
}

export default function AppWithRouter() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}