import { getFirestore, collection, getDocs, query, where, doc, deleteDoc, updateDoc, getDoc, addDoc, Timestamp } from "firebase/firestore";
import { app } from "../../app.js";

const db = getFirestore(app);

// Function to fetch data and populate the table
async function fetchOutletRequests() {
    const tableBody = document.getElementById("table-body");

    // Clear existing table rows
    tableBody.innerHTML = "";

    try {
        // Create a Firestore query to filter documents with "status" = "pending"
        const q = query(collection(db, "outlet_requests"), where("status", "==", "pending"));

        // Fetch data from 'outlet_requests' collection with the query
        const querySnapshot = await getDocs(q);
        let index = 1; // To track row numbers

        querySnapshot.forEach((doc) => {
            const data = doc.data();

            

            // Create a new row
            const row = document.createElement("tr");

            // Populate the row with data
            row.innerHTML = `
                <td>${index++}</td>
                <td>${data.outlet_name || "N/A"}</td>
                <td>${data.requested_date.toDate().toLocaleDateString()}</td>
                <td>${data.scheduled_delivery_date.toDate().toLocaleDateString()}</td>
                <td>${data.gas_quantity || "N/A"}</td>
                <td>
                    <button class="btn btn-success btn-sm dispatch-btn">Dispatch</button>
                    <button class="btn btn-danger btn-sm deny-btn">Deny Request</button>
                </td>
            `;

            // Append the row to the table body
            tableBody.appendChild(row);
        });

        // Add event listeners for buttons
        document.querySelectorAll(".dispatch-btn").forEach((button) => {
            button.addEventListener("click", handleDispatch);
        });

        document.querySelectorAll(".deny-btn").forEach((button) => {
            button.addEventListener("click", handleDeny);
        });
    } catch (error) {
        console.error("Error fetching outlet requests:", error);
    }
}

async function handleDispatch(event) {
    const row = event.target.closest("tr");

    // Extract unique fields from the table row
    const outletName = row.children[1].textContent.trim();
    const requestedDate = new Date(row.children[2].textContent.trim());
    const expectedDeliveryDate = new Date(row.children[3].textContent.trim());
    const gasQuantity = parseFloat(row.children[4].textContent.trim());

    try {
        // Get the start and end of the day for requested_date
        const requestedStartOfDay = Timestamp.fromDate(new Date(requestedDate.setHours(0, 0, 0, 0)));
        const requestedEndOfDay = Timestamp.fromDate(new Date(requestedDate.setHours(23, 59, 59, 999)));

        // Get the start and end of the day for scheduled_delivery_date
        const deliveryStartOfDay = Timestamp.fromDate(new Date(expectedDeliveryDate.setHours(0, 0, 0, 0)));
        const deliveryEndOfDay = Timestamp.fromDate(new Date(expectedDeliveryDate.setHours(23, 59, 59, 999)));

        // Query to find the matching document in `outlet_requests`
        const q = query(
            collection(db, "outlet_requests"),
            where("outlet_name", "==", outletName),
            where("gas_quantity", "==", gasQuantity),
            where("requested_date", ">=", requestedStartOfDay),
            where("requested_date", "<=", requestedEndOfDay),
            where("scheduled_delivery_date", ">=", deliveryStartOfDay),
            where("scheduled_delivery_date", "<=", deliveryEndOfDay)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docRef = querySnapshot.docs[0].ref; // Get the first matching document

            // Get the document from `scheduled_deliveries` collection
            const scheduledDeliveryDoc = doc(db, "scheduled_deliveries", outletName);
            const scheduledDeliverySnapshot = await getDoc(scheduledDeliveryDoc);

            if (scheduledDeliverySnapshot.exists()) {
                const currentStock = scheduledDeliverySnapshot.data().stock_amount;

                if (currentStock >= gasQuantity) {
                    await updateDoc(scheduledDeliveryDoc, {
                        stock_amount: currentStock - gasQuantity,
                    });

                    await Swal.fire({
                        title: "Dispatch Successful",
                        text: `Dispatch successful for ${outletName}. Stock updated.`,
                        icon: "success",
                    });

                    // Update the "status" to "dispatch"
                    await updateDoc(docRef, {
                        status: "dispatch",
                        dispatch_date: Timestamp.now(),
                    });

                    // Query the outlets collection for the document where outlet_name matches
                    const outletQuery = query(
                        collection(db, "outlets"),
                        where("name", "==", outletName) // Assuming "name" is the field containing the outlet name
                    );

                    const outletQuerySnapshot = await getDocs(outletQuery);

                    if (!outletQuerySnapshot.empty) {
                        const outletDocRef = outletQuerySnapshot.docs[0].ref; // Get the first matching outlet document
                        const outletData = outletQuerySnapshot.docs[0].data();
                        const currentStock = outletData.stock || 0; // Default to 0 if stock field is not present

                        // Update the stock in the outlets collection
                        await updateDoc(outletDocRef, {
                            stock: currentStock + gasQuantity,
                        });

                        await Swal.fire({
                            title: "Stock Updated",
                            text: `Stock for ${outletName} updated successfully.`,
                            icon: "success",
                        });

                        // Add a notification document with an auto-generated ID
                        await addDoc(collection(db, "notifications"), {
                            sender: "Dispatch Ofice",
                            message: "Dear Customer, Handover empty cylinders and the money for the requested gas.",
                            receiver: `${outletName} Customers`,
                            timestamp: Timestamp.now(), // Store the current timestamp
                        });

                        // Add a notification document with an auto-generated ID
                        await addDoc(collection(db, "notifications"), {
                            sender: "Dispatch Ofice",
                            message: `Your request for ${gasQuantity} units of gas, requested on ${requestedDate.toLocaleDateString()} and scheduled for delivery on ${expectedDeliveryDate.toLocaleDateString()} has been dispatched.`,
                            receiver: `${outletName}`,
                            timestamp: Timestamp.now(), // Store the current timestamp
                        });

                    } else {
                        await Swal.fire({
                            title: "Outlet Not Found",
                            text: `No outlet found with the name ${outletName}.`,
                            icon: "error",
                        });
                    }

                    // Optionally refresh the table
                    fetchOutletRequests();

                } else {
                    await Swal.fire({
                        title: "Insufficient Stock",
                        text: `Not enough stock for ${outletName}. Dispatch failed.`,
                        icon: "error",
                    });
                }
            } else {
                await Swal.fire({
                    title: "Scheduled Delivery Not Found",
                    text: `No scheduled delivery data found for ${outletName}.`,
                    icon: "error",
                });
            }
        } else {
            await Swal.fire({
                title: "No Match Found",
                text: `No matching request found for outlet: ${outletName}.`,
                icon: "info",
            });
        }
    } catch (error) {
        console.error("Error during dispatch action:", error);
        await Swal.fire({
            title: "Error",
            text: "An error occurred while processing the dispatch.",
            icon: "error",
        });
    }
}


async function handleDeny(event) {
    const row = event.target.closest("tr");

    // Extract unique fields from the table row
    const outletName = row.children[1].textContent.trim();
    const requestedDate = new Date(row.children[2].textContent.trim()); // Convert date to JS Date object
    const expectedDeliveryDate = new Date(row.children[3].textContent.trim());
    const gasQuantity = parseFloat(row.children[4].textContent.trim()); // Convert quantity to a number

    try {
        // Get the start and end of the day for requested_date
        const requestedStartOfDay = Timestamp.fromDate(new Date(requestedDate.setHours(0, 0, 0, 0)));
        const requestedEndOfDay = Timestamp.fromDate(new Date(requestedDate.setHours(23, 59, 59, 999)));

        // Get the start and end of the day for scheduled_delivery_date
        const deliveryStartOfDay = Timestamp.fromDate(new Date(expectedDeliveryDate.setHours(0, 0, 0, 0)));
        const deliveryEndOfDay = Timestamp.fromDate(new Date(expectedDeliveryDate.setHours(23, 59, 59, 999)));

        // Query Firestore to find the document matching all unique fields
        const q = query(
            collection(db, "outlet_requests"),
            where("outlet_name", "==", outletName),
            where("gas_quantity", "==", gasQuantity),
            where("requested_date", ">=", requestedStartOfDay),
            where("requested_date", "<=", requestedEndOfDay),
            where("scheduled_delivery_date", ">=", deliveryStartOfDay),
            where("scheduled_delivery_date", "<=", deliveryEndOfDay)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Confirmation prompt before deleting
            const result = await Swal.fire({
                title: "Are you sure?",
                text: `Deny the request for ${outletName}?`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes, deny it!",
                cancelButtonText: "No, cancel!",
            });

            if (result.isConfirmed) {
                // Loop through and delete matching documents
                querySnapshot.forEach(async (docSnapshot) => {
                    const docRef = doc(db, "outlet_requests", docSnapshot.id);
                    await deleteDoc(docRef);
                });

                await Swal.fire({
                    title: "Request Denied",
                    text: `Request denied and deleted for outlet: ${outletName}.`,
                    icon: "success",
                });

                // Add a notification document with an auto-generated ID
                await addDoc(collection(db, "notifications"), {
                    sender: "Dispatch Office",
                    message: `Your request for ${gasQuantity} units of gas, requested on ${requestedDate.toLocaleDateString()} and scheduled for delivery on ${expectedDeliveryDate.toLocaleDateString()} has been denied and removed.`,
                    receiver: `${outletName}`,
                    timestamp: Timestamp.now(), // Store the current timestamp
                });                

            // Refresh the table
            fetchOutletRequests();

            }

        } else {
            Swal.fire({
                title: "No Match Found",
                text: `No matching request found for outlet: ${outletName}.`,
                icon: "info",
            });
        }
    } catch (error) {
        console.error(`Error deleting document for outlet ${outletName}:`, error);
        Swal.fire({
            title: "Error",
            text: "Failed to delete the request. Please try again.",
            icon: "error",
        });
    }
}


// Call the function to fetch and display data
fetchOutletRequests();
