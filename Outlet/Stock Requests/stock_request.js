import { getFirestore, collection, doc, getDoc, addDoc, query, where, onSnapshot, Timestamp, getDocs } from "firebase/firestore";
import { app } from "../../app.js";
import { outletData } from "../Dashboard/dashboard.js";

const db = getFirestore(app);

async function submitStockRequest(event) {
    event.preventDefault(); // Prevent form submission from reloading the page

    // Get input values
    const quantity = parseFloat(document.getElementById("quantity").value);
    const maxLimit = parseFloat(document.getElementById("maxLimit").value);
    const scheduleDateInput = document.getElementById("scheduleDate").value;
    const outletName = outletData.name;  // Get the outlet name
    const requestDate = new Date();  // Current date/time

    // Validate if schedule date is selected
    if (!scheduleDateInput) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Date',
            text: 'Please select a schedule date.'
        });
        return;
    }

    // Convert selected date to a JavaScript Date object
    const scheduleDate = new Date(scheduleDateInput);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Remove time for accurate comparison

    const minDate = new Date();
    minDate.setDate(today.getDate() + 7); // Minimum 7 days from today

    // Validation: Schedule date must not be in the past
    if (scheduleDate < today) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Date',
            text: 'Schedule date cannot be in the past.'
        });
        return;
    }

    // Validation: Schedule date must be at least 7 days from today
    if (scheduleDate < minDate) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Date',
            text: 'Schedule date must be at least 7 days from today.'
        });
        return;
    }

    try {

        // Submit request to "requests" collection
        const status = "pending";
        const requestRef = await addDoc(collection(db, "requests"), {
            outletId: outletName,
            quantity: quantity,
            requestDate: Timestamp.fromDate(requestDate),
            scheduleDate: Timestamp.fromDate(scheduleDate),
            status: status
        });

        console.log("Request submitted successfully with ID: ", requestRef.id);

        // Create a document in "schedule" collection with an auto-generated ID
        await addDoc(collection(db, "schedule"), {
            maxLimit: maxLimit,
            outletId: outletName,
            requestId: requestRef.id
        });

        console.log("Schedule document created successfully.");

        // Show success message
        Swal.fire({
            icon: 'success',
            title: 'Request Submitted',
            text: 'Your request has been submitted successfully.'
        });

        // Reset the form after successful submission
        document.getElementById("stock-request-form").reset();

    } catch (error) {
        console.error("Error submitting request: ", error);

        // Show error message if submission fails
        Swal.fire({
            icon: 'error',
            title: 'Failed to Submit Request',
            text: 'Failed to submit your request. Please try again.'
        });
    }
}

// Attach the function to the form submission event
document.getElementById("stock-request-form").addEventListener("submit", submitStockRequest);


        // Populate Table
        async function populateTable() {
            const tableBody = document.getElementById("gas-request-table-body");
        
            console.log("Setting up table population listener...");
        
            const gasRequestCollection = collection(db, "requests");
        
            const outletName = localStorage.getItem("outletName");
            const outletQuery = query(gasRequestCollection, where("outletId", "==", outletName));
        
            onSnapshot(outletQuery, (snapshot) => {
                tableBody.innerHTML = ""; // Clear table rows
        
                snapshot.docs.forEach((doc, index) => {
                    const data = doc.data();
                    const row = document.createElement("tr");
        
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${doc.id}</td>
                        <td>${data.quantity}</td>
                        <td>${data.requestDate.toDate().toLocaleDateString()}</td>
                        <td>${data.scheduleDate.toDate().toLocaleDateString()}</td>
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

async function fetchRequestedQuantities() {
    const outletName = localStorage.getItem("outletName");
    if (!outletName) return;

    const tokensRef = collection(db, "tokens");
    const scheduleRef = collection(db, "schedule");

    try {
        // Step 1: Query tokens where status is "Unclaimed"
        const tokenQuery = query(tokensRef, where("status", "==", "Unclaimed"));
        const tokenSnapshot = await getDocs(tokenQuery);

        let totalQuantity = 0;

        // Step 2: Loop through tokens
        for (const tokenDoc of tokenSnapshot.docs) {
            const tokenData = tokenDoc.data();
            const scheduleId = tokenData.scheduleId;

            if (!scheduleId) continue; // Skip if scheduleId is missing

            // Step 3: Fetch schedule document matching scheduleId
            const scheduleDocRef = doc(scheduleRef, scheduleId);
            const scheduleDocSnap = await getDoc(scheduleDocRef);

            if (scheduleDocSnap.exists()) {
                const scheduleData = scheduleDocSnap.data();

                // Step 4: Check if outletId matches outletName
                if (scheduleData.outletId === outletName) {
                    totalQuantity += tokenData.quantity;
                }
            }
        }

        // Step 5: Update the UI
        document.querySelector(".requested-quantities").innerText = totalQuantity;

        console.log("Total requested quantity updated:", totalQuantity);

    } catch (error) {
        console.error("Error fetching requested quantities:", error);
    }
}

// Call the function to fetch and update data
fetchRequestedQuantities();



// Attach submitStockRequest to form submission
document.getElementById("stock-request-form").addEventListener("submit", submitStockRequest);

const currentStock = localStorage.getItem("currentStock");
document.querySelector(".current-stock").innerText = currentStock;
console.log(currentStock);
