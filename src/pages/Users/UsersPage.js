// src/pages/UsersPage.js
import { useEffect, useState } from "react";
import { db } from '../../firebase';
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import Navbar from "../../components/Navbar";

export default function UsersPage() {
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    setUsers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleRole = async (id, role) => {
    const ref = doc(db, "users", id);
    await updateDoc(ref, { role: role === "admin" ? "viewer" : "admin" });
    fetchUsers();
  };

  return (
    <>
      <Navbar />
      <div className="container mt-5">
        <h2>User Management</h2>
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-warning"
                    onClick={() => toggleRole(u.id, u.role)}
                  >
                    Toggle Role
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}