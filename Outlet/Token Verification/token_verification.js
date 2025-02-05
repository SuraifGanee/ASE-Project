import { getFirestore, collection, doc, getDoc, getDocs, updateDoc, query, where, addDoc, Timestamp} from "firebase/firestore";
import { app } from "../../app.js";

const db = getFirestore(app);

const outletName = localStorage.getItem('outletName');
console.log('Name of the outlet:', outletName);

const tokenCollectionRef = collection(db, "tokens");
const tokenQuery = query(tokenCollectionRef, where("outlet", "==", outletName));
const tokenSnapshot = await getDocs(tokenQuery);
const tokenCount = tokenSnapshot.size;
document.querySelector(".token-issued").innerText = tokenCount;


// Function to fetch and display token details
async function fetchTokenDetails() {
    const tokenId = document.getElementById("token-id").value.trim();

    if (tokenId) {
        try {
            // Fetch token details from Firestore
            const tokenDocRef = doc(db, "tokens", tokenId); // Get a document reference
            const tokenDoc = await getDoc(tokenDocRef); // Fetch the document

            if (tokenDoc.exists()) {
                Swal.fire({
                    icon: 'success',
                    title: 'Token Verified',
                    text: 'Your token has been verified successfully.'
                });

                // Display details
                const tokenData = tokenDoc.data();
                const detailsContainer = document.getElementById("details-container");
                const detailsElement = document.getElementById("details");

                detailsContainer.style.display = "block";
                detailsElement.innerHTML = `
                    <p>Status: ${tokenData.status || "N/A"}</p>
                    <p>Type: ${tokenData.type || "N/A"}</p>
                    <p>Received Payement & Empty Cylinders: ${tokenData.payment_and_empty ? "Received" : "Not Received"}</p>
                    <p>Customer Name: ${tokenData.customer_name || "N/A"}</p>
                    <p>Customer NIC: ${tokenData.customer_id || "N/A"}</p>
                    <p>Quantity: ${tokenData.quantity || "N/A"}</p>
                    <p>Correspondent Outlet: ${tokenData.outlet || "N/A"}</p>
                    <p>Issue Date: ${tokenData.issue_date ? tokenData.issue_date.toDate().toLocaleDateString() : "N/A"}</p>
                    <p>Expected Delivery Date: ${tokenData.expected_delivery_date ? tokenData.expected_delivery_date.toDate().toLocaleDateString() : "N/A"}</p>
                    <button type="submit" class="btn btn-danger" id="re-btn">Reallocate Token</button>
                    <button type="submit" class="btn btn-primary" id="p-e-btn">Payment & Empty</button>
                    <button type="submit" class="btn btn-success" id="hand-btn">Gas Handover</button>
                `;

                // Add event listener for "Reallocate Token" button
                document.getElementById("re-btn").addEventListener("click", () => displayReallocationForm(tokenDocRef, tokenData));
                document.getElementById("p-e-btn").addEventListener("click", () => displayPaymentAndEmptyForm(tokenDocRef, tokenData));
                document.getElementById("hand-btn").addEventListener("click", () => displayGasHandoverForm(tokenDocRef, tokenData));
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Details not found',
                    text: 'No details found for the entered Token ID.'
                });
            }
        } catch (error) {
            console.error("Error fetching token details:", error);
            alert("Failed to fetch token details. Please try again.");
        }
    } else {
        Swal.fire({
            icon: 'error',
            title: 'ID not found',
            text: 'Please enter a valid Token ID.'
        });
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
                const customerDocRef = doc(db, "customer", customerID);
                const customerDoc = await getDoc(customerDocRef);

                if (customerDoc.exists()) {
                    const customerData = customerDoc.data();

                    // Update token document with customer data
                    await updateDoc(tokenDocRef, {
                        customer_id: customerID,
                        customer_name: customerData.name || "Unknown"
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
                await updateDoc(tokenDocRef, { payment_and_empty: true });
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
                    payment_and_empty: false
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
                            payment_and_empty: true, 
                        }).then( () => {
                            fetchTokenDetails();
                        });

                        // Fetch the outlet document where the name matches the tokenData.outlet
                        const outletQuery = query(collection(db, "outlets"), where("name", "==", tokenData.outlet));
                        const outletSnapshot = await getDocs(outletQuery);
                    
                        if (!outletSnapshot.empty) {
                            const outletDoc = outletSnapshot.docs[0]; // Get the first matched document
                            const outletData = outletDoc.data();
                            console.log("Outlet Data:", outletData);
                    
                            // Calculate the new stock
                            const currentStock = outletData.stock || 0; // Default to 0 if stock is undefined
                            const tokenQuantity = tokenData.quantity || 0; // Default to 0 if quantity is undefined
                            const newStock = currentStock - tokenQuantity;
                    
                            // Update the stock in the outlet document
                            await updateDoc(outletDoc.ref, { stock: newStock });
                            console.log(`Stock updated successfully for outlet: ${tokenData.outlet}`);
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Outlet Not Found',
                                text: `No outlet found with the name "${tokenData.outlet}".`
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

    try {
        // Query tokens with "payment_and_empty" field set to false
        const unpaidQuery = query(tokenCollectionRef, where("outlet", "==", outletName), where("payment_and_empty", "==", false));
        const unpaidSnapshot = await getDocs(unpaidQuery);

        // Clear table body
        tbody.innerHTML = "";

        if (unpaidSnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="4">No unpaid tokens found</td></tr>`;
            return;
        }

        // Iterate over each unpaid token
        for (const tokenDoc of unpaidSnapshot.docs) {
            const tokenData = tokenDoc.data();
            const tokenId = tokenDoc.id;
            const customerID = tokenData.customer_id || "N/A";
            const customerName = tokenData.customer_name || "N/A";
            const customerType = tokenData.type || "N/A";
            const expectedDeliveryDate = tokenData.expected_delivery_date
                ? tokenData.expected_delivery_date.toDate().toLocaleDateString()
                : "N/A";

            let contact = "N/A";

            // Fetch customer contact if customer NIC is available
            if (customerID !== "N/A") {
                const customerDocRef = doc(db, "customer", customerID);
                const customerDoc = await getDoc(customerDocRef);

                if (customerDoc.exists()) {
                    contact = customerDoc.data().contact || "N/A";
                }
            }

            // Create a new row for the table
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${tokenId}</td>
                <td>${customerName}</td>
                <td>${customerType}</td>
                <td>${expectedDeliveryDate}</td>
                <td>${contact}</td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error("Error populating unpaid tokens table:", error);
        tbody.innerHTML = `<tr><td colspan="4">Failed to load data. Please try again later.</td></tr>`;
    }
}
populateUnpaidTokensTable();


// Add event listener for the submit button
document.getElementById("enter-btn").addEventListener("click", fetchTokenDetails);
