import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';

const Navbar = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleSignOut = async () => {
    await auth.signOut();
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          <strong>Ownly</strong>
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            {user && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/dashboard">Dashboard</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/rates">Rates</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/holdings">Holdings</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/wealth">Wealth</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/wealthreport">Wealth Report</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/tags">Tags</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/notes">Notes</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/users">Users</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/mylist">My List</Link>
                </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/portfolio">US Portfolio</Link>
                  </li>
              </>
            )}
            <li className="nav-item">
              <Link className="nav-link" to="/help">Help</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/settings">Settings</Link>
            </li>
            {user && (
              <>
                <li className="nav-item">
                  <span className="nav-link text-white">
                    {user.displayName || user.email}
                  </span>
                </li>
                <li className="nav-item">
                  <button
                    className="nav-link btn btn-outline-light"
                    onClick={handleSignOut}
                    style={{ border: "1px solid rgba(255,255,255,0.5)" }}
                  >
                    Sign Out
                  </button>
                </li>
              </>
            )}
            {!user && (
              <li className="nav-item">
                <Link className="nav-link" to="/">Login</Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;