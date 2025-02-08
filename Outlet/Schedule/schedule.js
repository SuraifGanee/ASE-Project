import { getFirestore, collection, query, where, onSnapshot, updateDoc, getDocs, getDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { app } from "../../app.js";

const db = getFirestore(app);
const outletName = localStorage.getItem("outletName"); // Get the logged-in outlet name

// Function to initialize and populate the table
function initializeTable() {
    const tableBody = document.getElementById("table-body"); // Reference to the table body
    const scheduledDeliveriesRef = collection(db, "requests");

    // Query Firestore to get documents where outletId matches the outletName
    const q = query(scheduledDeliveriesRef, where("outletId", "==", outletName));

    // Real-time listener for changes in the collection
    onSnapshot(q, (snapshot) => {
        tableBody.innerHTML = ""; // Clear the table before populating new data

        snapshot.docs.forEach((docSnap, index) => {
            const data = docSnap.data();
            const row = document.createElement("tr"); // Create a new row
            
            // Create "Mark as Received" button conditionally
            let receivedButton = "";
            if (data.status === "dispatch") {
                receivedButton = `<button class="btn btn-success received-confirm" data-id="${docSnap.id}" data-quantity="${data.quantity}">Confirm Gas Received</button>`;
            } else if (data.status === "received") {
                receivedButton = `<button class="btn btn-secondary" disabled>Received ✅</button>`;
            } else if (data.status === "pending") {
                receivedButton = `<button class="btn btn-secondary" disabled>Pending ❗</button>`;
            }

            localStorage.setItem("scheduleDate", data.scheduleDate.toDate().toISOString());

            // Create table row with dynamic data
            row.innerHTML = `
                <td>${index + 1}</td> <!-- Row number -->
                <td>${data.quantity || 0}</td> <!-- Quantity -->
                <td>${data.scheduleDate ? new Date(data.scheduleDate.toDate()).toLocaleDateString() : 'N/A'}</td> <!-- Schedule Delivery Date -->
                <td>${data.status || 'Pending'}</td> <!-- Status -->
                <td>${receivedButton}</td> <!-- Mark as Received Button -->
            `;
            tableBody.appendChild(row); // Append the row to the table body
        });

        // Add event listeners for all "Received Confirm" buttons
        document.querySelectorAll(".received-confirm").forEach(button => {
            button.addEventListener("click", async (event) => {
                const requestId = event.target.dataset.id;
                const receivedQuantity = parseInt(event.target.dataset.quantity, 10);

                // Show SweetAlert2 confirmation popup
                Swal.fire({
                    title: "Confirm Receipt",
                    text: "Do you confirm you received the gas from the dispatch office?",
                    icon: "question",
                    showCancelButton: true,
                    confirmButtonText: "Yes, Confirm",
                    cancelButtonText: "Cancel"
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            // Find the stock document where outletId matches
                            const stockRef = collection(db, "stock");
                            const stockQuery = query(stockRef, where("outletId", "==", outletName));
                            const stockSnapshot = await getDocs(stockQuery);

                            if (!stockSnapshot.empty) {
                                // Assuming each outlet has only one stock document
                                const stockDoc = stockSnapshot.docs[0];
                                const stockData = stockDoc.data();
                                const newQuantity = (stockData.quantity || 0) + receivedQuantity;

                                // Update the stock quantity
                                await updateDoc(doc(db, "stock", stockDoc.id), {
                                    quantity: newQuantity
                                });

                                // Update the request status to "received"
                                await updateDoc(doc(db, "requests", requestId), {
                                    status: "received",
                                    receivedDate: serverTimestamp()
                                });

                                // Step 1: Find schedule document ID where requestId matches
                                const scheduleRef = collection(db, "schedule");
                                const scheduleQuery = query(scheduleRef, where("requestId", "==", requestId));
                                const scheduleSnapshot = await getDocs(scheduleQuery);

                                if (!scheduleSnapshot.empty) {
                                    const scheduleDoc = scheduleSnapshot.docs[0]; // Assuming one match
                                    const scheduleId = scheduleDoc.id;

                                    // Step 2: Find tokens where scheduleId matches
                                    const tokensRef = collection(db, "tokens");
                                    const tokensQuery = query(tokensRef, where("scheduleId", "==", scheduleId));
                                    const tokensSnapshot = await getDocs(tokensQuery);

                                    const customerIds = [];
                                    tokensSnapshot.forEach(tokenDoc => {
                                        customerIds.push(tokenDoc.data().customerId); // Store customer IDs for notifications
                                    });

                                    console.log("Customers to notify:", customerIds); // We'll use this in the next step

                                    // Step 3: Get customer emails from the customers collection
                                    const emails = [];
                                    for (const customerId of customerIds) {
                                        const customerRef = doc(db, "customers", customerId);
                                        const customerSnapshot = await getDoc(customerRef);
                                        if (customerSnapshot.exists()) {
                                            const customerData = customerSnapshot.data();
                                            if (customerData.email) {
                                                emails.push(customerData.email);
                                            }
                                        }
                                    }
            
                                    console.log("Emails to notify:", emails);
            
                                    // Initialize EmailJS
                                    (function() {
                                        emailjs.init("u9lIWBdyZ1jZbkhPy"); // Replace with your actual EmailJS User ID
                                    })();
            
                                    // Function to send email notifications
                                    function sendEmails(emails, fromName, messageContent) {
                                        const serviceID = "service_js2bq95";  // Replace with your EmailJS Service ID
                                        const templateID = "template_s79tvkb";  // Replace with your EmailJS Template ID
            
                                        emails.forEach(email => {
                                            const emailParams = {
                                                to_email: email,    // Receiver's email
                                                from_name: fromName, // Sender name (e.g., "GasByGas Team")
                                                message: messageContent // Email message content
                                            };
            
                                            emailjs.send(serviceID, templateID, emailParams)
                                                .then(response => {
                                                    console.log(`✅ Email sent to: ${email}`, response);
                                                })
                                                .catch(error => {
                                                    console.error(`❌ Failed to send email to ${email}:`, error);
                                                });
                                        });
                                    }
            
                                    const scheduleDate = localStorage.getItem("scheduleDate");
                                    const formattedDate = scheduleDate ? new Date(scheduleDate).toLocaleDateString() : "N/A";
            
                                    // Example Usage
                                    const fromName = "GasByGas Team"; // Sender Name
                                    const messageContent = `Your scheduled gas delivery on ${formattedDate} has been received by the outlet. Please visit the outlet to collect your gas.`; // Email message
            
                                    sendEmails(emails, fromName, messageContent);
                                              
                                    const message = `Your scheduled gas delivery on ${formattedDate} has been received by the outlet. Please visit the outlet to collect your gas.`;

                                    const notificationsRef = collection(db, "notifications");
                                    for (const customerId of customerIds) {
                                        await addDoc(notificationsRef, {
                                            sender: outletName,
                                            receiver: customerId,
                                            timestamp: serverTimestamp(),
                                            message: message
                                        });
                                    }
                                    
                                    // Change button appearance
                                    event.target.classList.remove("btn-success");
                                    event.target.classList.add("btn-secondary");
                                    event.target.textContent = "Received ✅";
                                    event.target.disabled = true;

                                    // Show success message
                                    Swal.fire("Success!", "Stock updated and marked as received.", "success");
                                } else {
                                    Swal.fire("Error", "No matching schedule found.", "error");
                                }
                             } else {
                                Swal.fire("Error", "Stock record not found for this outlet.", "error");
                            }
                        } catch (error) {
                            console.error("Error updating stock:", error);
                            Swal.fire("Error", "Something went wrong!", "error");
                        }
                    }
                });
            });
        });
    });
}

// Initialize the table
initializeTable();


