// Import necessary Firebase libraries
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "./app.js"; // Importing Firebase initialization from app.js

// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
    // Initialize Firestore
    const db = getFirestore(app);

    // Elements
    const wrapper = document.querySelector(".wrapper");
    const btnPopup = document.querySelector(".btnLogin-popup");
    const iconClose = document.querySelector(".icon-close");
    const loginForm = document.querySelector(".form-box form");

    // Open and close popup
    if (btnPopup) {
        btnPopup.addEventListener("click", () => {
            wrapper.classList.add("active-popup");
        });
    } else {
        console.error("Button for login popup not found.");
    }

    if (iconClose) {
        iconClose.addEventListener("click", () => {
            wrapper.classList.remove("active-popup");
        });
    } else {
        console.error("Icon for closing popup not found.");
    }

    // Check session on page load
    if (sessionStorage.getItem("userSession")) {
        // Redirect the user based on their role if already logged in
        const userData = JSON.parse(sessionStorage.getItem("userSession"));
        if (userData.staffTypeId === "Dispatch Manager") {
            window.location.href = "/HeadOffice/Dashboard/dashboard.html";
        } else if (userData.staffTypeId === "Outlet Manager") {
            window.location.href = "/Outlet/Dashboard/dashboard.html";
        }
    }

    // Login function
    async function handleLogin(event) {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!username || !password) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please enter both username and password!',
            });
            return;
        }

        try {
            const staffRef = collection(db, "staff");
            const q = query(staffRef, where("username", "==", username));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const staffDoc = querySnapshot.docs[0];
                const staffData = staffDoc.data();

                if (staffData.password === password) {

                    // Store user session in sessionStorage
                    sessionStorage.setItem("userSession", JSON.stringify(staffData));
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Login Successful',
                        text: `Welcome ${staffData.staffTypeId}!`,
                    }).then(() => {
                        if (staffData.staffTypeId === "Dispatch Manager") {
                            window.location.href = "/HeadOffice/Dashboard/dashboard.html";
                        } else if (staffData.staffTypeId === "Outlet Manager") {
                            localStorage.setItem("outletName", staffData.outletId);
                            window.location.href = "/Outlet/Dashboard/dashboard.html";
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: 'Invalid user role or missing outlet information!',
                            });
                        }
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Login Failed',
                        text: 'Incorrect password!',
                    });
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: 'User not found!',
                });
            }
        } catch (error) {
            console.error("Error logging in:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred during login. Please try again.',
            });
        }
    }

    // Attach event listener to the login form
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    } else {
        console.error("Login form not found.");
    }
});
