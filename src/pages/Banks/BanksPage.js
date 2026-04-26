// src/pages/BanksPage.js
import { useEffect, useState } from "react";
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import Navbar from "../../components/Navbar";

// Helper function to convert Firestore Timestamp to readable format
const formatValue = (value) => {
  if (!value) return "N/A";
  // Check if it's a Firestore Timestamp object
  if (value && typeof value === "object" && "seconds" in value) {
    const timestamp = new Date(value.seconds * 1000);
    return timestamp.toLocaleDateString();
  }
  return String(value);
};

// Helper function to format balance as currency with commas
const formatCurrency = (value) => {
  if (!value && value !== 0) return "0";
  const num = parseFloat(value);
  return isNaN(num) ? "0" : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function BanksPage() {
  const [banks, setBanks] = useState([]);
  const [usdToInr, setUsdToInr] = useState(92.58);
  const [aedToInr, setAedToInr] = useState(25.33);
  const [screen, setScreen] = useState("listing"); // listing, view, edit, add
  const [selectedBank, setSelectedBank] = useState(null);
  const [formData, setFormData] = useState({
    accountNumber: "",
    balance: "",
    balanceDate: "",
    bankName: "",
    branch: "",
    country: "",
    createdBy: "",
    currency: "",
    passwordHint: "",
    rmMobile: "",
    rmName: "",
    type: "",
    rate: "",
  });

  const fetchBanks = async () => {
    const bankSnap = await getDocs(collection(db, "banks"));
    setBanks(bankSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const fetchSettings = async () => {
    const settingsSnap = await getDocs(collection(db, "settings"));
    const settingsData = {};
    settingsSnap.docs.forEach((doc) => {
      settingsData[doc.data().key] = doc.data().value;
    });
    
    if (settingsData.AED_USD_RATE) {
      setUsdToInr(1 / settingsData.AED_USD_RATE * settingsData.AED_INR_RATE || 92.58);
    }
    if (settingsData.AED_INR_RATE) {
      setAedToInr(settingsData.AED_INR_RATE);
    }
  };

  useEffect(() => {
    fetchBanks();
    fetchSettings();
  }, []);

  const handleRowClick = (bank) => {
    setSelectedBank(bank);
    // Convert timestamp objects to strings before setting form data
    const cleanedBank = { ...bank };
    Object.keys(cleanedBank).forEach(key => {
      if (cleanedBank[key] && typeof cleanedBank[key] === "object" && "seconds" in cleanedBank[key]) {
        const timestamp = new Date(cleanedBank[key].seconds * 1000);
        cleanedBank[key] = timestamp.toLocaleDateString();
      }
    });
    setFormData(cleanedBank);
    setScreen("view");
  };

  const handleEditClick = () => {
    setScreen("edit");
  };

  const handleAddClick = () => {
    setSelectedBank(null);
    setFormData({
      accountNumber: "",
      balance: "",
      balanceDate: "",
      bankName: "",
      branch: "",
      country: "",
      createdBy: "",
      currency: "",
      passwordHint: "",
      rmMobile: "",
      rmName: "",
      type: "",
      rate: "",
    });
    setScreen("add");
  };

  const handleClose = () => {
    setScreen("listing");
    setSelectedBank(null);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this bank?")) {
      try {
        await deleteDoc(doc(db, "banks", selectedBank.id));
        fetchBanks();
        handleClose();
      } catch (error) {
        console.error("Error deleting bank:", error);
      }
    }
  };

  const handleSave = async () => {
    try {
      const dataToSave = {
        ...formData,
        balance: parseFloat(formData.balance) || 0, // Ensure balance is a number
      };
      
      if (screen === "add") {
        await addDoc(collection(db, "banks"), dataToSave);
      } else if (screen === "edit") {
        const bankRef = doc(db, "banks", selectedBank.id);
        await updateDoc(bankRef, dataToSave);
      }
      fetchBanks();
      handleClose();
    } catch (error) {
      console.error("Error saving bank:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const calculateBalances = (bank) => {
    const balance = parseFloat(bank.balance) || 0;
    const currency = bank.currency || "AED";
    let balanceAED, balanceINR;
    
    if (currency === "USD") {
      balanceAED = balance / (1 / aedToInr * usdToInr);
      balanceINR = balance * usdToInr;
    } else if (currency === "AED") {
      balanceAED = balance;
      balanceINR = balance * aedToInr;
    } else {
      // INR
      balanceAED = balance / aedToInr;
      balanceINR = balance;
    }
    
    return { 
      balanceAED: Number(balanceAED) || 0, 
      balanceINR: Number(balanceINR) || 0 
    };
  };

  return (
    <>
      <Navbar />
      <div className="container-fluid mt-5 px-3 px-md-5">
        {/* LISTING SCREEN */}
        {screen === "listing" && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2>Banks</h2>
              <button
                className="btn btn-success"
                onClick={handleAddClick}
              >
                + Add Bank
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Bank Name</th>
                    <th>Type</th>
                    <th className="text-end">Balance (AED)</th>
                    <th className="text-end">Balance (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {banks
                    .map(b => {
                      const { balanceAED, balanceINR } = calculateBalances(b);
                      return { ...b, balanceAED, balanceINR };
                    })
                    .sort((a, b) => b.balanceAED - a.balanceAED)
                    .map((b) => (
                      <tr key={b.id} style={{ cursor: "pointer" }} onClick={() => handleRowClick(b)}>
                        <td>{b.bankName || "N/A"}</td>
                        <td>{b.type || "N/A"}</td>
                        <td className="text-end">{formatCurrency(b.balanceAED)}</td>
                        <td className="text-end">{formatCurrency(b.balanceINR)}</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot className="table-dark">
                  <tr>
                    <th>Total</th>
                    <th></th>
                    <th className="text-end">
                      {formatCurrency(
                        banks.reduce((sum, b) => {
                          const { balanceAED } = calculateBalances(b);
                          return sum + balanceAED;
                        }, 0)
                      )}
                    </th>
                    <th className="text-end">
                      {formatCurrency(
                        banks.reduce((sum, b) => {
                          const { balanceINR } = calculateBalances(b);
                          return sum + balanceINR;
                        }, 0)
                      )}
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {/* VIEW SCREEN */}
        {screen === "view" && selectedBank && (
          <div className="card shadow-lg">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">{formatValue(selectedBank.bankName)}</h5>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-12">
                  <p><strong>Bank Name:</strong> {formatValue(selectedBank.bankName)}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Balance:</strong> {formatCurrency(selectedBank.balance)}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Type:</strong> {formatValue(selectedBank.type)}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Currency:</strong> {formatValue(selectedBank.currency)}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Rate:</strong> {formatValue(selectedBank.rate)}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Account Number:</strong> {formatValue(selectedBank.accountNumber)}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Balance Date:</strong> {formatValue(selectedBank.balanceDate)}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Branch:</strong> {formatValue(selectedBank.branch)}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Country:</strong> {formatValue(selectedBank.country)}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>RM Name:</strong> {formatValue(selectedBank.rmName)}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>RM Mobile:</strong> {formatValue(selectedBank.rmMobile)}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Created By:</strong> {formatValue(selectedBank.createdBy)}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Password Hint:</strong> {formatValue(selectedBank.passwordHint)}</p>
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
        {screen === "edit" && selectedBank && (
          <div className="card shadow-lg">
            <div className="card-header bg-warning text-dark">
              <h5 className="mb-0">Edit: {selectedBank.bankName}</h5>
            </div>
            <div className="card-body">
              <form>
                <div className="mb-3">
                  <label className="form-label">Bank Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="bankName"
                    value={formData.bankName || ""}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      name="balance"
                      value={formData.balance || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Type</label>
                    <select
                      className="form-control"
                      name="type"
                      value={formData.type || ""}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Type</option>
                      <option value="Savings">Savings</option>
                      <option value="FD">FD</option>
                      <option value="FCNR">FCNR</option>
                    </select>
                  </div>
                </div>

                <div className="row">
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
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      name="rate"
                      value={formData.rate || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Account Number</label>
                    <input
                      type="text"
                      className="form-control"
                      name="accountNumber"
                      value={formData.accountNumber || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Balance Date</label>
                    <input
                      type="date"
                      className="form-control"
                      name="balanceDate"
                      value={formData.balanceDate || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Branch</label>
                    <input
                      type="text"
                      className="form-control"
                      name="branch"
                      value={formData.branch || ""}
                      onChange={handleInputChange}
                    />
                  </div>
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
                      <option value="INDIA">INDIA</option>
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">RM Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="rmName"
                      value={formData.rmName || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">RM Mobile</label>
                    <input
                      type="text"
                      className="form-control"
                      name="rmMobile"
                      value={formData.rmMobile || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Created By</label>
                    <input
                      type="text"
                      className="form-control"
                      name="createdBy"
                      value={formData.createdBy || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Password Hint</label>
                    <input
                      type="text"
                      className="form-control"
                      name="passwordHint"
                      value={formData.passwordHint || ""}
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
              <h5 className="mb-0">Add New Bank</h5>
            </div>
            <div className="card-body">
              <form>
                <div className="mb-3">
                  <label className="form-label">Bank Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="bankName"
                    value={formData.bankName || ""}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      name="balance"
                      value={formData.balance || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Type</label>
                    <select
                      className="form-control"
                      name="type"
                      value={formData.type || ""}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Type</option>
                      <option value="Savings">Savings</option>
                      <option value="FD">FD</option>
                      <option value="FCNR">FCNR</option>
                    </select>
                  </div>
                </div>

                <div className="row">
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
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      name="rate"
                      value={formData.rate || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Account Number</label>
                    <input
                      type="text"
                      className="form-control"
                      name="accountNumber"
                      value={formData.accountNumber || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Balance Date</label>
                    <input
                      type="date"
                      className="form-control"
                      name="balanceDate"
                      value={formData.balanceDate || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Branch</label>
                    <input
                      type="text"
                      className="form-control"
                      name="branch"
                      value={formData.branch || ""}
                      onChange={handleInputChange}
                    />
                  </div>
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
                      <option value="INDIA">INDIA</option>
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">RM Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="rmName"
                      value={formData.rmName || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">RM Mobile</label>
                    <input
                      type="text"
                      className="form-control"
                      name="rmMobile"
                      value={formData.rmMobile || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Created By</label>
                    <input
                      type="text"
                      className="form-control"
                      name="createdBy"
                      value={formData.createdBy || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Password Hint</label>
                    <input
                      type="text"
                      className="form-control"
                      name="passwordHint"
                      value={formData.passwordHint || ""}
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