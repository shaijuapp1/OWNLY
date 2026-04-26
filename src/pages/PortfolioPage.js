
import React, { useEffect, useState } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import axios from 'axios';
import { db } from '../firebase';
import Navbar from '../components/Navbar';

const currencyFormat = (num) => {
  if (num === undefined || num === null) return '';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const numberFormat = (num) => {
  if (num === undefined || num === null) return '';
  return num.toLocaleString('en-US');
};

const formatLocalDateTime = (value) => {
  if (!value) return 'N/A';
  const date = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const initialForm = {
  stockName: '',
  symbol: '',
  buyPrice: '',
  qty: '',
  currentPrice: '',
  lastUpdated: null,
};


export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState([]);
  const [screen, setScreen] = useState('listing'); // listing, view, add, edit
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  // Sorting logic
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      } else {
        return { key, direction: 'asc' };
      }
    });
  };

  const sortedPortfolio = React.useMemo(() => {
    if (!sortConfig.key) return portfolio;
    const sorted = [...portfolio].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      // For computed columns
      if (sortConfig.key === 'diff') {
        aValue = a.currentPrice - a.buyPrice;
        bValue = b.currentPrice - b.buyPrice;
      } else if (sortConfig.key === 'totalBuy') {
        aValue = a.buyPrice * a.qty;
        bValue = b.buyPrice * b.qty;
      } else if (sortConfig.key === 'currentValue') {
        aValue = a.currentPrice * a.qty;
        bValue = b.currentPrice * b.qty;
      } else if (sortConfig.key === 'pl') {
        aValue = (a.currentPrice * a.qty) - (a.buyPrice * a.qty);
        bValue = (b.currentPrice * b.qty) - (b.buyPrice * b.qty);
      }
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [portfolio, sortConfig]);

  // Helper to check if lastUpdated is over 1 hour ago
  const isStale = (lastUpdated) => {
    if (!lastUpdated) return true;
    const last = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated.toDate ? lastUpdated.toDate() : lastUpdated;
    return (Date.now() - last.getTime()) > 60 * 60 * 1000;
  };

  // Helper to fetch latest price from AlphaVantage
  const fetchLatestPrice = async (symbol) => {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&apikey=RUXQDNE5MAXBILQJ&symbol=${symbol}`;
      const res = await axios.get(url);
      const price = parseFloat(res.data["Global Quote"] && res.data["Global Quote"]["05. price"]);
      return isNaN(price) ? null : price;
    } catch {
      return null;
    }
  };

  const fetchPortfolio = async () => {
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, 'portfolio'));
    let items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Update stale prices except for 'cash'
    const updates = await Promise.all(items.map(async (item) => {
      if (item.symbol && item.symbol.toLowerCase() !== 'cash' && isStale(item.lastUpdated)) {
        const latest = await fetchLatestPrice(item.symbol);
        if (latest) {
          await updateDoc(doc(db, 'portfolio', item.id), {
            currentPrice: latest,
            lastUpdated: new Date(),
          });
          return { ...item, currentPrice: latest, lastUpdated: new Date() };
        }
      }
      return item;
    }));
    setPortfolio(updates);
    setLoading(false);
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleRowClick = (item) => {
    setSelected(item);
    setScreen('view');
  };

  const handleAddClick = () => {
    setForm(initialForm);
    setSelected(null);
    setScreen('add');
  };

  const handleEditClick = () => {
    setForm({
      stockName: selected.stockName,
      symbol: selected.symbol,
      buyPrice: selected.buyPrice.toString(),
      qty: selected.qty.toString(),
      currentPrice: selected.currentPrice.toString(),
    });
    setScreen('edit');
  };

  const handleClose = () => {
    setScreen('listing');
    setSelected(null);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      await deleteDoc(doc(db, 'portfolio', selected.id));
      fetchPortfolio();
      handleClose();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let val = value;
    if (["buyPrice", "qty", "currentPrice"].includes(name)) {
      val = val.replace(/,/g, '');
    }
    setForm({ ...form, [name]: val });
  };

  const handleSave = async () => {
    const data = {
      stockName: form.stockName,
      symbol: form.symbol,
      buyPrice: parseFloat(form.buyPrice),
      qty: parseFloat(form.qty),
      currentPrice: parseFloat(form.currentPrice),
      lastUpdated: new Date(),
    };
    if (screen === 'add') {
      await addDoc(collection(db, 'portfolio'), data);
    } else if (screen === 'edit') {
      await updateDoc(doc(db, 'portfolio', selected.id), data);
    }
    fetchPortfolio();
    handleClose();
  };

  // Totals
  const totalBuy = portfolio.reduce((sum, p) => sum + (p.buyPrice * p.qty), 0);
  const totalValue = portfolio.reduce((sum, p) => sum + (p.currentPrice * p.qty), 0);
  const totalPL = totalValue - totalBuy;

  return (
    <>
      <Navbar />
      <div className="container-fluid mt-5 px-3 px-md-5">
        {/* LISTING SCREEN */}
        {screen === 'listing' && (
          <>
            <h2 className="mb-4">US Portfolio</h2>
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th style={{cursor:'pointer'}} onClick={() => handleSort('stockName')}>
                      Stock Name {sortConfig.key === 'stockName' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{cursor:'pointer'}} onClick={() => handleSort('symbol')}>
                      Symbol {sortConfig.key === 'symbol' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{cursor:'pointer'}} onClick={() => handleSort('buyPrice')}>
                      Buy Price {sortConfig.key === 'buyPrice' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{cursor:'pointer'}} onClick={() => handleSort('currentPrice')}>
                      Market Price {sortConfig.key === 'currentPrice' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{cursor:'pointer'}} onClick={() => handleSort('diff')}>
                      Diff {sortConfig.key === 'diff' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{cursor:'pointer'}} onClick={() => handleSort('qty')}>
                      Qty {sortConfig.key === 'qty' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{cursor:'pointer'}} onClick={() => handleSort('totalBuy')}>
                      Total Buy {sortConfig.key === 'totalBuy' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{cursor:'pointer'}} onClick={() => handleSort('currentValue')}>
                      Current Value {sortConfig.key === 'currentValue' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{cursor:'pointer'}} onClick={() => handleSort('pl')}>
                      P&amp;L {sortConfig.key === 'pl' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="10">Loading...</td></tr>
                  ) : sortedPortfolio.length === 0 ? (
                    <tr><td colSpan="10">No data</td></tr>
                  ) : (
                    sortedPortfolio.map(item => {
                      const totalBuy = item.buyPrice * item.qty;
                      const value = item.currentPrice * item.qty;
                      const pl = value - totalBuy;
                      return (
                        <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => handleRowClick(item)}>
                          <td>{item.stockName}</td>
                          <td>{item.symbol}</td>
                          <td>{currencyFormat(item.buyPrice)}</td>
                          <td>{currencyFormat(item.currentPrice)}</td>
                          <td>
                            <span style={{ color: (item.currentPrice - item.buyPrice) >= 0 ? 'green' : 'red' }}>
                              {currencyFormat(item.currentPrice - item.buyPrice)}
                            </span>
                          </td>
                          <td>{numberFormat(item.qty)}</td>
                          <td>{currencyFormat(totalBuy)}</td>
                          <td>{currencyFormat(value)}</td>
                          <td style={{ color: pl >= 0 ? 'green' : 'red' }}>{currencyFormat(pl)}</td>
                          <td>{formatLocalDateTime(item.lastUpdated)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="6"><b>Grand Totals</b></td>
                    <td><b>{currencyFormat(totalBuy)}</b></td>
                    <td><b>{currencyFormat(totalValue)}</b></td>
                    <td style={{ color: totalPL >= 0 ? 'green' : 'red' }}><b>{currencyFormat(totalPL)}</b></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {/* Floating Add Button */}
            <button
              className="btn btn-success rounded-circle shadow-lg"
              style={{ position: 'fixed', bottom: 32, right: 32, width: 60, height: 60, fontSize: 32, zIndex: 1000 }}
              onClick={handleAddClick}
              title="Add New Portfolio Entry"
            >
              +
            </button>
          </>
        )}

        {/* VIEW SCREEN */}
        {screen === 'view' && selected && (
          <div className="card shadow-lg">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">{selected.stockName} ({selected.symbol})</h5>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Stock Name:</strong> {selected.stockName}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Symbol:</strong> {selected.symbol}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Buy Price:</strong> {currencyFormat(selected.buyPrice)}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Qty:</strong> {numberFormat(selected.qty)}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Current Price:</strong> {currencyFormat(selected.currentPrice)}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Total Buy:</strong> {currencyFormat(selected.buyPrice * selected.qty)}</p>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Value:</strong> {currencyFormat(selected.currentPrice * selected.qty)}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>P&amp;L:</strong> <span style={{ color: (selected.currentPrice * selected.qty - selected.buyPrice * selected.qty) >= 0 ? 'green' : 'red' }}>{currencyFormat(selected.currentPrice * selected.qty - selected.buyPrice * selected.qty)}</span></p>
                </div>
              </div>
            </div>
            <div className="card-footer d-flex gap-2">
              <button className="btn btn-warning" onClick={handleEditClick}>Edit</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              <button className="btn btn-secondary" onClick={handleClose}>Close</button>
            </div>
          </div>
        )}

        {/* ADD/EDIT SCREEN */}
        {(screen === 'add' || screen === 'edit') && (
          <div className="card shadow-lg">
            <div className={`card-header ${screen === 'add' ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
              <h5 className="mb-0">{screen === 'add' ? 'Add New Portfolio Entry' : `Edit: ${form.stockName}`}</h5>
            </div>
            <div className="card-body">
              <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
                <div className="mb-3">
                  <label className="form-label">Stock Name *</label>
                  <input type="text" className="form-control" name="stockName" value={form.stockName} onChange={handleInputChange} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Symbol *</label>
                  <input type="text" className="form-control" name="symbol" value={form.symbol} onChange={handleInputChange} required />
                </div>
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Buy Price *</label>
                    <input type="text" className="form-control" name="buyPrice" value={numberFormat(form.buyPrice)} onChange={handleInputChange} required />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Qty *</label>
                    <input type="text" className="form-control" name="qty" value={numberFormat(form.qty)} onChange={handleInputChange} required />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Current Price *</label>
                    <input type="text" className="form-control" name="currentPrice" value={numberFormat(form.currentPrice)} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="d-flex gap-2 flex-wrap mt-3">
                  <button type="submit" className="btn btn-primary">Save</button>
                  <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
