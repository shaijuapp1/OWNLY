// src/pages/Settings.js
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import Navbar from "../components/Navbar";

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const fetchSettings = async () => {
    const settingsSnap = await getDocs(collection(db, "settings"));
    setSettings(settingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const handleEdit = (id, currentValue) => {
    setEditingId(id);
    setEditValue(currentValue);
  };

  const handleSave = async (id) => {
    try {
      const settingRef = doc(db, "settings", id);
      await updateDoc(settingRef, { value: editValue });
      setEditingId(null);
      setEditValue("");
      fetchSettings();
    } catch (error) {
      console.error("Error updating setting:", error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <>
      <Navbar />
      <div className="container mt-5">
        <h2>Settings</h2>
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => (
              <tr key={s.id}>
                <td>{s.key}</td>
                <td>
                  {editingId === s.id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="form-control"
                      style={{ maxWidth: "250px" }}
                    />
                  ) : (
                    s.value
                  )}
                </td>
                <td>
                  {editingId === s.id ? (
                    <>
                      <button
                        className="btn btn-sm btn-success me-2"
                        onClick={() => handleSave(s.id)}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleEdit(s.id, s.value)}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
