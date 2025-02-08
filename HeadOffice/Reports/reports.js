// Import Firestore utilities
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "../../app.js";

const db = getFirestore(app);

// Fetch data from Firestore
async function fetchDispatchedData() {
  try {
    // Query the outlet_requests collection for documents where status is "dispatch"
    const outletRequestsRef = collection(db, "requests");
    const q = query(outletRequestsRef, where("status", "!=", "pending"));
    const snapshot = await getDocs(q);

    // Map through documents and retrieve necessary fields
    const dispatchedData = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        outletName: data.outletId || "-",
        requestDate: data.requestDate?.toDate().toLocaleDateString() || "-",
        dispatchDate: data.dispatchDate?.toDate().toLocaleDateString() || "-",
        quantity: data.quantity || "-",
      };
    });

    // Populate the table with fetched data
    populateDispatchedTable(dispatchedData);
  } catch (error) {
    console.error("Error fetching dispatched data: ", error);
  }
}

// Populate the Dispatched Stock Details table
function populateDispatchedTable(data) {
  const tableBody = document.getElementById("Dispatched-stock");
  tableBody.innerHTML = ""; // Clear existing table rows

  data.forEach(item => {
    const row = `<tr>
                  <td>${item.outletName}</td>
                  <td>${item.requestDate}</td>
                  <td>${item.dispatchDate}</td>
                  <td>${item.quantity}</td>
                </tr>`;
    tableBody.insertAdjacentHTML("beforeend", row);
  });
}


async function fetchSalesData() {
  try {
    // Query the outlet_requests collection for documents where status is "dispatch"
    const outletRequestsRef = collection(db, "requests");
    const q = query(outletRequestsRef, where("status", "==", "received"));
    const snapshot = await getDocs(q);

    // Map through documents and retrieve necessary fields
    const salesData = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        outletName: data.outletId || "-",
        quantity: data.quantity || "-",
        receivedDate: data.receivedDate?.toDate().toLocaleDateString() || "-",
        salesAmount: (data.quantity*3680) || "-",       
      };
    });

    // Populate the table with fetched data
    populateSalesTable(salesData);
  } catch (error) {
    console.error("Error fetching dispatched data: ", error);
  }
}

// Populate the Dispatched Stock Details table
function populateSalesTable(data) {
  const tableBody = document.getElementById("sales");
  tableBody.innerHTML = ""; // Clear existing table rows

  data.forEach(item => {
    const row = `<tr>
                  <td>${item.outletName}</td>
                  <td>${item.quantity}</td>
                  <td>${item.receivedDate}</td>
                  <td>Rs. ${item.salesAmount}</td>
                </tr>`;
    tableBody.insertAdjacentHTML("beforeend", row);
  });
}


// Generate PDF for Dispatched Stock Details
function generateDispatchPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Set Title
  doc.setFontSize(16);
  doc.setTextColor(0, 51, 102); // Dark blue
  doc.text("Dispatched Stock Report", 105, 10, { align: "center" });

  let y = 20;

  // Table Header
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255); // White text
  doc.setFillColor(0, 102, 204); // Blue background
  doc.rect(20, y, 170, 10, "F"); // Draw filled rectangle for header background
  doc.text("Dispatched Stock Details", 30, y + 7);
  y += 15;

  // Column Headers
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0); // Black text
  doc.text("Outlet Name", 20, y);
  doc.text("Requested Date", 70, y);
  doc.text("Dispatch Date", 110, y);
  doc.text("Stock Quantity", 150, y);
  y += 5;

  // Add Data Rows
  const rows = document.querySelectorAll("#Dispatched-stock tr");
  rows.forEach(row => {
    const cols = row.querySelectorAll("td");
    doc.text(cols[0]?.innerText || "-", 20, y);
    doc.text(cols[1]?.innerText || "-", 70, y);
    doc.text(cols[2]?.innerText || "-", 110, y);
    doc.text(cols[3]?.innerText || "-", 150, y);
    y += 10;
  });

  // Save PDF
  doc.save("dispatched_stock_report.pdf");
}

function generateSalesPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Set Title
  doc.setFontSize(16);
  doc.setTextColor(0, 51, 102); // Dark blue
  doc.text("Sales Report", 105, 10, { align: "center" });

  let y = 20;

  // Table Header
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255); // White text
  doc.setFillColor(0, 102, 204); // Blue background
  doc.rect(20, y, 170, 10, "F"); // Draw filled rectangle for header background
  doc.text("Sales Details", 30, y + 7);
  y += 15;

  // Column Headers
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0); // Black text
  doc.text("Outlet Name", 20, y);
  doc.text("Gas Quantity", 70, y);
  doc.text("Received Date", 110, y);
  doc.text("Sales Amount", 150, y);
  y += 5;

  let totalSales = 0; // Initialize total sales

  // Add Data Rows
  const rows = document.querySelectorAll("#sales tr");
  rows.forEach(row => {
    const cols = row.querySelectorAll("td");
    const salesAmount = parseFloat(cols[3]?.innerText.replace("Rs. ", "")) || 0; // Extract numeric value
    totalSales += salesAmount; // Sum sales amounts

    doc.text(cols[0]?.innerText || "-", 20, y);
    doc.text(cols[1]?.innerText || "-", 70, y);
    doc.text(cols[2]?.innerText || "-", 110, y);
    doc.text(cols[3]?.innerText || "-", 150, y);
    y += 10;
  });

  // Draw a line before total sales
  doc.line(20, y, 190, y);
  y += 5;

  // Add Total Sales Row
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Total Sales:", 110, y);
  doc.text(`Rs. ${totalSales.toFixed(2)}`, 150, y);
  
  // Save PDF
  doc.save("sales_report.pdf");
}


// Make the generatePDF function globally accessible
window.generateDispatchPDF = generateDispatchPDF;
document.querySelector(".dispatch-report-button").addEventListener("click", generateDispatchPDF);

window.generateSalesPDF = generateSalesPDF;
document.querySelector(".sales-report-button").addEventListener("click", generateSalesPDF);

// Fetch and display data on page load
fetchDispatchedData();
fetchSalesData();
