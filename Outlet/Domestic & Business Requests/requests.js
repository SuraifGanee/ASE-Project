import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "../../app.js";

const db = getFirestore(app);

// Fetch data from Firestore
async function fetchData() {
  const outletName = localStorage.getItem("outletName");
  console.log("Name of the outlet:", outletName);

  try {
    // Fetch tokens collection filtered by outlet
    const tokensRef = collection(db, "tokens");
    const qTokens = query(tokensRef, where("outlet", "==", outletName));
    const snapshotTokens = await getDocs(qTokens);
    const tokens = snapshotTokens.docs.map(doc => ({
      id: doc.id, // Document ID
      ...doc.data(), // Document data
    }));

    // Separate tokens by type
    const domesticRequests = tokens.filter(token => token.type === "Domestic");
    const businessRequests = tokens.filter(token => token.type === "Business");

    // Populate tables
    populateDomesticRequestsTable(domesticRequests);
    populateBusinessRequestsTable(businessRequests);
  } catch (error) {
    console.error("Error fetching data: ", error);
  }
}

// Populate the domestic requests table
function populateDomesticRequestsTable(requests) {
  const tableBody = document.getElementById("domestic-request");
  tableBody.innerHTML = ""; // Clear the table

  requests.forEach(request => {
    const issueDate = request.issue_date instanceof Date
      ? request.issue_date
      : new Date(request.issue_date.seconds * 1000);
    const expectedDeliveryDate = request.expected_delivery_date instanceof Date
      ? request.expected_delivery_date
      : new Date(request.expected_delivery_date.seconds * 1000);

    const row = `<tr>
                  <td>${request.customer_name}</td>
                  <td>${issueDate.toLocaleDateString()}</td>
                  <td>${expectedDeliveryDate.toLocaleDateString()}</td>
                  <td>${request.quantity}</td>
                  <td>${request.payment_and_empty ? "Yes" : "No"}</td>
                  <td>${request.status}</td>
                </tr>`;
    tableBody.insertAdjacentHTML("beforeend", row);
  });
}

// Populate the business requests table
function populateBusinessRequestsTable(requests) {
  const tableBody = document.getElementById("business-request");
  tableBody.innerHTML = ""; // Clear the table

  requests.forEach(request => {
    const issueDate = request.issue_date instanceof Date
      ? request.issue_date
      : new Date(request.issue_date.seconds * 1000);
    const expectedDeliveryDate = request.expected_delivery_date instanceof Date
      ? request.expected_delivery_date
      : new Date(request.expected_delivery_date.seconds * 1000);

    const row = `<tr>
                  <td>${request.customer_name}</td>
                  <td>${issueDate.toLocaleDateString()}</td>
                  <td>${expectedDeliveryDate.toLocaleDateString()}</td>
                  <td>${request.quantity}</td>
                  <td>${request.payment_and_empty ? "Yes" : "No"}</td>
                  <td>${request.status}</td>
                </tr>`;
    tableBody.insertAdjacentHTML("beforeend", row);
  });
}

// Call fetchData to load the data
fetchData();
