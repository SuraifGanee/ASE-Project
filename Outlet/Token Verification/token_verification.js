import { getFirestore, collection, doc, getDoc, getDocs, updateDoc, query, where, addDoc, orderBy, Timestamp} from "firebase/firestore";
import { app } from "../../app.js";

const db = getFirestore(app);

const outletName = localStorage.getItem('outletName');
console.log('Name of the outlet:', outletName);

const totalTokens = localStorage.getItem("totalTokens");
document.querySelector(".token-issued").innerText = totalTokens;


// Function to fetch and display token details
async function fetchTokenDetails() {
    const tokenId = document.getElementById("token-id").value.trim();

    if (!tokenId) {
        return Swal.fire({ icon: 'error', title: 'ID not found', text: 'Please enter a valid Token ID.' });
    }

    try {
        const tokenDocRef = doc(db, "tokens", tokenId);
        const tokenDoc = await getDoc(tokenDocRef);

        if (!tokenDoc.exists()) {
            return Swal.fire({ icon: 'error', title: 'Details not found', text: 'No details found for the entered Token ID.' });
        }

        const tokenData = tokenDoc.data();
        const { customerId, quantity, requestDate, expectedDeliveryDate, paymentAndEmpty, status } = tokenData;
        
        if (!customerId) {
            return Swal.fire({ icon: 'error', title: 'Invalid Data', text: 'Customer ID not found in token details.' });
        }

        // Fetch customer details
        const customerDocRef = doc(db, "customers", customerId);
        const customerDoc = await getDoc(customerDocRef);

        if (!customerDoc.exists()) {
            return Swal.fire({ icon: 'error', title: 'Customer Not Found', text: 'No details found for the associated customer.' });
        }

        const { name, customerTypeId, outletId } = customerDoc.data();

        Swal.fire({ icon: 'success', title: 'Token Verified', text: 'Your token has been verified successfully.' });

        document.getElementById("details-container").style.display = "block";
        document.getElementById("details").innerHTML = `
            <p>Status: ${status || "N/A"}</p>
            <p>Type: ${customerTypeId}</p>
            <p>Received Payment & Empty Cylinders: ${paymentAndEmpty ? "Received" : "Not Received"}</p>
            <p>Customer ID: ${customerId}</p>
            <p>Customer Name: ${name}</p>
            <p>Quantity: ${quantity || "N/A"}</p>
            <p>Correspondent Outlet: ${outletId}</p>
            <p>Issue Date: ${requestDate ? requestDate.toDate().toLocaleDateString() : "N/A"}</p>
            <p>Expected Delivery Date: ${expectedDeliveryDate ? expectedDeliveryDate.toDate().toLocaleDateString() : "N/A"}</p>
            <button type="submit" class="btn btn-danger" id="re-btn">Reallocate Token</button>
            <button type="submit" class="btn btn-primary" id="p-e-btn">Payment & Empty</button>
            <button type="submit" class="btn btn-success" id="hand-btn">Gas Handover</button>
        `;

        document.getElementById("re-btn").addEventListener("click", () => displayReallocationForm(tokenDocRef, tokenData));
        document.getElementById("p-e-btn").addEventListener("click", () => displayPaymentAndEmptyForm(tokenDocRef, tokenData));
        document.getElementById("hand-btn").addEventListener("click", () => displayGasHandoverForm(tokenDocRef, tokenData));
    } catch (error) {
        console.error("Error fetching token details:", error);
        alert("Failed to fetch token details. Please try again.");
    }
}


// Function to display reallocation form
function displayReallocationForm(tokenDocRef, tokenData) {
    const detailsElement = document.getElementById("details");

    detailsElement.innerHTML += `
        <div id="reallocation-form" class="mt-3">
            <label for="customer-nic" class="form-label">Input your ID:</label>
            <input type="text" class="form-control mb-2" id="customer-nic" placeholder="Enter Customer ID" required>
            <button type="submit" class="btn btn-success" id="submit-nic-btn">Submit</button>
        </div>
    `;

    // Add event listener for "Submit" button
    document.getElementById("submit-nic-btn").addEventListener("click", async () => {
        const customerID = document.getElementById("customer-nic").value.trim();

        if (customerID) {
            try {
                // Attempt to fetch the customer document by NIC (document ID)
                const customerDocRef = doc(db, "customers", customerID);
                const customerDoc = await getDoc(customerDocRef);

                if (customerDoc.exists()) {
                    const customerData = customerDoc.data();

                    // Update token document with customer data
                    await updateDoc(tokenDocRef, {
                        customerId: customerID,
                    });

                    // Add a notification document with an auto-generated ID
                    await addDoc(collection(db, "notifications"), {
                        sender: outletName,
                        message: "Dear Customer, We are pleased to inform you that a gas cylinder token has been allocated to you. Please visit our outlet and handover empty and money to collect it .",
                        receiver: customerID,
                        timestamp: Timestamp.now(), // Store the current timestamp
                    });
                    

                    Swal.fire({
                        icon: 'success',
                        title: 'Reallocation Successful',
                        text: 'The token has been successfully reallocated to the entered ID\'s customer, and their details have been updated.'
                    }).then(() => {
                        fetchTokenDetails();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Customer Not Found',
                        text: 'No customer found with the entered ID.'
                    });
                }
            } catch (error) {
                console.error("Error updating token details:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Update Failed',
                    text: 'Failed to update the token details. Please try again.'
                });
            }
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Input',
                text: 'Please enter a valid ID.'
            });
        }
    });
}


function displayPaymentAndEmptyForm(tokenDocRef, tokenData) {
    // Show a Swal popup with Yes/No options
    Swal.fire({
        title: 'Payment & Empty Cylinders',
        text: 'Are you received the payment for the requested gas and the empty cylinders?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            // Update Firestore with payment_and_empty = true
            try {
                await updateDoc(tokenDocRef, { paymentAndEmpty: true });
                Swal.fire({
                    icon: 'success',
                    title: 'Payment Received',
                    text: 'The payment and empty cylinders have been marked as received.'
                }).then(() => {
                    fetchTokenDetails();
                });
                
            } catch (error) {
                console.error("Error updating payment and empty status:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Update Failed',
                    text: 'Failed to update the payment status. Please try again.'
                });
            }
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // Update Firestore with payment_and_empty = false
            try {
                await updateDoc(tokenDocRef, {
                    paymentAndEmpty: false
                });
                Swal.fire({
                    icon: 'info',
                    title: 'Payment Not Received',
                    text: 'The payment and empty cylinders have been marked as not received.'
                }).then(() => {
                    populateUnpaidTokensTable();
                    fetchTokenDetails();
                });
            } catch (error) {
                console.error("Error updating payment and empty status:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Update Failed',
                    text: 'Failed to update the payment status. Please try again.'
                });
            }
        }
    });
}

function displayGasHandoverForm(tokenDocRef, tokenData) {
    // Show the first Swal popup with "Are you sure?"
    Swal.fire({
        title: 'Gas Handover Confirmation',
        text: 'Are you sure you have handed over the gas to the customer corresponding to this Token ID?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            // Show a second confirmation popup
            Swal.fire({
                title: 'Confirm Handover',
                text: 'Please confirm that the gas has been handed over to the customer.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Confirm',
                cancelButtonText: 'Cancel',
                reverseButtons: true
            }).then(async (confirmResult) => {
                if (confirmResult.isConfirmed) {

                    try {

                        await updateDoc(tokenDocRef, { 
                            status: "Claimed",
                            paymentAndEmpty: true, 
                        }).then( () => {
                            fetchTokenDetails();
                        });


                        const outletName = localStorage.getItem("outletName");
                        // Fetch the stock document where outletId matches the outlet name
                        const stockQuery = query(collection(db, "stock"), where("outletId", "==", outletName));
                        const stockSnapshot = await getDocs(stockQuery);
                    
                        if (!stockSnapshot.empty) {
                            const stockDoc = stockSnapshot.docs[0]; // Get the first matched document
                            const stockData = stockDoc.data();
                            console.log("Stock Data:", stockData);
                    
                            // Calculate the new stock
                            const currentStock = stockData.quantity || 0; // Default to 0 if stock is undefined
                            const tokenQuantity = tokenData.quantity || 0; // Default to 0 if quantity is undefined
                            const newStock = currentStock - tokenQuantity;
                    
                            // Update the stock in the stock collection
                            await updateDoc(stockDoc.ref, { quantity: newStock });
                            console.log(`Stock updated successfully for outlet: ${tokenData.outlet}`);
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Stock Not Found',
                                text: `No stock record found for the outlet "${tokenData.outlet}".`
                            });
                        }
                    } catch (error) {
                        console.error("Error updating outlet stock:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Update Failed',
                            text: 'Failed to update the outlet stock. Please try again.'
                        });
                    }
                    
                } else if (confirmResult.dismiss === Swal.DismissReason.cancel) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Action Canceled',
                        text: 'No changes were made to the token.'
                    });
                }
            });
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            Swal.fire({
                icon: 'info',
                title: 'Action Canceled',
                text: 'No changes were made to the token.'
            });
        }
    });
}

// Function to populate the "Tokens Not Yet Handover" table
async function populateUnpaidTokensTable() {
    const tbody = document.getElementById("unpaid-not-handover");
    tbody.innerHTML = "Loading...";

    const outletName = localStorage.getItem("outletName"); // Assuming outletName is stored in localStorage
    if (!outletName) {
        tbody.innerHTML = `<tr><td colspan="7">Outlet not found</td></tr>`;
        return;
    }

    try {
        // Query tokens where status is "Unclaimed" and order by requestDate (ascending)
        const unpaidQuery = query(collection(db, "tokens"), where("status", "==", "Unclaimed"), orderBy("requestDate", "asc"));
        const unpaidSnapshot = await getDocs(unpaidQuery);

        // Clear table body
        tbody.innerHTML = "";

        if (unpaidSnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="7">No unpaid tokens found</td></tr>`;
            return;
        }

        for (const tokenDoc of unpaidSnapshot.docs) {
            const tokenData = tokenDoc.data();
            const tokenId = tokenDoc.id;
            const expectedDeliveryDate = tokenData.expectedDeliveryDate ? tokenData.expectedDeliveryDate.toDate().toLocaleDateString() : "N/A";
            const customerId = tokenData.customerId || "N/A";
            const requestDate = tokenData.requestDate ? tokenData.requestDate.toDate().toLocaleString() : "N/A"; // Convert timestamp to readable format

            if (customerId === "N/A") continue; // Skip if customerId is missing

            const scheduleId = tokenData.scheduleId || "N/A";

            // Fetch customer document
            const customerDocRef = doc(db, "customers", customerId);
            const customerDoc = await getDoc(customerDocRef);

            if (!customerDoc.exists()) continue; // Skip if customer not found

            const customerData = customerDoc.data();
            const customerName = customerData.name || "N/A";
            const customerTypeId = customerData.customerTypeId || "N/A";
            const mobile = customerData.mobile || "N/A";
            const outletId = customerData.outletId || "N/A";

            // Check if the outletId matches the outletName
            if (outletId !== outletName) continue;

            let scheduleDate = "N/A"; // Default value

            if (scheduleId !== "N/A") {
                // Fetch schedule document
                const scheduleDocRef = doc(db, "schedule", scheduleId);
                const scheduleDoc = await getDoc(scheduleDocRef);

                if (scheduleDoc.exists()) {
                    const scheduleData = scheduleDoc.data();
                    const requestId = scheduleData.requestId || "N/A";

                    if (requestId !== "N/A") {
                        // Fetch request document
                        const requestDocRef = doc(db, "requests", requestId);
                        const requestDoc = await getDoc(requestDocRef);

                        if (requestDoc.exists()) {
                            const requestData = requestDoc.data();
                            scheduleDate = requestData.scheduleDate
                                ? requestData.scheduleDate.toDate().toLocaleDateString()
                                : "N/A";
                        }
                    }
                }
            }

            // Create a new row for the table
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${tokenId}</td>
                <td>${customerName}</td>
                <td>${customerTypeId}</td>
                <td>${expectedDeliveryDate}</td>
                <td>${scheduleDate}</td>
                <td>${mobile}</td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error("Error populating unpaid tokens table:", error);
        tbody.innerHTML = `<tr><td colspan="7">Failed to load data. Please try again later.</td></tr>`;
    }
}

// Call the function to populate the table
populateUnpaidTokensTable();


// Add event listener for the submit button
document.getElementById("enter-btn").addEventListener("click", fetchTokenDetails);
