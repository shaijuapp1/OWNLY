// src/pages/Dashboard.js
import { auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Dashboard() {
  const user = auth.currentUser;
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await auth.signOut();
    navigate("/");
  };

  return (
    <>
      <Navbar />
      <div className="container mt-5">
        <h2>
          Welcome{user && user.displayName ? `, ${user.displayName}` : ""}!
        </h2>
        {user && <p className="text-muted">Email: {user.email}</p>}
        <p>You are logged in to the dashboard.</p>

        <div className="mt-4">
          <h3>Menu</h3>
          <ul className="list-group">
            <li className="list-group-item"><Link to="/banks">Banks</Link></li>
            <li className="list-group-item"><Link to="/users">Users</Link></li>
            <li className="list-group-item"><Link to="/rates">Rates</Link></li>
          </ul>
        </div>
      </div>
    </>
  );
}