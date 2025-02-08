import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { app } from "../../app.js";

const db = getFirestore(app);

// Fetch data from Firestore
async function fetchData() {
  const outletName = localStorage.getItem("outletName");
  console.log("Name of the outlet:", outletName);

  try {
    // Fetch tokens collection
    const tokensRef = collection(db, "tokens");
    const snapshotTokens = await getDocs(tokensRef);

    let filteredTokens = [];

    for (const tokenDoc of snapshotTokens.docs) {
      const tokenData = tokenDoc.data();
      const { scheduleId, customerId, requestDate, expectedDeliveryDate, quantity, paymentAndEmpty, status } = tokenData;

      // Fetch schedule data and check outletId
      const scheduleDocRef = doc(db, "schedule", scheduleId);
      const scheduleDocSnap = await getDoc(scheduleDocRef);

      if (!scheduleDocSnap.exists()) continue; // Skip if schedule doesn't exist

      const scheduleData = scheduleDocSnap.data();
      if (scheduleData.outletId !== outletName) continue; // Skip if outletId doesn't match

      // Fetch customer data
      const customerDocRef = doc(db, "customers", customerId);
      const customerDocSnap = await getDoc(customerDocRef);

      if (!customerDocSnap.exists()) continue; // Skip if customer doesn't exist

      const customerData = customerDocSnap.data();
      const { name, customerTypeId } = customerData;

      // Format token data with customer details
      filteredTokens.push({
        id: tokenDoc.id,
        name,
        customerTypeId,
        requestDate: new Date(requestDate.seconds * 1000),
        expectedDeliveryDate: new Date(expectedDeliveryDate.seconds * 1000),
        quantity,
        paymentAndEmpty,
        status
      });
    }

    // Separate tokens by customer type
    const domesticRequests = filteredTokens.filter(token => token.customerTypeId === "Domestic");
    const businessRequests = filteredTokens.filter(token => token.customerTypeId === "Business");

    // Populate tables
    populateTable(domesticRequests, "domestic-request");
    populateTable(businessRequests, "business-request");

  } catch (error) {
    console.error("Error fetching data: ", error);
  }
}

// Populate the tables dynamically
function populateTable(requests, tableId) {
  const tableBody = document.getElementById(tableId);
  tableBody.innerHTML = ""; // Clear the table

  requests.forEach(request => {
    const row = `<tr>
                  <td>${request.name}</td>
                  <td>${request.requestDate.toLocaleDateString()}</td>
                  <td>${request.expectedDeliveryDate.toLocaleDateString()}</td>
                  <td>${request.quantity}</td>
                  <td>${request.paymentAndEmpty ? "Yes" : "No"}</td>
                  <td>${request.status}</td>
                </tr>`;
    tableBody.insertAdjacentHTML("beforeend", row);
  });
}

// Call fetchData to load the data
fetchData();
