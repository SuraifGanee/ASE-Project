import { getFirestore, collection, doc, getDoc, addDoc, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { app } from "../../app.js";
import { outletData } from "../Dashboard/dashboard.js";

const db = getFirestore(app);

// async function submitStockRequest(event) {
//     event.preventDefault(); // Prevent form submission from reloading the page

//     const quantity = document.getElementById("quantity").value;
//     const outletName = outletData.name;  // Get the outlet name
//     const requestedDate = new Date();  // Current date/time
//     const scheduledDeliveryDate = document.getElementById("scheduled-delivery-date").value;  // Get the manual date from the form

//     // Ensure scheduled delivery date is valid
//     const requestedDateTime = new Date(requestedDate);
//     const scheduledDateTime = new Date(scheduledDeliveryDate);

//     if (scheduledDateTime < requestedDateTime) {
//         Swal.fire({
//             icon: 'error',
//             title: 'Invalid Date',
//             text: 'Scheduled delivery date cannot be in the past.'
//         });
//         return;
//     }

//     if (scheduledDateTime > new Date(requestedDateTime.setMonth(requestedDateTime.getMonth() + 2))) {
//         Swal.fire({
//             icon: 'error',
//             title: 'Invalid Date',
//             text: 'Scheduled delivery date is too far in the future. Please choose a date within 2 months.'
//         });
//         return;
//     }

//     // Set status as 'pending'
//     const status = "pending";

//     try {
//         const docRef = await addDoc(collection(db, "outlet_requests"), {
//             outlet_name: outletName,
//             gas_quantity: quantity,
//             requested_date: requestedDate.toISOString(),
//             scheduled_delivery_date: scheduledDateTime.toISOString(),
//             status: status
//         });

//         console.log("Request submitted successfully with ID: ", docRef.id);

//         // Show success message using SweetAlert2
//         Swal.fire({
//             icon: 'success',
//             title: 'Request submitted',
//             text: 'Your request has been submitted successfully.'
//         });

//         document.getElementById("stock-request-form").reset(); // Reset the form

//     } catch (error) {
//         console.error("Error submitting request: ", error);

//         // Show error message using SweetAlert2
//         Swal.fire({
//             icon: 'error',
//             title: 'Failed to submit request',
//             text: 'Failed to submit your request. Please try again.'
//         });
//     }

// }

async function submitStockRequest(event) {
    event.preventDefault(); // Prevent form submission from reloading the page

    const quantity = parseFloat(document.getElementById("quantity").value);
    const outletName = outletData.name;  // Get the outlet name
    const requestedDate = new Date();  // Current date/time
    const scheduledDeliveryDate = document.getElementById("scheduled-delivery-date").value;  // Get the manual date from the form

    // Ensure scheduled delivery date is valid
    const requestedDateTime = new Date(requestedDate);
    const scheduledDateTime = new Date(scheduledDeliveryDate);

    if (scheduledDateTime < requestedDateTime) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Date',
            text: 'Scheduled delivery date cannot be in the past.'
        });
        return;
    }

    if (scheduledDateTime > new Date(requestedDateTime.setMonth(requestedDateTime.getMonth() + 2))) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Date',
            text: 'Scheduled delivery date is too far in the future. Please choose a date within 2 months.'
        });
        return;
    }

    try {
        // Check if the outlet exists in the scheduled_deliveries collection
        const scheduledDeliveryDoc = await getDoc(doc(db, "scheduled_deliveries", outletName));

        if (!scheduledDeliveryDoc.exists()) {
            Swal.fire({
                icon: 'error',
                title: 'No Scheduled Delivery',
                text: 'There is no scheduled delivery to this outlet.'
            });
            return;
        }

        const { stock_amount } = scheduledDeliveryDoc.data();

        if (stock_amount <= 0) {
            Swal.fire({
                icon: 'error',
                title: 'Scheduled Gas Stock Finished',
                text: 'The scheduled gas stock for this outlet has finished.'
            });
            return;
        }

        if (quantity > stock_amount) {
            Swal.fire({
                icon: 'error',
                title: 'Exceeds Available Stock',
                text: 'Requested quantity exceeds the allocated stock.'
            });
            return;
        }

        // Proceed with submission
        const status = "pending";

        const docRef = await addDoc(collection(db, "outlet_requests"), {
            outlet_name: outletName,
            gas_quantity: quantity,
            requested_date: Timestamp.fromDate(requestedDate),
            scheduled_delivery_date: Timestamp.fromDate(scheduledDateTime),
            status: status
        });

        console.log("Request submitted successfully with ID: ", docRef.id);

        Swal.fire({
            icon: 'success',
            title: 'Request Submitted',
            text: 'Your request has been submitted successfully.'
        });

        document.getElementById("stock-request-form").reset(); // Reset the form

    } catch (error) {
        console.error("Error submitting request: ", error);

        Swal.fire({
            icon: 'error',
            title: 'Failed to Submit Request',
            text: 'Failed to submit your request. Please try again.'
        });
    }
}

// Attach submitStockRequest to form submission
document.getElementById("stock-request-form").addEventListener("submit", submitStockRequest);


        // Populate Table
        async function populateTable() {
            const tableBody = document.getElementById("gas-request-table-body");
        
            // Check if outletData is loaded correctly
            if (!outletData || !outletData.name) {
                console.error("Outlet data is not loaded or missing the outlet name.");
                return; // Exit the function if outletData is not available
            }
        
            console.log("Setting up table population listener...");
        
            const gasRequestCollection = collection(db, "outlet_requests");
        
            // Query for requests specific to the current outlet
            const outletName = outletData.name;  // Get the current outlet name
            const outletQuery = query(gasRequestCollection, where("outlet_name", "==", outletName));
        
            onSnapshot(outletQuery, (snapshot) => {
                tableBody.innerHTML = ""; // Clear table rows
        
                snapshot.docs.forEach((doc, index) => {
                    const data = doc.data();
                    const row = document.createElement("tr");
        
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${doc.id}</td>
                        <td>${data.gas_quantity}</td>
                        <td>${data.requested_date.toDate().toLocaleDateString()}</td>
                        <td>${data.scheduled_delivery_date.toDate().toLocaleDateString()}</td>
                        <td>${data.status}</td>
                    `;
        
                    tableBody.appendChild(row); 
                });
        
                console.log("Table updated with latest data.");
            }, (error) => {
                console.error("Error listening to Firestore:", error);
            });
        }
        
        console.log("Outlet data is loaded:", outletData);
        
        populateTable();

// Retrieve from localStorage
const unclaimed = localStorage.getItem('unclaimed');
console.log('Unclaimed gas quantity:', unclaimed);
document.querySelector(".required-quantities").innerText = unclaimed;

// Attach submitStockRequest to form submission
document.getElementById("stock-request-form").addEventListener("submit", submitStockRequest);

document.querySelector(".current-stock").innerText = outletData.stock;
