import { getFirestore, collection, query, where, orderBy, getDocs, addDoc, Timestamp, documentId } from "firebase/firestore";
import { app } from "../../app.js";

const db = getFirestore(app);

// Get the outlet name from local storage
const outletName = localStorage.getItem("outletName");
console.log("Name of the outlet:", outletName);

document.getElementById("outlet-name").innerText = outletName;

// Form and container elements
const form = document.getElementById("notification-form");
const notificationsContainer = document.getElementById("notifications-container");

// Submit the form to send a notification
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = document.getElementById("message").value;

    try {
        // Add notification to Firestore
        const docRef = await addDoc(collection(db, "notifications"), {
            sender: outletName,
            receiver: `${outletName} Customers`,
            message: message,
            timestamp: Timestamp.now()
        });

        console.log("Document written with ID: ", docRef.id);

        // Reset form and fetch notifications
        form.reset();
        fetchNotifications();

        // Show success alert
        Swal.fire({
            icon: "success",
            title: "Notification Sent!",
            text: "Your message has been sent successfully.",
            timer: 2000,
            showConfirmButton: false
        });
    } catch (error) {
        console.error("Error adding document: ", error);

        // Show error alert
        Swal.fire({
            icon: "error",
            title: "Failed to Send!",
            text: "There was an issue sending the notification. Please try again.",
            confirmButtonText: "OK"
        });
    }
});
 

// Fetch notifications
async function fetchNotifications() {
    const notificationsContainer = document.getElementById("notifications-container");
    notificationsContainer.innerHTML = ""; // Clear old notifications

    const notificationsRef = collection(db, "notifications");

    // Query for receiver == outletName
    const query1 = query(
        notificationsRef,
        where("receiver", "==", outletName),
        orderBy("timestamp", "desc")
    );

    // Query for receiver == "All Outlet"
    const query2 = query(
        notificationsRef,
        where("receiver", "==", "All Outlets"),
        orderBy("timestamp", "desc")
    );

    // Fetch both queries
    const [snapshot1, snapshot2] = await Promise.all([getDocs(query1), getDocs(query2)]);

    // Combine and sort results
    const combinedResults = [];
    snapshot1.forEach((doc) => combinedResults.push(doc.data()));
    snapshot2.forEach((doc) => combinedResults.push(doc.data()));

    // Sort combined results by timestamp
    combinedResults.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

    // Render notifications
    combinedResults.forEach(({ timestamp, sender, receiver, message }) => {
        const formattedTime = new Date(timestamp.seconds * 1000).toLocaleString();

        const notificationCard = `
            <div class="notification-card">
                <div class="notification-timestamp">${formattedTime},<span id="notification-receiver">From: ${sender}</span>,<span id="notification-receiver">To: ${receiver}</span></div>
                <div id="message">Message: ${message}</div>
            </div>
        `;
        notificationsContainer.insertAdjacentHTML("beforeend", notificationCard);
    });
}

// Fetch notifications
async function fetchSentNotifications() {
    const notificationsContainer = document.getElementById("sent-notifications-container");
    notificationsContainer.innerHTML = ""; // Clear old notifications

    const notificationsRef = collection(db, "notifications");

    // Query for receiver == outletName
    const query1 = query(
        notificationsRef,
        where("sender", "==", outletName),
        orderBy("timestamp", "desc")
    );

    // Fetch both queries
    const snapshot1 = await getDocs(query1);

    // Combine and sort results
    const combinedResults = [];
    snapshot1.forEach((doc) => combinedResults.push(doc.data()));

    // Sort combined results by timestamp
    combinedResults.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

    // Render notifications
    combinedResults.forEach(({ timestamp, sender, receiver, message }) => {
        const formattedTime = new Date(timestamp.seconds * 1000).toLocaleString();

        const notificationCard = `
            <div class="notification-card">
                <div class="notification-timestamp">${formattedTime},<span id="notification-receiver">From: ${sender}</span>,<span id="notification-receiver">To: ${receiver}</span></div>
                <div id="message">Message: ${message}</div>
            </div>
        `;
        notificationsContainer.insertAdjacentHTML("beforeend", notificationCard);
    });
}

fetchNotifications();
fetchSentNotifications();

