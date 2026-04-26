// src/pages/Wealth/WealthPage.js
import { useEffect, useState } from "react";
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import Navbar from "../../components/Navbar";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { getAEDINRRate, calculateBalanceAED, calculateBalanceINR } from "../../utils/exchangeRateCache";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Helper to format currency with commas
const formatCurrency = (value) => {
  if (!value && value !== 0) return "0.00";
  const num = parseFloat(value);
  return isNaN(num) ? "0.00" : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function WealthPage() {
  const [wealths, setWealths] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [rates, setRates] = useState([]);
  const [aedInrRate, setAedInrRate] = useState(25.3605); // Default fallback rate
  const [screen, setScreen] = useState("listing");
  const [selectedWealth, setSelectedWealth] = useState(null);
  const [formData, setFormData] = useState({
    holding: "",
    type: "",
    currency: "",
    qty: "",
    accountNumber: "",
    maturityDate: "",
    interestRate: "",
  });

  // Derived/display fields
  const [displayData, setDisplayData] = useState({
    country: "",
    rate: "",
    rateUpdateDate: "",
    balanceAED: 0,
    balanceINR: 0,
  });

  // Filter states
  const [filters, setFilters] = useState({
    holding: "",
    type: "",
    currency: ""
  });
  const [uniqueHoldings, setUniqueHoldings] = useState([]);
  const [uniqueTypes, setUniqueTypes] = useState([]);
  const [uniqueCurrencies, setUniqueCurrencies] = useState([]);

  const fetchWealths = async () => {
    const wealthSnap = await getDocs(collection(db, "wealths"));
    const wealthData = wealthSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setWealths(wealthData);
  };

  const fetchHoldings = async () => {
    const holdingsSnap = await getDocs(collection(db, "holdings"));
    setHoldings(holdingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const fetchRates = async () => {
    const ratesSnap = await getDocs(collection(db, "rates"));
    setRates(ratesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchWealths();
    fetchHoldings();
    fetchRates();
    
    // Fetch AED-INR rate on component mount
    const fetchRate = async () => {
      try {
        const rate = await getAEDINRRate();
        setAedInrRate(rate);
      } catch (error) {
        console.error("Failed to fetch AED-INR rate:", error);
        setAedInrRate(25.3605); // Use default if fetch fails
      }
    };
    fetchRate();
  }, []);

  // Extract unique values for filters when wealths change
  useEffect(() => {
    if (wealths.length > 0) {
      const holdings = [...new Set(wealths.map(w => w.holding).filter(Boolean))].sort();
      const types = [...new Set(wealths.map(w => w.type).filter(Boolean))].sort();
      const currencies = [...new Set(wealths.map(w => w.currency).filter(Boolean))].sort();
      
      setUniqueHoldings(holdings);
      setUniqueTypes(types);
      setUniqueCurrencies(currencies);
    }
  }, [wealths]);

  // Update display data when form changes
  useEffect(() => {
    updateDisplayData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, holdings, rates, aedInrRate]);

  const updateDisplayData = () => {
    let newDisplay = { country: "", rate: "", rateUpdateDate: "", balanceAED: 0, balanceINR: 0 };

    // Get country and type from selected holding
    if (formData.holding) {
      const selectedHolding = holdings.find(h => h.title === formData.holding);
      if (selectedHolding) {
        newDisplay.country = selectedHolding.country || "";
        // Auto-populate type from holding if not already set
        if (!formData.type && selectedHolding.type) {
          setFormData(prev => ({
            ...prev,
            type: selectedHolding.type
          }));
        }
      }
    }

    // Determine rate display based on currency
    if (formData.currency) {
      if (formData.currency === "AED") {
        newDisplay.rate = "1.0000";
        newDisplay.rateUpdateDate = new Date().toISOString().split('T')[0];
      } else if (formData.currency === "USD") {
        newDisplay.rate = "3.6725";
        newDisplay.rateUpdateDate = new Date().toISOString().split('T')[0];
      } else if (formData.currency === "INR") {
        newDisplay.rate = `AED-INR rate: ${aedInrRate.toFixed(4)}`;
        newDisplay.rateUpdateDate = new Date().toISOString().split('T')[0];
      }
    }

    // Calculate Balance AED using the new logic
    if (formData.currency && formData.qty) {
      newDisplay.balanceAED = calculateBalanceAED(formData.currency, formData.qty, aedInrRate);
    }

    // Calculate Balance INR from Balance AED
    newDisplay.balanceINR = calculateBalanceINR(newDisplay.balanceAED, aedInrRate);

    setDisplayData(newDisplay);
  };

  const handleRowClick = (wealth) => {
    setSelectedWealth(wealth);
    setFormData(wealth);
    setScreen("view");
  };

  const handleEditClick = () => {
    setScreen("edit");
  };

  const handleAddClick = () => {
    setSelectedWealth(null);
    setFormData({
      holding: "",
      type: "",
      currency: "",
      qty: "",
      accountNumber: "",
      maturityDate: "",
      interestRate: "",
    });
    setScreen("add");
  };

  const handleClose = () => {
    setScreen("listing");
    setSelectedWealth(null);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this wealth record?")) {
      try {
        await deleteDoc(doc(db, "wealths", selectedWealth.id));
        fetchWealths();
        handleClose();
      } catch (error) {
        console.error("Error deleting wealth:", error);
      }
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      holding: "",
      type: "",
      currency: ""
    });
  };

  const getFilteredWealths = () => {
    return wealths.filter(w => {
      const matchHolding = !filters.holding || w.holding === filters.holding;
      const matchType = !filters.type || w.type === filters.type;
      const matchCurrency = !filters.currency || w.currency === filters.currency;
      
      return matchHolding && matchType && matchCurrency;
    });
  };

  const handleSave = async () => {
    try {
      const dataToSave = {
        holding: formData.holding,
        type: formData.type,
        currency: formData.currency,
        qty: parseFloat(formData.qty) || 0, // Save without comma
        accountNumber: formData.accountNumber,
        maturityDate: formData.maturityDate,
        interestRate: formData.interestRate,
      };

      if (screen === "add") {
        await addDoc(collection(db, "wealths"), dataToSave);
      } else if (screen === "edit") {
        const wealthRef = doc(db, "wealths", selectedWealth.id);
        await updateDoc(wealthRef, dataToSave);
      }
      fetchWealths();
      handleClose();
    } catch (error) {
      console.error("Error saving wealth:", error);
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

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.trim().split("\n");
        
        if (lines.length < 2) {
          alert("CSV file is empty or has no data rows");
          return;
        }

        // Parse header
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const requiredHeaders = ["holding", "type", "currency", "qty", "accountnumber", "maturitydate", "interestrate"];
        
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          alert(`Missing required headers: ${missingHeaders.join(", ")}`);
          return;
        }

        // Parse data rows
        let successCount = 0;
        let failureCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim());
          
          if (values.length < requiredHeaders.length || values[0] === "") {
            failureCount++;
            continue;
          }

          try {
            const dataToSave = {
              holding: values[headers.indexOf("holding")] || "",
              type: values[headers.indexOf("type")] || "",
              currency: values[headers.indexOf("currency")] || "",
              qty: parseFloat(values[headers.indexOf("qty")]) || 0,
              accountNumber: values[headers.indexOf("accountnumber")] || "",
              maturityDate: values[headers.indexOf("maturitydate")] || "",
              interestRate: values[headers.indexOf("interestrate")] || "",
            };

            await addDoc(collection(db, "wealths"), dataToSave);
            successCount++;
          } catch (error) {
            console.error("Error adding wealth from CSV:", error);
            failureCount++;
          }
        }

        alert(`CSV Import Complete!\nSuccess: ${successCount}\nFailure: ${failureCount}`);
        fetchWealths();
      } catch (error) {
        console.error("Error parsing CSV:", error);
        alert("Error parsing CSV file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportToExcel = () => {
    if (wealths.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ["Holding", "Type", "Currency", "Qty", "AccountNumber", "MaturityDate", "InterestRate"];
    const data = wealths.map((w) => [
      w.holding || "",
      w.type || "",
      w.currency || "",
      w.qty || "",
      w.accountNumber || "",
      w.maturityDate || "",
      w.interestRate || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...data.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `wealth_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";

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
              <h2>Wealth</h2>
              <div className="d-flex gap-2 flex-wrap">
                <button
                  className="btn btn-success"
                  onClick={handleAddClick}
                >
                  + Add Wealth
                </button>
                <button
                  className="btn btn-warning"
                  onClick={handleExportToExcel}
                >
                  📊 Export to Excel
                </button>
                <label className="btn btn-info mb-0">
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

            {/* Filter Section */}
            <div className="card mb-4 border-0 shadow-sm" style={{ borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h5 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Filters</h5>
                  {/* Summary Box */}
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', color: '#6c757d', fontWeight: '500' }}>Total AED</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#28a745' }}>
                        {(() => {
                          const total = getFilteredWealths().reduce((sum, w) => {
                            return sum + calculateBalanceAED(w.currency, w.qty, aedInrRate);
                          }, 0);
                          return total.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', color: '#6c757d', fontWeight: '500' }}>Total INR</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#dc3545' }}>
                        {(() => {
                          const total = getFilteredWealths().reduce((sum, w) => {
                            const balanceAED = calculateBalanceAED(w.currency, w.qty, aedInrRate);
                            return sum + calculateBalanceINR(balanceAED, aedInrRate);
                          }, 0);
                          return total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label fw-bold">Holding</label>
                    <select
                      className="form-select"
                      name="holding"
                      value={filters.holding}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Holdings</option>
                      {uniqueHoldings.map((holding, index) => (
                        <option key={index} value={holding}>
                          {holding}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label fw-bold">Type</label>
                    <select
                      className="form-select"
                      name="type"
                      value={filters.type}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Types</option>
                      {uniqueTypes.map((type, index) => (
                        <option key={index} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label fw-bold">Currency</label>
                    <select
                      className="form-select"
                      name="currency"
                      value={filters.currency}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Currencies</option>
                      {uniqueCurrencies.map((currency, index) => (
                        <option key={index} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label fw-bold" style={{ visibility: 'hidden' }}>Action</label>
                    <button
                      className="btn btn-outline-secondary w-100"
                      onClick={handleResetFilters}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {wealths.length === 0 ? (
              <div className="alert alert-info" role="alert">
                No wealth records found. <button className="btn btn-link" onClick={handleAddClick}>Add one now</button>
              </div>
            ) : (
              <div style={{ width: "100%", height: "650px", paddingTop: "20px" }} className="ag-theme-quartz">
                <AgGridReact
                  rowData={(() => {
                    // Get filtered data
                    const filteredWealths = getFilteredWealths();
                    
                    // Create rows from filtered wealths
                    const rows = filteredWealths.map((w) => {
                      const balanceAED = calculateBalanceAED(w.currency, w.qty, aedInrRate);
                      const balanceINR = calculateBalanceINR(balanceAED, aedInrRate);

                      return {
                        id: w.id,
                        holding: w.holding || "N/A",
                        type: w.type || "N/A",
                        currency: w.currency || "N/A",
                        balanceAED: balanceAED,
                        balanceINR: balanceINR,
                        maturityDate: w.maturityDate || "N/A",
                        interestRate: w.interestRate || "N/A",
                        originalData: w
                      };
                    });

                    return rows;
                  })()}
                  columnDefs={[
                    { 
                      field: "holding", 
                      headerName: "Holding",
                      sortable: true,
                      filter: true,
                      flex: 1
                    },
                    { 
                      field: "type", 
                      headerName: "Type",
                      sortable: true,
                      filter: true,
                      flex: 1
                    },
                    { 
                      field: "currency", 
                      headerName: "Currency",
                      sortable: true,
                      filter: true,
                      flex: 1
                    },
                    { 
                      field: "balanceAED", 
                      headerName: "Balance (AED)",
                      sortable: true,
                      filter: true,
                      flex: 1,
                      valueFormatter: (params) => formatCurrency(params.value),
                      cellStyle: (params) => ({
                        textAlign: "right",
                        fontWeight: params.data?.isGroupTotal ? "bold" : "normal",
                        backgroundColor: params.data?.isGroupTotal ? "#f0f0f0" : "transparent"
                      })
                    },
                    { 
                      field: "balanceINR", 
                      headerName: "Balance (INR)",
                      sortable: true,
                      filter: true,
                      flex: 1,
                      valueFormatter: (params) => formatCurrency(params.value),
                      cellStyle: (params) => ({
                        textAlign: "right",
                        fontWeight: params.data?.isGroupTotal ? "bold" : "normal",
                        backgroundColor: params.data?.isGroupTotal ? "#f0f0f0" : "transparent"
                      })
                    },
                    { 
                      field: "maturityDate", 
                      headerName: "Maturity Date",
                      sortable: true,
                      filter: "agDateColumnFilter",
                      flex: 1,
                      comparator: (valueA, valueB) => {
                        if (valueA === "N/A" && valueB === "N/A") return 0;
                        if (valueA === "N/A") return 1;
                        if (valueB === "N/A") return -1;
                        return new Date(valueA) - new Date(valueB);
                      }
                    },
                    { 
                      field: "interestRate", 
                      headerName: "Interest Rate",
                      sortable: true,
                      filter: true,
                      flex: 1
                    }
                  ]}
                  onRowClicked={(e) => {
                    if (e.data.originalData) {
                      handleRowClick(e.data.originalData);
                    }
                  }}
                  defaultColDef={{
                    sortable: true,
                    filter: true,
                    resizable: true
                  }}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            )}
          </>
        )}

        {/* VIEW SCREEN */}
        {screen === "view" && selectedWealth && (
          <div className="card shadow-lg">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">{selectedWealth.holding}</h5>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Holding:</strong> {selectedWealth.holding || "N/A"}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Type:</strong> {selectedWealth.type || "N/A"}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Country:</strong> {displayData.country || "N/A"}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Currency:</strong> {selectedWealth.currency || "N/A"}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Rate:</strong> {displayData.rate || "N/A"}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Rate Update Date:</strong> {displayData.rateUpdateDate || "N/A"}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Qty:</strong> {formatCurrency(selectedWealth.qty)}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Balance (AED):</strong> {formatCurrency(displayData.balanceAED)}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Balance (INR):</strong> {formatCurrency(displayData.balanceINR)}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Account Number:</strong> {selectedWealth.accountNumber || "N/A"}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Maturity Date:</strong> {selectedWealth.maturityDate || "N/A"}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Interest Rate:</strong> {selectedWealth.interestRate || "N/A"}%</p>
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
        {screen === "edit" && selectedWealth && (
          <div className="card shadow-lg">
            <div className="card-header bg-warning text-dark">
              <h5 className="mb-0">Edit: {selectedWealth.holding}</h5>
            </div>
            <div className="card-body">
              <form>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Holding *</label>
                    <select
                      className="form-control"
                      name="holding"
                      value={formData.holding || ""}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Holding</option>
                      {holdings.map((h) => (
                        <option key={h.id} value={h.title}>{h.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Country (Read Only)</label>
                    <input
                      type="text"
                      className="form-control bg-light text-muted"
                      value={displayData.country || ""}
                      disabled
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Currency *</label>
                    <select
                      className="form-control"
                      name="currency"
                      value={formData.currency || ""}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Currency</option>
                      {rates.map((r) => (
                        <option key={r.id} value={r.title}>{r.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Rate (Read Only)</label>
                    <input
                      type="text"
                      className="form-control bg-light text-muted"
                      value={displayData.rate || ""}
                      disabled
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Type *</label>
                    <select
                      className="form-control"
                      name="type"
                      value={formData.type || ""}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="Saving AED">Saving AED</option>
                      <option value="FD AED">FD AED</option>
                      <option value="Gold Investment">Gold Investment</option>
                      <option value="Stock">Stock</option>
                      <option value="Saving NRO">Saving NRO</option>
                      <option value="Saving NRE">Saving NRE</option>
                      <option value="FCNR">FCNR</option>
                      <option value="USD Cash">USD Cash</option>
                      <option value="FD INR">FD INR</option>
                      <option value="INR">INR</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      name="qty"
                      value={formData.qty || ""}
                      onChange={handleInputChange}
                      placeholder="0"
                    />
                    {formData.qty && <small className="text-muted">Formatted: {formatCurrency(formData.qty)}</small>}
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Balance (AED) - Auto Calculated (Read Only)</label>
                    <input
                      type="text"
                      className="form-control bg-light text-muted"
                      value={formatCurrency(displayData.balanceAED)}
                      disabled
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Balance (INR) - Auto Calculated (Read Only)</label>
                    <input
                      type="text"
                      className="form-control bg-light text-muted"
                      value={formatCurrency(displayData.balanceINR)}
                      disabled
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
                    <label className="form-label">Maturity Date</label>
                    <input
                      type="date"
                      className="form-control"
                      name="maturityDate"
                      value={formData.maturityDate || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Interest Rate (%)</label>
                    <input
                      type="text"
                      className="form-control"
                      name="interestRate"
                      value={formData.interestRate || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., 5.5"
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
              <h5 className="mb-0">Add New Wealth</h5>
            </div>
            <div className="card-body">
              <form>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Holding *</label>
                    <select
                      className="form-control"
                      name="holding"
                      value={formData.holding || ""}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Holding</option>
                      {holdings.map((h) => (
                        <option key={h.id} value={h.title}>{h.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Country (Read Only)</label>
                    <input
                      type="text"
                      className="form-control bg-light text-muted"
                      value={displayData.country || ""}
                      disabled
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Currency *</label>
                    <select
                      className="form-control"
                      name="currency"
                      value={formData.currency || ""}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Currency</option>
                      {rates.map((r) => (
                        <option key={r.id} value={r.title}>{r.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Rate (Read Only)</label>
                    <input
                      type="text"
                      className="form-control bg-light text-muted"
                      value={displayData.rate || ""}
                      disabled
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Type *</label>
                    <select
                      className="form-control"
                      name="type"
                      value={formData.type || ""}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="Saving AED">Saving AED</option>
                      <option value="FD AED">FD AED</option>
                      <option value="Gold Investment">Gold Investment</option>
                      <option value="Stock">Stock</option>
                      <option value="Saving NRO">Saving NRO</option>
                      <option value="Saving NRE">Saving NRE</option>
                      <option value="FCNR">FCNR</option>
                      <option value="USD Cash">USD Cash</option>
                      <option value="FD INR">FD INR</option>
                      <option value="INR">INR</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      name="qty"
                      value={formData.qty || ""}
                      onChange={handleInputChange}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Balance (AED) - Auto Calculated (Read Only)</label>
                    <input
                      type="text"
                      className="form-control bg-light text-muted"
                      value={formatCurrency(displayData.balanceAED)}
                      disabled
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Balance (INR) - Auto Calculated (Read Only)</label>
                    <input
                      type="text"
                      className="form-control bg-light text-muted"
                      value={formatCurrency(displayData.balanceINR)}
                      disabled
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
                    <label className="form-label">Maturity Date</label>
                    <input
                      type="date"
                      className="form-control"
                      name="maturityDate"
                      value={formData.maturityDate || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Interest Rate (%)</label>
                    <input
                      type="text"
                      className="form-control"
                      name="interestRate"
                      value={formData.interestRate || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., 5.5"
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
