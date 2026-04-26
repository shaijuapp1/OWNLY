import React, { useState, useEffect } from "react";
import { db } from '../firebase';
import { collection, getDocs } from "firebase/firestore";
import Navbar from "../components/Navbar";
import { Bar, Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import { getAEDINRRate, calculateBalanceAED } from "../utils/exchangeRateCache";

// Helper to format currency
const formatCurrency = (value) => {
  if (!value && value !== 0) return "0.00";
  const num = parseFloat(value);
  return isNaN(num) ? "0.00" : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper to format INR in crores
const formatInrCrores = (value) => {
  const num = parseFloat(value) || 0;
  const crores = num / 10000000;
  return `₹${crores.toFixed(2)} Cr`;
};

// Helper to format AED in millions
const formatAedMillions = (value) => {
  const num = parseFloat(value) || 0;
  const millions = num / 1000000;
  return `${millions.toFixed(2)}M`;
};

export default function WealthReport() {
  const [reportData, setReportData] = useState([]);
  const [typeData, setTypeData] = useState([]);
  const [countryData, setCountryData] = useState([]);
  const [currencyData, setCurrencyData] = useState([]);
  const [aedInrRate, setAedInrRate] = useState(25.3605);
  const [loading, setLoading] = useState(true);

  // Fetch data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch AED-INR rate first
        const rate = await getAEDINRRate();
        setAedInrRate(rate);

        // Fetch wealths
        const wealthSnapshot = await getDocs(collection(db, "wealths"));
        const wealths = wealthSnapshot.docs.map(doc => doc.data());

        // Fetch holdings to get country and type info
        const holdingsSnapshot = await getDocs(collection(db, "holdings"));
        const holdings = holdingsSnapshot.docs.map(doc => doc.data());
        const holdingsMap = {};
        holdings.forEach(h => {
          holdingsMap[h.title] = { country: h.country || "N/A", type: h.type || "N/A" };
        });

        // Group by holding and calculate totals
        const groupedData = {};
        const typeGroupedData = {};
        const countryGroupedData = {};
        const currencyGroupedData = {};
        
        wealths.forEach((w) => {
          const holding = w.holding || "N/A";
          const country = holdingsMap[holding]?.country || "N/A";
          const type = w.type || "N/A";
          const currency = w.currency || "N/A";

          // Group by holding
          if (!groupedData[holding]) {
            groupedData[holding] = 0;
          }
          
          // Group by type
          if (!typeGroupedData[type]) {
            typeGroupedData[type] = 0;
          }
          
          // Group by country
          if (!countryGroupedData[country]) {
            countryGroupedData[country] = 0;
          }

          // Group by currency
          if (!currencyGroupedData[currency]) {
            currencyGroupedData[currency] = 0;
          }

          // Calculate balance AED using the new utility function
          const balanceAED = calculateBalanceAED(w.currency, w.qty, rate);
          groupedData[holding] += balanceAED;
          typeGroupedData[type] += balanceAED;
          countryGroupedData[country] += balanceAED;
          currencyGroupedData[currency] += balanceAED;
        });

        // Convert holdings to array and sort by Total (AED) descending
        const reportArray = Object.keys(groupedData)
          .map(holding => ({
            holding: holding,
            totalAED: groupedData[holding],
            totalINR: groupedData[holding] * rate
          }))
          .sort((a, b) => b.totalAED - a.totalAED);

        // Convert types to array and sort by Total (AED) descending
        const typeArray = Object.keys(typeGroupedData)
          .map(type => ({
            type: type,
            totalAED: typeGroupedData[type],
            totalINR: typeGroupedData[type] * rate
          }))
          .sort((a, b) => b.totalAED - a.totalAED);

        // Convert countries to array and sort by Total (AED) descending
        const countryArray = Object.keys(countryGroupedData)
          .map(country => ({
            country: country,
            totalAED: countryGroupedData[country],
            totalINR: countryGroupedData[country] * rate
          }))
          .sort((a, b) => b.totalAED - a.totalAED);

        // Convert currencies to array and sort by Total (AED) descending
        const currencyArray = Object.keys(currencyGroupedData)
          .map(currency => ({
            currency: currency,
            totalAED: currencyGroupedData[currency],
            totalINR: currencyGroupedData[currency] * rate
          }))
          .sort((a, b) => b.totalAED - a.totalAED);

        setReportData(reportArray);
        setTypeData(typeArray);
        setCountryData(countryArray);
        setCurrencyData(currencyArray);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Chart data
  const chartData = {
    labels: reportData.map(item => item.holding),
    datasets: [
      {
        label: 'Total Balance (AED)',
        data: reportData.map(item => item.totalAED),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(199, 199, 199, 0.7)',
          'rgba(83, 102, 255, 0.7)',
          'rgba(255, 99, 255, 0.7)',
          'rgba(99, 255, 132, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)',
          'rgba(83, 102, 255, 1)',
          'rgba(255, 99, 255, 1)',
          'rgba(99, 255, 132, 1)',
        ],
        borderWidth: 1,
        borderRadius: 5
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Wealth Distribution by Holding'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Balance (AED)'
        }
      }
    }
  };

  // Chart data for types
  const typeChartData = {
    labels: typeData.map(item => item.type),
    datasets: [
      {
        label: 'Total Balance (AED)',
        data: typeData.map(item => item.totalAED),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(199, 199, 199, 0.7)',
          'rgba(83, 102, 255, 0.7)',
          'rgba(255, 99, 255, 0.7)',
          'rgba(99, 255, 132, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)',
          'rgba(83, 102, 255, 1)',
          'rgba(255, 99, 255, 1)',
          'rgba(99, 255, 132, 1)',
        ],
        borderWidth: 1,
        borderRadius: 5
      }
    ]
  };

  const typeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Wealth Distribution by Type'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Balance (AED)'
        }
      }
    }
  };

  // Pie chart data for countries
  const pieChartData = {
    labels: countryData.map(item => item.country),
    datasets: [
      {
        label: 'Total Balance (AED)',
        data: countryData.map(item => item.totalAED),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(199, 199, 199, 0.7)',
          'rgba(83, 102, 255, 0.7)',
          'rgba(255, 99, 255, 0.7)',
          'rgba(99, 255, 132, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)',
          'rgba(83, 102, 255, 1)',
          'rgba(255, 99, 255, 1)',
          'rgba(99, 255, 132, 1)',
        ],
        borderWidth: 2
      }
    ]
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          generateLabels: function(chart) {
            const data = chart.data;
            const datasets = data.datasets;
            const labels = data.labels || [];
            const total = datasets[0].data.reduce((sum, val) => sum + val, 0);
            return labels.map((label, i) => ({
              text: `${label} (${((datasets[0].data[i] / total) * 100).toFixed(1)}%)`,
              fillStyle: datasets[0].backgroundColor[i],
              hidden: false,
              index: i
            }));
          }
        }
      },
      title: {
        display: true,
        text: 'Wealth Distribution by Country'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = formatCurrency(context.parsed);
            const percentage = ((context.parsed / countryData.reduce((sum, item) => sum + item.totalAED, 0)) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Pie chart data for currencies
  const currencyPieChartData = {
    labels: currencyData.map(item => item.currency),
    datasets: [
      {
        label: 'Total Balance (AED)',
        data: currencyData.map(item => item.totalAED),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 2
      }
    ]
  };

  const currencyPieChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          generateLabels: function(chart) {
            const data = chart.data;
            const datasets = data.datasets;
            const labels = data.labels || [];
            const total = datasets[0].data.reduce((sum, val) => sum + val, 0);
            return labels.map((label, i) => ({
              text: `${label} (${((datasets[0].data[i] / total) * 100).toFixed(1)}%)`,
              fillStyle: datasets[0].backgroundColor[i],
              hidden: false,
              index: i
            }));
          }
        }
      },
      title: {
        display: true,
        text: 'Wealth Distribution by Currency'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = formatCurrency(context.parsed);
            const percentage = ((context.parsed / currencyData.reduce((sum, item) => sum + item.totalAED, 0)) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mt-5">
          <div className="alert alert-info">Loading report data...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container-fluid mt-4 px-4">
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Wealth Report</h1>

        {reportData.length === 0 ? (
          <div className="alert alert-info" role="alert">
            No wealth data available to generate report.
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="row mb-4 g-3">
              <div className="col-md-4">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', color: 'white', padding: '0.75rem 2rem' }}>
                    <p style={{ fontSize: '1.8rem', opacity: 0.95, marginBottom: 0, fontWeight: '600' }}>
                      AED {formatAedMillions(reportData.reduce((sum, item) => sum + item.totalAED, 0))}
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ background: 'linear-gradient(135deg, #0066cc 0%, #004d99 100%)', color: 'white', padding: '0.75rem 2rem' }}>
                    <p style={{ fontSize: '1.8rem', opacity: 0.95, marginBottom: 0, fontWeight: '600' }}>
                      USD {formatAedMillions(reportData.reduce((sum, item) => sum + item.totalAED / 3.68, 0))}
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ background: 'linear-gradient(135deg, #fd7e14 0%, #e56d0a 100%)', color: 'white', padding: '0.75rem 2rem' }}>
                    <p style={{ fontSize: '1.8rem', opacity: 0.95, marginBottom: 0, fontWeight: '600' }}>
                      INR {formatInrCrores(reportData.reduce((sum, item) => sum + item.totalINR, 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Holdings Section */}
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '2rem', marginBottom: '1.5rem' }}>Holding Summary</h3>
            <div className="row mb-5 g-3">
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', border: '1px solid #e9ecef' }}>
                  <div className="card-body p-4">
                    <h5 className="card-title mb-3" style={{ fontSize: '1.1rem', fontWeight: '600' }}>Holdings</h5>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table table-hover mb-0" style={{ borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f8f9fa' }}>
                          <tr>
                            <th style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Holding</th>
                            <th className="text-end" style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Total (AED)</th>
                            <th className="text-end" style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Total (USD)</th>
                            <th className="text-end" style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Total (INR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.map((item, index) => {
                            const totalUSD = item.totalAED / 3.68;
                            return (
                            <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                              <td style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#333' }}>{item.holding}</td>
                              <td className="text-end fw-bold" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#28a745' }}>{formatCurrency(item.totalAED)}</td>
                              <td className="text-end fw-bold" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#0066cc' }}>{formatCurrency(totalUSD)}</td>
                              <td className="text-end fw-bold" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#fd7e14' }}>{formatCurrency(item.totalINR)}</td>
                            </tr>
                            );
                          })}
                          <tr style={{ backgroundColor: '#f8f9fa', fontWeight: '600', borderTop: '2px solid #dee2e6' }}>
                            <td style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#333' }}>Grand Total</td>
                            <td className="text-end" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#28a745' }}>
                              {formatCurrency(reportData.reduce((sum, item) => sum + item.totalAED, 0))}
                            </td>
                            <td className="text-end" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#0066cc' }}>
                              {formatCurrency(reportData.reduce((sum, item) => sum + item.totalAED / 3.68, 0))}
                            </td>
                            <td className="text-end" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#fd7e14' }}>
                              {formatCurrency(reportData.reduce((sum, item) => sum + item.totalINR, 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', border: '1px solid #e9ecef', height: '100%' }}>
                  <div className="card-body p-4" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h5 className="card-title mb-3" style={{ fontSize: '1.1rem', fontWeight: '600' }}>Wealth Distribution</h5>
                    <div style={{ position: 'relative', flex: 1, minHeight: '250px', width: '100%' }}>
                      <Bar data={chartData} options={chartOptions} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Type Section */}
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '2rem', marginBottom: '1.5rem' }}>Wealth by Type</h3>
            <div className="row mb-5 g-3">
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', border: '1px solid #e9ecef' }}>
                  <div className="card-body p-4">
                    <h5 className="card-title mb-3" style={{ fontSize: '1.1rem', fontWeight: '600' }}>Type Distribution</h5>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table table-hover mb-0" style={{ borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f8f9fa' }}>
                          <tr>
                            <th style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Type</th>
                            <th className="text-end" style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Total (AED)</th>
                            <th className="text-end" style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Total (USD)</th>
                            <th className="text-end" style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Total (INR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {typeData.map((item, index) => {
                            const totalUSD = item.totalAED / 3.68;
                            return (
                            <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                              <td style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#333' }}>{item.type}</td>
                              <td className="text-end fw-bold" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#28a745' }}>{formatCurrency(item.totalAED)}</td>
                              <td className="text-end fw-bold" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#0066cc' }}>{formatCurrency(totalUSD)}</td>
                              <td className="text-end fw-bold" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#fd7e14' }}>{formatCurrency(item.totalINR)}</td>
                            </tr>
                            );
                          })}
                          <tr style={{ backgroundColor: '#f8f9fa', fontWeight: '600', borderTop: '2px solid #dee2e6' }}>
                            <td style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#333' }}>Grand Total</td>
                            <td className="text-end" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#28a745' }}>
                              {formatCurrency(typeData.reduce((sum, item) => sum + item.totalAED, 0))}
                            </td>
                            <td className="text-end" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#0066cc' }}>
                              {formatCurrency(typeData.reduce((sum, item) => sum + item.totalAED / 3.68, 0))}
                            </td>
                            <td className="text-end" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#fd7e14' }}>
                              {formatCurrency(typeData.reduce((sum, item) => sum + item.totalINR, 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', border: '1px solid #e9ecef', height: '100%' }}>
                  <div className="card-body p-4" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h5 className="card-title mb-3" style={{ fontSize: '1.1rem', fontWeight: '600' }}>Wealth Distribution by Type</h5>
                    <div style={{ position: 'relative', flex: 1, minHeight: '250px', width: '100%' }}>
                      <Bar data={typeChartData} options={typeChartOptions} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Country Section */}
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '2rem', marginBottom: '1.5rem' }}>Wealth by Country</h3>
            <div className="row mb-5 g-3">
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', border: '1px solid #e9ecef' }}>
                  <div className="card-body p-4">
                    <h5 className="card-title mb-3" style={{ fontSize: '1.1rem', fontWeight: '600' }}>Country Distribution</h5>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table table-hover mb-0" style={{ borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f8f9fa' }}>
                          <tr>
                            <th style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Country</th>
                            <th className="text-end" style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Total (AED)</th>
                            <th className="text-end" style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>%</th>
                            <th className="text-end" style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Total (INR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {countryData.map((item, index) => {
                            const totalAED = countryData.reduce((sum, i) => sum + i.totalAED, 0);
                            const percentage = ((item.totalAED / totalAED) * 100).toFixed(1);
                            return (
                            <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                              <td style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#333' }}>{item.country}</td>
                              <td className="text-end fw-bold" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#17a2b8' }}>{formatCurrency(item.totalAED)}</td>
                              <td className="text-end fw-bold" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#666' }}>{percentage}%</td>
                              <td className="text-end fw-bold" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#28a745' }}>{formatCurrency(item.totalINR)}</td>
                            </tr>
                            );
                          })}
                          <tr style={{ backgroundColor: '#f8f9fa', fontWeight: '600', borderTop: '2px solid #dee2e6' }}>
                            <td style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#333' }}>Grand Total</td>
                            <td className="text-end" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#17a2b8' }}>
                              {formatCurrency(countryData.reduce((sum, item) => sum + item.totalAED, 0))}
                            </td>
                            <td className="text-end" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#666' }}>100%</td>
                            <td className="text-end" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#28a745' }}>
                              {formatCurrency(countryData.reduce((sum, item) => sum + item.totalINR, 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', border: '1px solid #e9ecef', height: '100%' }}>
                  <div className="card-body p-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <h5 className="card-title mb-3" style={{ fontSize: '1.1rem', fontWeight: '600', width: '100%' }}>Country Distribution Pie Chart</h5>
                    <div style={{ position: 'relative', width: '100%', height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Pie data={pieChartData} options={pieChartOptions} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Currency Section */}
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '2rem', marginBottom: '1.5rem' }}>Wealth by Currency</h3>
            <div className="row mb-5 g-3">
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', border: '1px solid #e9ecef' }}>
                  <div className="card-body p-4">
                    <h5 className="card-title mb-3" style={{ fontSize: '1.1rem', fontWeight: '600' }}>Currency Distribution</h5>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table table-hover mb-0" style={{ borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f8f9fa' }}>
                          <tr>
                            <th style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Currency</th>
                            <th className="text-end" style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>%</th>
                            <th className="text-end" style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Total (AED)</th>
                            <th className="text-end" style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Total (USD)</th>
                            <th className="text-end" style={{ borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#333' }}>Total (INR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currencyData.map((item, index) => {
                            const totalAED = currencyData.reduce((sum, i) => sum + i.totalAED, 0);
                            const percentage = ((item.totalAED / totalAED) * 100).toFixed(1);
                            const totalUSD = item.totalAED / 3.68;
                            return (
                            <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                              <td style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#333' }}>{item.currency}</td>
                              <td className="text-end fw-bold" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#666' }}>{percentage}%</td>
                              <td className="text-end fw-bold" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#17a2b8' }}>{formatCurrency(item.totalAED)}</td>
                              <td className="text-end fw-bold" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#fd7e14' }}>{formatCurrency(totalUSD)}</td>
                              <td className="text-end fw-bold" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#28a745' }}>{formatCurrency(item.totalINR)}</td>
                            </tr>
                            );
                          })}
                          <tr style={{ backgroundColor: '#f8f9fa', fontWeight: '600', borderTop: '2px solid #dee2e6' }}>
                            <td style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#333' }}>Grand Total</td>
                            <td className="text-end" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#666' }}>100%</td>
                            <td className="text-end" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#17a2b8' }}>
                              {formatCurrency(currencyData.reduce((sum, item) => sum + item.totalAED, 0))}
                            </td>
                            <td className="text-end" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#fd7e14' }}>
                              {formatCurrency(currencyData.reduce((sum, item) => sum + item.totalAED / 3.68, 0))}
                            </td>
                            <td className="text-end" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem', color: '#28a745' }}>
                              {formatCurrency(currencyData.reduce((sum, item) => sum + item.totalINR, 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '8px', border: '1px solid #e9ecef', height: '100%' }}>
                  <div className="card-body p-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <h5 className="card-title mb-3" style={{ fontSize: '1.1rem', fontWeight: '600', width: '100%' }}>Currency Distribution Pie Chart</h5>
                    <div style={{ position: 'relative', width: '100%', height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Pie data={currencyPieChartData} options={currencyPieChartOptions} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
