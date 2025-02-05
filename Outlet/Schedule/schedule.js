import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { app } from "../../app.js";

const db = getFirestore(app);

// Function to initialize and populate the table
function initializeTable() {
    const tableBody = document.getElementById("table-body"); // Reference to the table body
    const scheduledDeliveriesRef = collection(db, "scheduled_deliveries");

    // Real-time listener for changes in the collection
    onSnapshot(scheduledDeliveriesRef, (snapshot) => {
        tableBody.innerHTML = ""; // Clear the table before populating new data

        snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            const row = document.createElement("tr"); // Create a new row

            // Create table cells and append them to the row
            row.innerHTML = `
                <td>${index + 1}</td> <!-- Row number -->
                <td>${doc.id}</td> <!-- Outlet name (Document ID) -->
                <td>${data.stock_amount || 0}</td> <!-- Stock Amount -->
                <td>${data.delivery_date || 'N/A'}</td> <!-- Delivery Date -->
            `;
            tableBody.appendChild(row); // Append the row to the table body
        });
    });
}

// Initialize the table
initializeTable();
