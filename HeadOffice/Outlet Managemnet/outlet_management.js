import { getFirestore, doc, getDoc, collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { app } from "../../app.js";

const db = getFirestore(app);

// Load outlet options into the dropdown
async function loadOutletOptions() {
    const outletSelect = $('#outletSelect');
    const outletsRef = collection(db, "outlets");
    const snapshot = await getDocs(outletsRef);

    // Clear existing options
    outletSelect.empty();

    // Add default option
    outletSelect.append('<option value="" selected disabled>Select Outlet</option>');

    // Add each outlet as an option
    snapshot.forEach(doc => {
        const outletName = doc.data().name;  // Assuming the 'name' field holds the outlet name
        outletSelect.append(`<option value="${doc.id}">${outletName}</option>`);
    });
}

// Fetch and display details of the selected outlet
async function loadOutletDetails(outletId) {
    try {
        const outletDocRef = doc(db, "outlets", outletId);
        const outletDoc = await getDoc(outletDocRef);

        if (outletDoc.exists()) {
            const outletData = outletDoc.data();

            console.log("Outlet Data:", outletData); // Debugging log

            // Fetch stock from the 'stock' collection where outletId matches
            const stockQuery = query(collection(db, "stock"), where("outletId", "==", outletData.name));
            const stockSnapshot = await getDocs(stockQuery);

            let stockAmount = "N/A"; // Default stock value

            if (!stockSnapshot.empty) {
                stockSnapshot.forEach((doc) => {
                    console.log("Stock Data:", doc.data()); // Debugging log
                    stockAmount = doc.data().quantity; // Assuming stock has a 'quantity' field
                });
            } else {
                console.warn("No matching stock found for outletId:", outletId);
            }

            // Update UI elements
            document.getElementById("outletName").innerText = outletData.name || "N/A";
            document.getElementById("outletLocation").innerText = outletData.location || "N/A";
            document.getElementById("outletStock").innerText = stockAmount; // Show stock from stock collection
            document.getElementById("outletContact").innerText = outletData.contact || "N/A";

        } else {
            alert("Outlet details not found!");
        }
    } catch (error) {
        console.error("Error loading outlet details:", error);
    }
}


// Fetch and display associated tokens of the selected outlet
async function loadTokenDetails() {
    const outletName = localStorage.getItem('outletName'); // Get outlet name from localStorage

    if (!outletName) {
        alert("No outlet name found in localStorage!");
        return;
    }

    try {
        const tokensRef = collection(db, "tokens");
        const q = query(tokensRef);
        const snapshot = await getDocs(q);

        const tokenDetails = document.getElementById("tokenDetails");
        tokenDetails.innerHTML = ""; // Clear previous data

        if (!snapshot.empty) {
            let index = 1;

            for (const tokenDoc of snapshot.docs) {
                const tokenData = tokenDoc.data();
                const { requestDate, expectedDeliveryDate, quantity, paymentAndEmpty, status, customerId, scheduleId } = tokenData;

                // Step 1: Fetch schedule data
                if (!scheduleId) {
                    console.warn(`Token ${tokenDoc.id} has no scheduleId`);
                    continue;
                }

                const scheduleDocRef = doc(db, "schedule", scheduleId);
                const scheduleDocSnap = await getDoc(scheduleDocRef);

                if (!scheduleDocSnap.exists()) {
                    console.warn(`No schedule found for scheduleId: ${scheduleId}`);
                    continue;
                }

                const scheduleData = scheduleDocSnap.data();
                if (scheduleData.outletId !== outletName) {
                    console.warn(`Schedule outletId (${scheduleData.outletId}) does not match outletName (${outletName})`);
                    continue;
                }

                // Step 2: Fetch customer data
                let customerName = "N/A";
                let customerTypeId = "N/A";

                if (customerId) {
                    const customerDocRef = doc(db, "customers", customerId);
                    const customerDocSnap = await getDoc(customerDocRef);

                    if (customerDocSnap.exists()) {
                        const customerData = customerDocSnap.data();
                        customerName = customerData.name || "N/A";
                        customerTypeId = customerData.customerTypeId || "N/A";
                    } else {
                        console.warn(`No customer found for customerId: ${customerId}`);
                    }
                } else {
                    console.warn(`Token ${tokenDoc.id} has no customerId`);
                }

                // Step 3: Append data to the table
                tokenDetails.innerHTML += `
                    <tr>
                        <td>${index++}</td>
                        <td>${customerName}</td>
                        <td>${customerTypeId}</td>
                        <td>${requestDate ? requestDate.toDate().toLocaleDateString() : "N/A"}</td>
                        <td>${expectedDeliveryDate ? expectedDeliveryDate.toDate().toLocaleDateString() : "N/A"}</td>
                        <td>${quantity || "N/A"}</td>
                        <td>${paymentAndEmpty ? "Received" : "Not Received"}</td>
                        <td>${status || "N/A"}</td>
                    </tr>
                `;
            }
        } else {
            tokenDetails.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">No tokens found for this outlet.</td>
                </tr>
            `;
        }
    } catch (error) {
        console.error("Error loading token details:", error);
    }
}




// Initialize functionality
$(document).ready(() => {
    // Load dropdown options on page load
    loadOutletOptions();

    // Handle Enter button click
    $('#enterButton').on('click', async () => {
        const selectedOutletId = $('#outletSelect').val();
    
        if (!selectedOutletId) {
            alert("Please select an outlet.");
            return;
        }
    
        // Get outlet details from Firestore
        const outletDocRef = doc(db, "outlets", selectedOutletId);
        const outletDoc = await getDoc(outletDocRef);
    
        if (outletDoc.exists()) {
            const outletData = outletDoc.data();
    
            // Store outlet name in localStorage
            localStorage.setItem('outletName', outletData.name);
    
            // Load details for the selected outlet
            loadOutletDetails(selectedOutletId);
    
            // Load associated token details
            loadTokenDetails();
        } else {
            alert("Outlet details not found!");
        }
    });
    
});
