import { useState } from "react";
import Navbar from "../components/Navbar";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

export default function HelpPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(null);

    try {
      const text = await file.text();
      
      // Parse CSV properly handling quoted fields
      const parseCSV = (csvText) => {
        const rows = [];
        let currentRow = [];
        let currentField = "";
        let insideQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
          const char = csvText[i];
          const nextChar = csvText[i + 1];

          if (char === '"') {
            if (insideQuotes && nextChar === '"') {
              // Escaped quote
              currentField += '"';
              i++;
            } else {
              // Toggle quote state
              insideQuotes = !insideQuotes;
            }
          } else if (char === "," && !insideQuotes) {
            // End of field
            currentRow.push(currentField.trim());
            currentField = "";
          } else if ((char === "\n" || char === "\r") && !insideQuotes) {
            // End of row
            if (currentField || currentRow.length > 0) {
              currentRow.push(currentField.trim());
              if (currentRow.some(f => f)) {
                rows.push(currentRow);
              }
              currentRow = [];
              currentField = "";
            }
            // Skip \r\n
            if (char === "\r" && nextChar === "\n") {
              i++;
            }
          } else {
            currentField += char;
          }
        }

        // Add last field and row
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField.trim());
          if (currentRow.some(f => f)) {
            rows.push(currentRow);
          }
        }

        return rows;
      };

      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        setUploadStatus({ type: "error", message: "CSV must have headers and at least 1 data row" });
        setUploading(false);
        return;
      }

      // Parse headers
      const headers = rows[0].map(h => h.toLowerCase());
      const titleIdx = headers.indexOf("title");
      const noteIdx = headers.indexOf("note");
      const tagsIdx = headers.indexOf("tags");

      if (titleIdx === -1 || noteIdx === -1) {
        setUploadStatus({ type: "error", message: "CSV must have 'title' and 'note' columns" });
        setUploading(false);
        return;
      }

      let successCount = 0;
      let failureCount = 0;

      // Parse data rows
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        
        if (!values[titleIdx] || values[titleIdx].length === 0) {
          failureCount++;
          continue;
        }

        try {
          const noteData = {
            title: values[titleIdx],
            note: values[noteIdx] || "",
            tags: tagsIdx !== -1 && values[tagsIdx] 
              ? values[tagsIdx].split(/[,;]/).map(t => t.trim()).filter(t => t)
              : [],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await addDoc(collection(db, "notes"), noteData);
          successCount++;
        } catch (err) {
          console.error("Error adding note:", err);
          failureCount++;
        }
      }

      setUploadStatus({ 
        type: "success", 
        message: `Import complete! ${successCount} notes added${failureCount > 0 ? `, ${failureCount} failed` : ""}.` 
      });
    } catch (error) {
      console.error("Error reading CSV:", error);
      setUploadStatus({ type: "error", message: "Error reading CSV file: " + error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mt-5 pb-5">
        <h1 className="mb-4">Help & Documentation</h1>

        {/* Rates Section */}
        <div className="card mb-4">
          <div className="card-header bg-info text-white">
            <h5 className="mb-0">Rates Management</h5>
          </div>
          <div className="card-body">
            <p>The Rates module allows you to manage exchange rates and other rates:</p>
            <ul>
              <li><strong>Title:</strong> Name of the rate (e.g., USD-INR, AED-INR)</li>
              <li><strong>Value:</strong> The numeric value of the rate</li>
              <li><strong>Source:</strong> Where the rate comes from - Select from:
                <ul>
                  <li>Static</li>
                  <li>API</li>
                  <li>exchangerate-api</li>
                  <li>alphavantage-api</li>
                </ul>
              </li>
              <li><strong>API URL:</strong> URL if source is API-based</li>
              <li><strong>Rate Update Date:</strong> When the rate was last updated (date-time picker)</li>
            </ul>
            <p className="text-muted"><strong>Note:</strong> Create a rate with Title "AED-INR" for INR conversion calculations to work correctly.</p>
          </div>
        </div>

        {/* Holdings Section */}
        <div className="card mb-4">
          <div className="card-header bg-success text-white">
            <h5 className="mb-0">Holdings Management</h5>
          </div>
          <div className="card-body">
            <p>The Holdings module allows you to track your investment holdings:</p>
            <ul>
              <li><strong>Title:</strong> Name of the holding (Company name, investment name)</li>
              <li><strong>Country:</strong> Country of the holding (UAE, India, USA)</li>
              <li><strong>Currency:</strong> Currency of the holding (AED, INR, USD)</li>
              <li><strong>Contact Person:</strong> Contact person for the holding</li>
              <li><strong>Contact No:</strong> Contact number</li>
              <li><strong>Website:</strong> Company or investment website</li>
              <li><strong>Login:</strong> Login credentials (stored securely)</li>
              <li><strong>Notes:</strong> Additional notes (supports multiple lines)</li>
            </ul>
            <h6 className="mt-3">CSV Import/Export</h6>
            <p>You can bulk import and export holdings using CSV files.</p>
            <p><strong>Required CSV Headers:</strong></p>
            <code>Title, Country, Currency, ContactPerson, ContactNo, Website, Login, Notes</code>
            <p><strong>Example CSV Row:</strong></p>
            <code>CompanyA, UAE, AED, John Doe, +971501234567, www.example.com, user@pass, Some notes</code>
          </div>
        </div>

        {/* Wealth Section */}
        <div className="card mb-4">
          <div className="card-header bg-warning text-dark">
            <h5 className="mb-0">Wealth Management</h5>
          </div>
          <div className="card-body">
            <p>The Wealth module allows you to track and manage your wealth investments:</p>
            <ul>
              <li><strong>Holding:</strong> Select from your Holdings list (auto-populates country)</li>
              <li><strong>Type:</strong> Classification of the wealth - Select from:
                <ul>
                  <li>Saving AED</li>
                  <li>FD AED</li>
                  <li>Gold Investment</li>
                  <li>Stock</li>
                  <li>Saving NRO</li>
                  <li>Saving NRE</li>
                  <li>FCNR</li>
                  <li>USD Cash</li>
                  <li>FD INR</li>
                  <li>INR</li>
                </ul>
              </li>
              <li><strong>Country:</strong> Auto-populated from the selected Holding (Read-only)</li>
              <li><strong>Currency:</strong> Select exchange rate from Rates table (e.g., USD-INR, AED-INR)</li>
              <li><strong>Rate:</strong> Auto-populated from selected Currency/Rate (Read-only)</li>
              <li><strong>Qty:</strong> Quantity or amount (displays with comma formatting)</li>
              <li><strong>Balance (AED):</strong> Auto-calculated as Qty × Rate (Read-only)</li>
              <li><strong>Balance (INR):</strong> Auto-calculated as Balance(AED) × AED-INR rate (Read-only)</li>
              <li><strong>Account Number:</strong> Account number for the wealth</li>
              <li><strong>Maturity Date:</strong> Date picker for maturity (if applicable)</li>
              <li><strong>Interest Rate:</strong> Interest rate percentage</li>
            </ul>
            <h6 className="mt-3">CSV Import/Export</h6>
            <p>You can bulk import and export wealth records using CSV files.</p>
            <p><strong>Required CSV Headers:</strong></p>
            <code>Holding, Type, Currency, Qty, AccountNumber, MaturityDate, InterestRate</code>
            <p><strong>Example CSV Row:</strong></p>
            <code>CompanyA, FD AED, USD-INR, 10000, ACC123, 2024-12-31, 5.5</code>
            <p className="text-muted"><strong>Notes:</strong></p>
            <ul>
              <li>Qty should be entered without commas in CSV (e.g., 10000 not 10,000)</li>
              <li>MaturityDate format: YYYY-MM-DD</li>
              <li>InterestRate should be numeric (e.g., 5.5)</li>
              <li>Type must match one of the predefined options</li>
              <li>The listing screen shows: Holding, Type, Currency, Balance (AED), Balance (INR)</li>
            </ul>
          </div>
        </div>

        {/* Notes Section */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Notes Management</h5>
          </div>
          <div className="card-body">
            <p>The Notes module allows you to create, edit, and organize notes with rich text formatting:</p>
            <ul>
              <li><strong>Title:</strong> Title of the note (required)</li>
              <li><strong>Note:</strong> Rich text content with formatting (bold, italic, headings, lists, etc.)</li>
              <li><strong>Tags:</strong> Assign tags to categorize and organize notes</li>
            </ul>
            <h6 className="mt-4">CSV Import</h6>
            <p>You can bulk import notes using CSV files. The system will create multiple notes in one upload.</p>
            <p><strong>Required CSV Headers:</strong></p>
            <code>title, note, tags</code>
            <p><strong>Column Descriptions:</strong></p>
            <ul>
              <li><strong>title:</strong> Note title (required, cannot be empty)</li>
              <li><strong>note:</strong> Note content in plain text or basic HTML (required)</li>
              <li><strong>tags:</strong> Comma or semicolon-separated tag names (optional, e.g., "important;urgent;work")</li>
            </ul>
            <p><strong>Example CSV:</strong></p>
            <div style={{ backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px", marginBottom: "16px", overflowX: "auto" }}>
              <code>title,note,tags<br/>
              Meeting Notes,Discussed project timeline and deliverables,important;work<br/>
              TODO List,Buy groceries and pay bills,personal;urgent<br/>
              Ideas,"Brainstorm new features for Q2",ideas;development"</code>
            </div>
            
            <h6 className="mt-3">Upload CSV File</h6>
            <p className="text-muted mb-3">Select a CSV file to import multiple notes at once:</p>
            <div style={{ marginBottom: "16px" }}>
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                disabled={uploading}
                style={{
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  marginRight: "10px"
                }}
              />
              <span style={{ color: "#666", fontSize: "0.9rem" }}>
                {uploading ? "Uploading..." : "Choose a CSV file"}
              </span>
            </div>
            
            {uploadStatus && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "4px",
                  marginTop: "12px",
                  backgroundColor: uploadStatus.type === "success" ? "#d4edda" : "#f8d7da",
                  color: uploadStatus.type === "success" ? "#155724" : "#721c24",
                  border: `1px solid ${uploadStatus.type === "success" ? "#c3e6cb" : "#f5c6cb"}`
                }}
              >
                {uploadStatus.message}
              </div>
            )}

            <p className="text-muted mt-4 mb-0"><strong>Import Tips:</strong></p>
            <ul className="text-muted">
              <li>First row must contain headers (case-insensitive)</li>
              <li>Empty rows are automatically skipped</li>
              <li>For tags, use semicolons (;) to separate multiple tags</li>
              <li>Tags are created automatically if they don't exist</li>
              <li>Each row creates one note - all imported notes will have current date/time</li>
              <li>After import completes, you'll see success/failure counts</li>
            </ul>
          </div>
        </div>

        {/* Settings Section */}
        <div className="card mb-4">
          <div className="card-header bg-secondary text-white">
            <h5 className="mb-0">Settings Management</h5>
          </div>
          <div className="card-body">
            <p>The Settings module allows you to store key-value pairs for your application:</p>
            <ul>
              <li><strong>Key:</strong> Name of the setting (read-only)</li>
              <li><strong>Value:</strong> Value of the setting (text field, editable)</li>
            </ul>
            <p className="text-muted">Use this to store configuration values that you want to manage dynamically.</p>
          </div>
        </div>

        {/* Users Section */}
        <div className="card mb-4">
          <div className="card-header bg-danger text-white">
            <h5 className="mb-0">Users Management</h5>
          </div>
          <div className="card-body">
            <p>The Users module allows you to manage user accounts and permissions:</p>
            <ul>
              <li><strong>Email:</strong> User email address (unique identifier)</li>
              <li><strong>Role:</strong> User role (Admin or User)</li>
              <li><strong>Display Name:</strong> User's display name</li>
              <li><strong>Status:</strong> Active or Inactive</li>
            </ul>
            <p className="text-muted"><strong>Admin Users:</strong> Can manage all data and users in the application.</p>
          </div>
        </div>

          {/* US Portfolio Section */}
          <div className="card mb-4">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">US Portfolio Management</h5>
            </div>
            <div className="card-body">
              <p>The US Portfolio module allows you to track your US stock investments.</p>
              <ul>
                <li><strong>Stock Name:</strong> Name of the stock</li>
                <li><strong>Symbol:</strong> Stock symbol</li>
                <li><strong>Buy Price:</strong> Price at which stock was bought (currency format)</li>
                <li><strong>Qty:</strong> Number of shares</li>
                <li><strong>Current Price:</strong> Current market price (currency format)</li>
              </ul>
              <h6 className="mt-4">CSV Import</h6>
              <p>You can bulk import portfolio entries using CSV files. The system will create multiple entries in one upload.</p>
              <p><strong>Required CSV Headers:</strong></p>
              <code>Stock Name, Symbol, Buy Price, Qty, Current Price</code>
              <p><strong>Example CSV Row:</strong></p>
              <code>Apple Inc, AAPL, 150.25, 10, 175.50</code>
              <div style={{ marginTop: '12px' }}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setUploading(true);
                    setUploadStatus(null);
                    try {
                      const text = await file.text();
                      const lines = text.trim().split(/\r?\n/);
                      if (lines.length < 2) {
                        setUploadStatus({ type: 'error', message: 'CSV must have headers and at least 1 data row' });
                        setUploading(false);
                        return;
                      }
                      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                      const idx = {
                        stockName: headers.indexOf('stock name'),
                        symbol: headers.indexOf('symbol'),
                        buyPrice: headers.indexOf('buy price'),
                        qty: headers.indexOf('qty'),
                        currentPrice: headers.indexOf('current price'),
                      };
                      if (Object.values(idx).some(i => i === -1)) {
                        setUploadStatus({ type: 'error', message: 'CSV must have Stock Name, Symbol, Buy Price, Qty, Current Price columns' });
                        setUploading(false);
                        return;
                      }
                      let successCount = 0;
                      let failureCount = 0;
                      for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        const values = lines[i].split(',').map(v => v.trim());
                        try {
                          await addDoc(collection(db, 'portfolio'), {
                            stockName: values[idx.stockName],
                            symbol: values[idx.symbol],
                            buyPrice: parseFloat(values[idx.buyPrice]),
                            qty: parseFloat(values[idx.qty]),
                            currentPrice: parseFloat(values[idx.currentPrice]),
                          });
                          successCount++;
                        } catch (err) {
                          failureCount++;
                        }
                      }
                      setUploadStatus({ type: 'success', message: `Import complete! ${successCount} entries added${failureCount > 0 ? `, ${failureCount} failed` : ''}.` });
                    } catch (err) {
                      setUploadStatus({ type: 'error', message: 'Error reading CSV file: ' + err.message });
                    } finally {
                      setUploading(false);
                    }
                  }}
                  disabled={uploading}
                  style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', marginRight: '10px' }}
                />
                <span style={{ color: '#666', fontSize: '0.9rem' }}>
                  {uploading ? 'Uploading...' : 'Choose a CSV file'}
                </span>
                {uploadStatus && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '4px',
                      marginTop: '12px',
                      backgroundColor: uploadStatus.type === 'success' ? '#d4edda' : '#f8d7da',
                      color: uploadStatus.type === 'success' ? '#155724' : '#721c24',
                      border: `1px solid ${uploadStatus.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                    }}
                  >
                    {uploadStatus.message}
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Data Formats Section */}
        <div className="card mb-4">
          <div className="card-header bg-light border-bottom">
            <h5 className="mb-0">Common Data Formats</h5>
          </div>
          <div className="card-body">
            <h6>Currency Formatting</h6>
            <p>All currency fields automatically display with thousand separators (commas) and 2 decimal places.</p>
            <p><strong>Example:</strong> 1000000.50 displays as 1,000,000.50</p>
            
            <h6 className="mt-3">Date Format</h6>
            <p>Date fields use the standard date picker format: YYYY-MM-DD</p>
            
            <h6 className="mt-3">CSV Import Rules</h6>
            <ul>
              <li>First row should contain headers (case-insensitive)</li>
              <li>Empty rows are skipped</li>
              <li>Rows with missing required fields are counted as failures</li>
              <li>After import, you'll see Success and Failure counts</li>
            </ul>
          </div>
        </div>

        {/* Contact & Support Section */}
        <div className="card mb-4">
          <div className="card-header bg-light border-bottom">
            <h5 className="mb-0">Tips & Best Practices</h5>
          </div>
          <div className="card-body">
            <ul>
              <li>Always ensure the "AED-INR" rate exists for proper INR balance calculations</li>
              <li>Use consistent naming for Holdings and Rates for easy reference</li>
              <li>Regularly update exchange rates for accurate balance calculations</li>
              <li>Backup your data by regularly exporting to CSV</li>
              <li>Use the View screen to verify data before editing</li>
              <li>Maturity dates in Wealth help you track investment timelines</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
