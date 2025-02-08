import { getFirestore, collection, doc, getDoc, query, where, orderBy, getDocs } from "firebase/firestore";
import { app } from "../../app.js";

const db = getFirestore(app);

// Fetch data from Firestore
async function fetchData() {
    const outletName = localStorage.getItem('outletName');
    console.log('Name of the outlet:', outletName);

  try {
    // Fetch outlet requests
    const outletRequestsRef = collection(db, "requests");
    const qRequests = query(outletRequestsRef, where("outletId", "==", outletName));
    const snapshotRequests = await getDocs(qRequests);
    const requests = snapshotRequests.docs.map(doc => doc.data());

    // Fetch customer tokens with the new logic
    const customerTokensRef = collection(db, "tokens");
    const snapshotTokens = await getDocs(customerTokensRef);
    
    const filteredTokens = [];

    for (const tokenDoc of snapshotTokens.docs) {
        const tokenData = tokenDoc.data();
        const scheduleId = tokenData.scheduleId;
        const scheduleRef = doc(db, "schedule", scheduleId);
        const scheduleSnap = await getDoc(scheduleRef);
        
        if (scheduleSnap.exists()) {
            const scheduleData = scheduleSnap.data();
            if (scheduleData.outletId === outletName) {
                // Fetch customer details
                const customerRef = doc(db, "customers", tokenData.customerId);
                const customerSnap = await getDoc(customerRef);
                
                if (customerSnap.exists()) {
                    const customerData = customerSnap.data();
                    filteredTokens.push({
                        id: tokenDoc.id,
                        quantity: tokenData.quantity,
                        requestDate: tokenData.requestDate,
                        expectedDeliveryDate: tokenData.expectedDeliveryDate,
                        status: tokenData.status,
                        customerName: customerData.name,
                        customerTypeId: customerData.customerTypeId
                    });
                }
            }
        }
    }

    // Populate tables
    populateRequestsTable(requests);
    populateTokensTable(filteredTokens);
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
                    <td>${request.requestDate.toDate().toLocaleDateString()}</td>
                    <td>${request.scheduleDate.toDate().toLocaleDateString()}</td>
                    <td>${request.quantity}</td>
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
      const requestDate = new Date(token.requestDate.seconds * 1000);
      const expectedDeliveryDate = new Date(token.expectedDeliveryDate.seconds * 1000);
      const row = `<tr>
                      <td>${token.id}</td>
                      <td>${token.customerName}</td>
                      <td>${token.customerTypeId}</td>
                      <td>${requestDate.toLocaleDateString()}</td>
                      <td>${expectedDeliveryDate.toLocaleDateString()}</td>
                      <td>${token.quantity}</td>
                      <td>${token.status}</td>
                    </tr>`;
      tokensTableBody.insertAdjacentHTML("beforeend", row);
    });
  }
  

// Generate PDF report with colors
function generateRequestPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Set Title
  doc.setFontSize(16);
  doc.setTextColor(0, 51, 102); // Dark blue
  doc.text("Outlet Request Report", 105, 10, { align: "center" });

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
  doc.text("Scheduled Date", 60, y);
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

  // Save PDF
  doc.save("request_report.pdf");
}

// Generate PDF report with colors
function generateTokenPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Set Title
  doc.setFontSize(16);
  doc.setTextColor(0, 51, 102); // Dark blue
  doc.text("Outlet Tokens Report", 105, 10, { align: "center" });

  let y = 20;

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
  doc.save("token_report.pdf");
}


// Make the function available globally
window.generateRequestPDF = generateRequestPDF;
document.querySelector(".report-button-request").addEventListener("click", generateRequestPDF);

window.generateTokenPDF = generateTokenPDF;
document.querySelector(".report-button-token").addEventListener("click", generateTokenPDF);

// Call fetchData to load the data
fetchData();