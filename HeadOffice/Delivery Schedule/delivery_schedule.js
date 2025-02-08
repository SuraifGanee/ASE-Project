import { getFirestore, collection, getDocs, getDoc, doc, updateDoc, serverTimestamp, query, where, addDoc   } from "firebase/firestore";
import { app } from "../../app.js";

const db = getFirestore(app);

// Function to convert Firestore Timestamp to readable date
function formatTimestamp(timestamp) {
    if (!timestamp || !timestamp.seconds) return "";
    const date = new Date(timestamp.seconds * 1000); // Convert seconds to milliseconds
    return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
}

// Initialize DataTable
async function initializeTable() {
    const table = $('#scheduled-deliveries').DataTable();
    table.clear().draw(); // Clear previous data

    const requestRef = collection(db, "requests");
    const snapshot = await getDocs(requestRef);

    let rowIndex = 1;

    snapshot.forEach((doc) => {
        const data = doc.data();
        let actionButtons = '';
    
        if (data.status !== "received") {
            if (data.status === "dispatch") {
                // If status is "dispatch", disable buttons
                actionButtons = `
                    <button class="btn btn-warning btn-sm edit-button" data-id="${doc.id}" disabled>Edit</button>
                    <button class="btn btn-primary btn-sm dispatch-button" data-id="${doc.id}" disabled>Dispatch</button>
                `;
            } else {
                // Enable buttons for other statuses
                actionButtons = `
                    <button class="btn btn-warning btn-sm edit-button" data-id="${doc.id}">Edit</button>
                    <button class="btn btn-primary btn-sm dispatch-button" data-id="${doc.id}">Dispatch</button>
                `;
            }
    
            table.row.add([
                rowIndex++,
                data.outletId || "N/A",
                data.quantity || 0,
                formatTimestamp(data.requestDate),
                formatTimestamp(data.scheduleDate),
                data.status || "N/A",
                actionButtons
            ]).draw();
        }
    });    

    attachRowEventListeners();
}

// Attach event listeners
function attachRowEventListeners() {
    $('.edit-button').off('click').on('click', function () {
        const row = $(this).closest('tr');
        const scheduleDateCell = row.find('td:eq(4)'); // Schedule Date column

        const currentDate = scheduleDateCell.text();
        
        // Store the original value for cancellation
        scheduleDateCell.data('original-date', currentDate);

        // Replace the Schedule Date cell with a date input
        scheduleDateCell.html(`<input type="date" class="form-control schedule-date-input" value="${currentDate}" />`);

        // Hide the "Edit" button and show "Save" and "Cancel"
        row.find('td:eq(6)').html(`
            <button class="btn btn-success btn-sm save-button" data-id="${row.find('.edit-button').data("id")}">Save</button>
            <button class="btn btn-secondary btn-sm cancel-button">Cancel</button>
        `);
        

        attachSaveCancelEvent(row); // Attach save and cancel events
    });

    $('.dispatch-button').off('click').on('click', async function () {
        const requestId = $(this).data("id");

        Swal.fire({
            icon: 'info',
            title: 'Confirm Dispatch',
            text: 'Are you sure you want to dispatch this request?',
            showCancelButton: true,
            confirmButtonText: 'Yes, dispatch it!',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const requestRef = doc(db, "requests", requestId);
                    const requestSnap = await getDoc(requestRef);

                    if (requestSnap.exists()) {
                        const requestData = requestSnap.data();
                        localStorage.setItem("schedule-date", requestData.scheduleDate.toDate().toISOString());
                        localStorage.setItem("outlet-id", requestData.outletId);
                        
                        await updateDoc(requestRef, {
                            status: "dispatch",
                            dispatchDate: serverTimestamp()
                        });
                    }


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

                        const scheduleDate = localStorage.getItem("schedule-date");
                        const formattedDate = scheduleDate ? new Date(scheduleDate).toLocaleDateString() : "N/A";

                        // Example Usage
                        const fromName = "GasByGas Team"; // Sender Name
                        const messageContent = `Your scheduled gas delivery on ${formattedDate} has been dispatched. Please handover the payment and return the empty cylinders.`; // Email message

                        sendEmails(emails, fromName, messageContent);

                        const message = `Dear Customer, Your scheduled gas delivery on ${formattedDate} has been dispatched. Please handover the payment and return the empty cylinders.`;

                        const notificationsRef = collection(db, "notifications");
                        for (const customerId of customerIds) {
                            await addDoc(notificationsRef, {
                                sender: "Dispatch Office",
                                receiver: customerId,
                                timestamp: serverTimestamp(),
                                message: message
                            });
                        }
                        const outletName = localStorage.getItem("outlet-id");
                        await addDoc(notificationsRef, {
                            sender: "Dispatch Office",
                            receiver: outletName,
                            timestamp: serverTimestamp(),
                            message: `Your scheduled gas delivery on ${formattedDate} has been dispatched.`
                        });
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'Dispatched',
                        text: 'The request has been marked as dispatched.',
                    });

                    initializeTable(); // Refresh table after update
                } catch (error) {
                    console.error("Error updating document: ", error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to update request status.',
                    });
                }
            }
        });
    });

}

// Attach save and cancel event for editing
function attachSaveCancelEvent(row) {
    // Save button click handler
    $('.save-button').off('click').on('click', async function () {
        const row = $(this).closest('tr');
        const requestId = row.find('.save-button').data("id") || row.find('.edit-button').data("id"); // Get request ID from the edit button
        const newDate = row.find('.schedule-date-input').val();
    
        if (!requestId || !newDate) {
            console.error("Invalid date or request ID!");
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Invalid date or request ID!',
            });
            return;
        }
    
        try {
            const requestRef = doc(db, "requests", requestId);
        
            // Get the old schedule date before updating
            const requestSnapshot = await getDoc(requestRef);
            if (!requestSnapshot.exists()) {
                console.error("Request not found");
                return;
            }
            const oldDate = requestSnapshot.data().scheduleDate.toDate(); // Convert Firestore timestamp to JS Date
        
            // Convert to readable format
            const oldDateFormatted = oldDate.toLocaleDateString();
            const newDateFormatted = new Date(newDate).toLocaleDateString();
        
            // Update Firestore with the new date
            const newTimestamp = new Date(newDate + "T00:00:00Z");
            await updateDoc(requestRef, {
                scheduleDate: newTimestamp
            });
        
            // Step 1: Find the schedule document where requestId matches
            const scheduleRef = collection(db, "schedule");
            const scheduleQuery = query(scheduleRef, where("requestId", "==", requestId));
            const scheduleSnapshot = await getDocs(scheduleQuery);
        
            if (!scheduleSnapshot.empty) {
                const scheduleDoc = scheduleSnapshot.docs[0];
                const scheduleId = scheduleDoc.id;
        
                // Step 2: Find tokens where scheduleId matches
                const tokensRef = collection(db, "tokens");
                const tokensQuery = query(tokensRef, where("scheduleId", "==", scheduleId));
                const tokensSnapshot = await getDocs(tokensQuery);
        
                const customerIds = [];
                tokensSnapshot.forEach(tokenDoc => {
                    customerIds.push(tokenDoc.data().customerId);
                });
        
                console.log("Customers to notify:", customerIds);
        
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

                // Example Usage
                const fromName = "GasByGas Team"; // Sender Name
                const messageContent = `Your scheduled gas delivery date has changed from ${oldDateFormatted} to ${newDateFormatted}. Sorry for the inconvenience!.`; // Email message

                sendEmails(emails, fromName, messageContent);


                // Step 3: Send notifications to customers
                const notificationsRef = collection(db, "notifications");
                const message = `Dear Customer, Your scheduled gas delivery date has changed from ${oldDateFormatted} to ${newDateFormatted}. Sorry for the inconvenience!.`;
        
                for (const customerId of customerIds) {
                    await addDoc(notificationsRef, {
                        sender: "Dispatch Office",
                        receiver: customerId,
                        timestamp: serverTimestamp(),
                        message: message
                    });
                }
        
                // Step 4: Notify the outlet
                const outletName = row.find('td:eq(1)').text(); // Outlet column
                const outletMessage = `The scheduled gas delivery date for your outlet has changed from ${oldDateFormatted} to ${newDateFormatted}. Sorry for the inconvenience!.`;
        
                await addDoc(notificationsRef, {
                    sender: "Dispatch Office",
                    receiver: outletName,
                    timestamp: serverTimestamp(),
                    message: outletMessage
                });
        
                Swal.fire({
                    icon: 'success',
                    title: 'Updated',
                    text: 'Schedule date updated successfully and notifications sent!',
                });

                initializeTable(); // Refresh table after update
            }
        
        } catch (error) {
            console.error("Error updating Firestore:", error);
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: 'Could not update schedule date!',
            });
        }
        
        
    });
    

    // Cancel button click handler
    $('.cancel-button').off('click').on('click', function () {
        const originalDate = row.find('td:eq(4)').data('original-date');

        // Revert the input back to plain text
        row.find('td:eq(4)').text(originalDate);

        // Replace the Save and Cancel buttons with the Edit button
        row.find('td:eq(6)').html(`
            <button class="btn btn-warning btn-sm edit-button">Edit</button>
            <button class="btn btn-primary btn-sm dispatch-button">Dispatch</button>
        `);

        attachRowEventListeners(); // Re-attach event listeners
    });
}

// Document Ready
$(document).ready(function () {
    $('#scheduled-deliveries').DataTable({
        "columnDefs": [
            { "width": "5%", "targets": 0 },   // No column
            { "width": "20%", "targets": 1 },  // Outlet column
            { "width": "15%", "targets": 2 },  // Stock Amount column
            { "width": "17%", "targets": 3 },  // Request Date column
            { "width": "17%", "targets": 4 },  // Schedule Date column
            { "width": "10%", "targets": 5 },  // Status column
            { "width": "25%", "targets": 6 }   // Action buttons
        ],
        "autoWidth": false, // Disable automatic width calculations
        "scrollX": true, // Enable horizontal scrolling if needed
    });

    initializeTable();
});
