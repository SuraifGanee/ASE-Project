import { getFirestore, collection, query, orderBy, addDoc, getDocs, Timestamp } from "firebase/firestore";
import { app } from "../../app.js";

const db = getFirestore(app);

        // Dynamically load outlet options
        async function loadOutletOptions() {
            const recipientSelect = document.getElementById('recipient');
            const outletsRef = collection(db, "outlets");
            const snapshot = await getDocs(outletsRef);

            // Clear existing options
            recipientSelect.innerHTML = '';

            // Add static options
            recipientSelect.innerHTML += `
                <option value="All Outlets">All Outlets</option>
                <option value="All Customers">All Customers</option>
            `;

            // Add dynamic options
            snapshot.forEach((doc) => {
                const outletName = doc.data().name; // Assuming the 'name' field holds the outlet name
                

                // Add outlet and "OutletName Customers" options
                recipientSelect.innerHTML += `
                    <option value="${outletName}">${outletName}</option>
                    <option value="${outletName} Customers">${outletName} Customers</option>
                `;
            });
        }

        // Call the function to load options on page load
        loadOutletOptions();

        // Handle form submission
        const form = document.getElementById('notification-form');
        const messageHistoryContainer = document.getElementById('message-history-container');

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
    
            const recipient = document.getElementById('recipient').value;
            const message = document.getElementById('message').value;
    
            try {
                // Add data to Firestore
                const docRef = await addDoc(collection(db, "notifications"), {
                    sender: "Dispatch Office",
                    receiver: recipient,
                    message: message,
                    timestamp: Timestamp.now() // Adds Firestore timestamp
                });

                fetchNotifications();

                // Show success alert
        Swal.fire({
            icon: 'success',
            title: 'Notification Sent!',
            text: 'Your message has been sent successfully.',
            timer: 2000, // Auto close after 2 seconds
            showConfirmButton: false
        });
    
                console.log("Document written with ID: ", docRef.id);
    
                // Reset the form
                form.reset();
            } catch (error) {
                console.error("Error adding document: ", error);
                
                // Show error alert
        Swal.fire({
            icon: 'error',
            title: 'Failed to Send!',
            text: 'There was an issue sending the notification. Please try again.',
            confirmButtonText: 'OK'
        });
            }
        });


// Fetch all notifications
async function fetchNotifications() {
    const notificationsContainer = document.getElementById("message-history-container");
    notificationsContainer.innerHTML = ""; // Clear old notifications

    const notificationsRef = collection(db, "notifications");

    // Query all notifications ordered by timestamp
    const notificationsQuery = query(
        notificationsRef,
        orderBy("timestamp", "desc") // Order notifications by timestamp in descending order
    );

    // Fetch notifications
    const snapshot = await getDocs(notificationsQuery);

    // Render notifications
    snapshot.forEach((doc) => {
        const { timestamp, sender, receiver, message } = doc.data();
        const formattedTime = new Date(timestamp.seconds * 1000).toLocaleString();

        const notificationCard = `
            <div class="notification-card">
                <div class="notification-timestamp">${formattedTime},<span id="notification-sender">From: ${sender}</span>,<span id="notification-receiver">To: ${receiver}</span></div>
                <div id="message">Message: ${message}</div>
            </div>
        `;
        notificationsContainer.insertAdjacentHTML("beforeend", notificationCard);
    });
}

fetchNotifications();
