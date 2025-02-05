import { getFirestore, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { app } from "../../app.js";

const db = getFirestore(app);

// Fetch data from Firestore
async function fetchData() {
    const outletName = localStorage.getItem('outletName');
    console.log('Name of the outlet:', outletName);

  try {
    // Fetch outlet requests
    const outletRequestsRef = collection(db, "outlet_requests");
    const qRequests = query(outletRequestsRef, where("outlet_name", "==", outletName));
    const snapshotRequests = await getDocs(qRequests);
    const requests = snapshotRequests.docs.map(doc => doc.data());

    // Fetch customer tokens
    const customerTokensRef = collection(db, "tokens");
    const qTokens = query(customerTokensRef, where("outlet", "==", outletName));
    const snapshotTokens = await getDocs(qTokens);
    const tokens = snapshotTokens.docs.map(doc => ({
      id: doc.id, // Document ID
      ...doc.data(), // Document data
    }));

    // Populate tables
    populateRequestsTable(requests);
    populateTokensTable(tokens);
  } catch (error) {
    console.error("Error fetching data: ", error);
  }
}

// Populate the requests table
function populateRequestsTable(requests) {
    const requestsTableBody = document.getElementById("outlet-request");
    requestsTableBody.innerHTML = ''; // Clear the table
  
    requests.forEach(request => {
      const row = `<tr>
                    <td>${request.requested_date.toDate().toLocaleDateString()}</td>
                    <td>${request.scheduled_delivery_date.toDate().toLocaleDateString()}</td>
                    <td>${request.gas_quantity}</td>
                    <td>${request.status}</td>
                  </tr>`;
      requestsTableBody.insertAdjacentHTML("beforeend", row);
    });
  }
  

// Populate the tokens table
function populateTokensTable(tokens) {
    const tokensTableBody = document.getElementById("customer-request");
    tokensTableBody.innerHTML = ''; // Clear the table
  
    tokens.forEach(token => {
        // If the date fields are Firestore Timestamp objects, convert them to Date
    const issueDate = token.issue_date instanceof Date ? token.issue_date : new Date(token.issue_date.seconds * 1000);
    const expectedDeliveryDate = token.expected_delivery_date instanceof Date ? token.expected_delivery_date : new Date(token.expected_delivery_date.seconds * 1000);
      const row = `<tr>
                    <td>${token.id}</td>
                    <td>${token.customer_name}</td>
                    <td>${token.type}</td>
                    <td>${issueDate.toLocaleDateString()}</td>
                    <td>${expectedDeliveryDate.toLocaleDateString()}</td>
                    <td>${token.quantity}</td>
                    <td>${token.status}</td>
                  </tr>`;
      tokensTableBody.insertAdjacentHTML("beforeend", row);
    });
  }
  

// Generate PDF report with colors
function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Set Title
  doc.setFontSize(16);
  doc.setTextColor(0, 51, 102); // Dark blue
  doc.text("Outlet Report", 105, 10, { align: "center" });

  let y = 20;

  // Add "Requests to Dispatch Office" Table Header with Background Color
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255); // White text
  doc.setFillColor(0, 102, 204); // Blue background
  doc.rect(20, y, 170, 10, "F"); // Draw filled rectangle for header background
  doc.text("Requests to Dispatch Office", 25, y + 7);
  y += 15;

  // Column Headers
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0); // Black text
  doc.text("Request Date", 20, y);
  doc.text("Delivery Date", 60, y);
  doc.text("Quantity", 110, y);
  doc.text("Status", 150, y);
  y += 5;

  // Add Requests Data
  const requests = document.querySelectorAll("#outlet-request tr");
  requests.forEach((row) => {
    const cols = row.querySelectorAll("td");
    doc.text(cols[0]?.innerText || "-", 20, y);
    doc.text(cols[1]?.innerText || "-", 60, y);
    doc.text(cols[2]?.innerText || "-", 110, y);
    doc.text(cols[3]?.innerText || "-", 150, y);
    y += 10;
  });

  y += 10; // Add space before the next table

  // Add "Tokens Issued to Customers" Table Header with Background Color
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255); // White text
  doc.setFillColor(0, 102, 204); // Blue background
  doc.rect(20, y, 170, 10, "F");
  doc.text("Tokens Issued to Customers", 25, y + 7);
  y += 15;

  // Column Headers
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0); // Black text
  doc.text("Token ID", 20, y);
  doc.text("Customer Name", 70, y);
  doc.text("Customer Type", 100, y);
  doc.text("Issue Date", 130, y);
  doc.text("Delivery Date", 150, y);
  doc.text("Quantity", 180, y);
  y += 5;

  // Add Tokens Data
  const tokens = document.querySelectorAll("#customer-request tr");
  tokens.forEach((row) => {
    const cols = row.querySelectorAll("td");
    doc.text(cols[0]?.innerText || "-", 20, y);
    doc.text(cols[1]?.innerText || "-", 70, y);
    doc.text(cols[2]?.innerText || "-", 100, y);
    doc.text(cols[3]?.innerText || "-", 130, y);
    doc.text(cols[4]?.innerText || "-", 150, y);
    doc.text(cols[5]?.innerText || "-", 180, y);
    y += 10;
  });

  // Save PDF
  doc.save("outlet_report.pdf");
}



// Make the function available globally
window.generatePDF = generatePDF;
document.querySelector(".report-button").addEventListener("click", generatePDF);

// Call fetchData to load the data
fetchData();