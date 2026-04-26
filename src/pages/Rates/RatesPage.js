// src/pages/Rates/RatesPage.js
import { useEffect, useState } from "react";
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import Navbar from "../../components/Navbar";

export default function RatesPage() {
  const [rates, setRates] = useState([]);
  const [screen, setScreen] = useState("listing"); // listing, view, edit, add
  const [selectedRate, setSelectedRate] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    value: "",
    apiURL: "",
    source: "",
    rateUpdateDate: "",
  });

  const fetchRates = async () => {
    const ratesSnap = await getDocs(collection(db, "rates"));
    setRates(ratesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleRowClick = (rate) => {
    setSelectedRate(rate);
    setFormData(rate);
    setScreen("view");
  };

  const handleEditClick = () => {
    setScreen("edit");
  };

  const handleAddClick = () => {
    setSelectedRate(null);
    setFormData({
      title: "",
      value: "",
      apiURL: "",
      source: "",
      rateUpdateDate: "",
    });
    setScreen("add");
  };

  const handleClose = () => {
    setScreen("listing");
    setSelectedRate(null);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this rate?")) {
      try {
        await deleteDoc(doc(db, "rates", selectedRate.id));
        fetchRates();
        handleClose();
      } catch (error) {
        console.error("Error deleting rate:", error);
      }
    }
  };

  const handleSave = async () => {
    try {
      if (screen === "add") {
        await addDoc(collection(db, "rates"), formData);
      } else if (screen === "edit") {
        const rateRef = doc(db, "rates", selectedRate.id);
        await updateDoc(rateRef, formData);
      }
      fetchRates();
      handleClose();
    } catch (error) {
      console.error("Error saving rate:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <>
      <Navbar />
      <div className="container-fluid mt-5 px-3 px-md-5">
        {/* LISTING SCREEN */}
        {screen === "listing" && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2>Rates</h2>
              <button
                className="btn btn-success"
                onClick={handleAddClick}
              >
                + Add Rate
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Title</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r) => (
                    <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => handleRowClick(r)}>
                      <td>{r.title || "N/A"}</td>
                      <td>{r.value || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* VIEW SCREEN */}
        {screen === "view" && selectedRate && (
          <div className="card shadow-lg">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">{selectedRate.title}</h5>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Title:</strong> {selectedRate.title || "N/A"}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Value:</strong> {selectedRate.value || "N/A"}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>API URL:</strong> {selectedRate.apiURL || "N/A"}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Source:</strong> {selectedRate.source || "N/A"}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Rate Update Date:</strong> {selectedRate.rateUpdateDate || "N/A"}</p>
                </div>
              </div>
            </div>
            <div className="card-footer d-flex gap-2">
              <button
                className="btn btn-warning"
                onClick={handleEditClick}
              >
                Edit
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* EDIT SCREEN */}
        {screen === "edit" && selectedRate && (
          <div className="card shadow-lg">
            <div className="card-header bg-warning text-dark">
              <h5 className="mb-0">Edit: {selectedRate.title}</h5>
            </div>
            <div className="card-body">
              <form>
                <div className="mb-3">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="title"
                    value={formData.title || ""}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Value</label>
                    <input
                      type="text"
                      className="form-control"
                      name="value"
                      value={formData.value || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">API URL</label>
                    <input
                      type="text"
                      className="form-control"
                      name="apiURL"
                      value={formData.apiURL || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Source</label>
                    <select
                      className="form-control"
                      name="source"
                      value={formData.source || ""}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Source</option>
                      <option value="Static">Static</option>
                      <option value="API">API</option>
                      <option value="exchangerate-api">exchangerate-api</option>
                      <option value="alphavantage-api">alphavantage-api</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Rate Update Date</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      name="rateUpdateDate"
                      value={formData.rateUpdateDate || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="card-footer d-flex gap-2 flex-wrap">
              <button
                className="btn btn-primary"
                onClick={handleSave}
              >
                Save
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ADD SCREEN */}
        {screen === "add" && (
          <div className="card shadow-lg">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">Add New Rate</h5>
            </div>
            <div className="card-body">
              <form>
                <div className="mb-3">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="title"
                    value={formData.title || ""}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Value</label>
                    <input
                      type="text"
                      className="form-control"
                      name="value"
                      value={formData.value || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">API URL</label>
                    <input
                      type="text"
                      className="form-control"
                      name="apiURL"
                      value={formData.apiURL || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Source</label>
                    <select
                      className="form-control"
                      name="source"
                      value={formData.source || ""}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Source</option>
                      <option value="Static">Static</option>
                      <option value="API">API</option>
                      <option value="exchangerate-api">exchangerate-api</option>
                      <option value="alphavantage-api">alphavantage-api</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Rate Update Date</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      name="rateUpdateDate"
                      value={formData.rateUpdateDate || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="card-footer d-flex gap-2">
              <button
                className="btn btn-primary"
                onClick={handleSave}
              >
                Save
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
