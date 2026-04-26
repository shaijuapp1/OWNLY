// src/pages/Holdings/HoldingsPage.js
import { useEffect, useState } from "react";
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import Navbar from "../../components/Navbar";

export default function HoldingsPage() {
  const [holdings, setHoldings] = useState([]);
  const [screen, setScreen] = useState("listing"); // listing, view, edit, add
  const [selectedHolding, setSelectedHolding] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    country: "",
    currency: "",
    contactPerson: "",
    contactNo: "",
    website: "",
    login: "",
    notes: "",
  });

  const fetchHoldings = async () => {
    const holdingsSnap = await getDocs(collection(db, "holdings"));
    setHoldings(holdingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchHoldings();
  }, []);

  const handleRowClick = (holding) => {
    setSelectedHolding(holding);
    setFormData(holding);
    setScreen("view");
  };

  const handleEditClick = () => {
    setScreen("edit");
  };

  const handleAddClick = () => {
    setSelectedHolding(null);
    setFormData({
      title: "",
      country: "",
      currency: "",
      contactPerson: "",
      contactNo: "",
      website: "",
      login: "",
      notes: "",
    });
    setScreen("add");
  };

  const handleClose = () => {
    setScreen("listing");
    setSelectedHolding(null);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this holding?")) {
      try {
        await deleteDoc(doc(db, "holdings", selectedHolding.id));
        fetchHoldings();
        handleClose();
      } catch (error) {
        console.error("Error deleting holding:", error);
      }
    }
  };

  const handleSave = async () => {
    try {
      if (screen === "add") {
        await addDoc(collection(db, "holdings"), formData);
      } else if (screen === "edit") {
        const holdingRef = doc(db, "holdings", selectedHolding.id);
        await updateDoc(holdingRef, formData);
      }
      fetchHoldings();
      handleClose();
    } catch (error) {
      console.error("Error saving holding:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csv = event.target.result;
        const lines = csv.trim().split('\n');
        
        if (lines.length < 2) {
          alert("CSV file must contain headers and at least one row of data");
          return;
        }

        // Parse headers
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Expected headers
        const expectedHeaders = ['title', 'country', 'currency', 'contactPerson', 'contactNo', 'website', 'login', 'notes'];
        
        // Check if CSV has required headers
        const hasRequiredHeaders = expectedHeaders.every(header => 
          headers.map(h => h.toLowerCase()).includes(header.toLowerCase())
        );

        if (!hasRequiredHeaders) {
          alert(`CSV must contain these headers (case-insensitive):\n${expectedHeaders.join(', ')}`);
          return;
        }

        // Parse data rows
        let successCount = 0;
        let failureCount = 0;

        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === '') continue; // Skip empty rows

          const values = lines[i].split(',').map(v => v.trim());
          const record = {};

          headers.forEach((header, index) => {
            record[header.toLowerCase()] = values[index] || '';
          });

          try {
            await addDoc(collection(db, "holdings"), {
              title: record.title || '',
              country: record.country || '',
              currency: record.currency || '',
              contactPerson: record.contactperson || '',
              contactNo: record.contactno || '',
              website: record.website || '',
              login: record.login || '',
              notes: record.notes || '',
            });
            successCount++;
          } catch (error) {
            console.error("Error adding holding:", error);
            failureCount++;
          }
        }

        alert(`Upload completed!\nSuccessful: ${successCount}\nFailed: ${failureCount}`);
        fetchHoldings();
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error reading CSV file:", error);
      alert("Error reading CSV file");
    }

    // Reset input
    e.target.value = '';
  };

  const handleExportToExcel = () => {
    if (holdings.length === 0) {
      alert("No data to export");
      return;
    }

    // Prepare data for export
    const headers = ['SI No', 'Title', 'Country', 'Currency', 'Contact Person', 'Contact No', 'Website', 'Login', 'Notes'];
    const data = holdings.map((h, index) => [
      index + 1,
      h.title || '',
      h.country || '',
      h.currency || '',
      h.contactPerson || '',
      h.contactNo || '',
      h.website || '',
      h.login || '',
      h.notes || '',
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `holdings_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Navbar />
      <div className="container-fluid mt-5 px-3 px-md-5">
        {/* LISTING SCREEN */}
        {screen === "listing" && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2>Holdings</h2>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-success"
                  onClick={handleAddClick}
                >
                  + Add Holding
                </button>
                <button
                  className="btn btn-warning"
                  onClick={handleExportToExcel}
                >
                  📊 Export to Excel
                </button>
                <div className="input-group" style={{ width: "auto" }}>
                  <label className="input-group-text btn btn-info">
                    📥 Upload CSV
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th style={{ width: "50px" }}>SI No</th>
                    <th>Title</th>
                    <th>Country</th>
                    <th>Currency</th>
                    <th>Contact Person</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, index) => (
                    <tr key={h.id} style={{ cursor: "pointer" }} onClick={() => handleRowClick(h)}>
                      <td>{index + 1}</td>
                      <td>{h.title || "N/A"}</td>
                      <td>{h.country || "N/A"}</td>
                      <td>{h.currency || "N/A"}</td>
                      <td>{h.contactPerson || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* VIEW SCREEN */}
        {screen === "view" && selectedHolding && (
          <div className="card shadow-lg">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">{selectedHolding.title}</h5>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Title:</strong> {selectedHolding.title || "N/A"}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Country:</strong> {selectedHolding.country || "N/A"}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Currency:</strong> {selectedHolding.currency || "N/A"}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Contact Person:</strong> {selectedHolding.contactPerson || "N/A"}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Contact No:</strong> {selectedHolding.contactNo || "N/A"}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Website:</strong> {selectedHolding.website || "N/A"}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Login:</strong> {selectedHolding.login || "N/A"}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-12">
                  <p><strong>Notes:</strong></p>
                  <p style={{ whiteSpace: "pre-wrap", backgroundColor: "#f8f9fa", padding: "10px", borderRadius: "4px" }}>
                    {selectedHolding.notes || "N/A"}
                  </p>
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
        {screen === "edit" && selectedHolding && (
          <div className="card shadow-lg">
            <div className="card-header bg-warning text-dark">
              <h5 className="mb-0">Edit: {selectedHolding.title}</h5>
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
                    <label className="form-label">Country</label>
                    <select
                      className="form-control"
                      name="country"
                      value={formData.country || ""}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Country</option>
                      <option value="UAE">UAE</option>
                      <option value="India">India</option>
                      <option value="USA">USA</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Currency</label>
                    <select
                      className="form-control"
                      name="currency"
                      value={formData.currency || ""}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Currency</option>
                      <option value="AED">AED</option>
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      className="form-control"
                      name="contactPerson"
                      value={formData.contactPerson || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Contact No</label>
                    <input
                      type="text"
                      className="form-control"
                      name="contactNo"
                      value={formData.contactNo || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Website</label>
                    <input
                      type="text"
                      className="form-control"
                      name="website"
                      value={formData.website || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Login</label>
                    <input
                      type="text"
                      className="form-control"
                      name="login"
                      value={formData.login || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-12 mb-3">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      name="notes"
                      value={formData.notes || ""}
                      onChange={handleInputChange}
                      rows="3"
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
              <h5 className="mb-0">Add New Holding</h5>
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
                    <label className="form-label">Country</label>
                    <select
                      className="form-control"
                      name="country"
                      value={formData.country || ""}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Country</option>
                      <option value="UAE">UAE</option>
                      <option value="India">India</option>
                      <option value="USA">USA</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Currency</label>
                    <select
                      className="form-control"
                      name="currency"
                      value={formData.currency || ""}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Currency</option>
                      <option value="AED">AED</option>
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      className="form-control"
                      name="contactPerson"
                      value={formData.contactPerson || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Contact No</label>
                    <input
                      type="text"
                      className="form-control"
                      name="contactNo"
                      value={formData.contactNo || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Website</label>
                    <input
                      type="text"
                      className="form-control"
                      name="website"
                      value={formData.website || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Login</label>
                    <input
                      type="text"
                      className="form-control"
                      name="login"
                      value={formData.login || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-12 mb-3">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      name="notes"
                      value={formData.notes || ""}
                      onChange={handleInputChange}
                      rows="3"
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
