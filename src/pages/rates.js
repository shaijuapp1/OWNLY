// src/pages/rates.js
import { useState } from "react";
import Navbar from "../components/Navbar";

export default function RatesPage() {
  const [usdToInr] = useState(92.58);
  const [usdToAed] = useState(3.67);

  return (
    <>
      <Navbar />
      <div className="container mt-5">
        <h2>Exchange Rates</h2>
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>USD</td>
              <td>INR</td>
              <td>{usdToInr}</td>
            </tr>
            <tr>
              <td>USD</td>
              <td>AED</td>
              <td>{usdToAed}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
