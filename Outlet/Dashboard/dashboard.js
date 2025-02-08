import { getFirestore, collection, getDocs, query, where, doc } from "firebase/firestore";
import { app } from "../../app.js"; // Adjust the path to app.js if needed

const db = getFirestore(app);

export let outletData = null; // Exported for sharing across modules

export function reinitializeSidebarToggle() {
    const hamburger = document.querySelector(".toggle-btn");
    const toggler = document.querySelector("#icon");

    console.log("Sidebar toggle initialized."); // Debugging

    if (hamburger && toggler) {
        hamburger.addEventListener("click", function () {
            document.querySelector("#sidebar").classList.toggle("expand");
            toggler.classList.toggle("bxs-chevrons-right");
            toggler.classList.toggle("bxs-chevrons-left");
        });
    } else {
        console.error("Sidebar elements not found.");
    }
}


// Function to load page content dynamically
function loadContent(page) {
    fetch(page)
        .then((response) => response.text())
        .then((html) => {
            // Inject the HTML into the main content area
            document.getElementById("main-content").innerHTML = html;

            // Dynamically load the corresponding CSS file
            const cssFile = page.replace(".html", ".css");
            const existingCss = document.querySelector(`link[href="${cssFile}"]`);
            if (!existingCss) {
                const linkElement = document.createElement("link");
                linkElement.rel = "stylesheet";
                linkElement.href = cssFile;
                document.head.appendChild(linkElement);
            }

            // Dynamically load the corresponding JavaScript file
            const scriptFile = page.replace(".html", ".js");
            const scriptElement = document.createElement("script");
            scriptElement.type = "module";
            scriptElement.src = scriptFile;


            // Remove any existing dynamically added scripts
            const existingScripts = document.querySelectorAll("#main-content script");
            existingScripts.forEach((script) => script.remove());

            // Append the new script
            document.getElementById("main-content").appendChild(scriptElement);

            // Reinitialize the sidebar toggle
            reinitializeSidebarToggle(); // Ensure toggle is working after content load
        })
        .catch((error) => console.error("Error loading content:", error));
}


// Add click event listeners to all sidebar links
document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", (event) => {
        event.preventDefault(); // Prevent the browser from navigating
        const page = event.target.closest("a").getAttribute("href"); // Get the link's href
        loadContent(page); // Call the function to load content
    });
});

// Function to load dashboard data for the logged-in Outlet Manager
export async function loadOutletManagerDashboard() {
    const outletName = localStorage.getItem("outletName");
    console.log("Fetched outletName from localStorage:", outletName);

    if (!outletName) {
        console.error("outlet information not found. Please log in again.");
        window.location.href = "/index.html";
        return;
    }

    try {
        const outletsRef = collection(db, "outlets");
        const q = query(outletsRef, where("name", "==", outletName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const outletDoc = querySnapshot.docs[0];
            outletData = outletDoc.data(); // Save outlet data globally

            console.log("Fetched outlet data:", outletData);

            // Update dashboard elements if available
            const locationElem = document.getElementById("location");
            if (locationElem) locationElem.innerText = outletData.location;

            const h3LocationElem = document.getElementById("h3-location");
            if (h3LocationElem) h3LocationElem.innerText = outletData.location;

            // Fetch stock information from the stock collection
            const stockRef = collection(db, "stock");
            const stockQuery = query(stockRef, where("outletId", "==", outletName)); // Query for the matching outletId
            const stockSnapshot = await getDocs(stockQuery);

            if (!stockSnapshot.empty) {
                const stockDoc = stockSnapshot.docs[0]; // Get the first matching stock document
                const stockQuantity = stockDoc.data().quantity; // Get the quantity from the stock document

                // Update the stock quantity in the dashboard
                const currentStockElem = document.querySelector(".current-stock");
                if (currentStockElem) currentStockElem.innerText = stockQuantity;
                localStorage.setItem("currentStock", stockQuantity);
            } else {
                console.error("Stock information not found for the outlet.");
            }

        } else {
            console.error("Outlet data not found for the specified location.");
        }
    } catch (error) {
        console.error("Error fetching outlet data:", error);
    }
    loadDoughnutChart();
}

// Function to load Doughnut chart data
async function loadDoughnutChart() {
    const outletName = localStorage.getItem("outletName");

    try {
        const tokensRef = collection(db, "tokens");
        const q = query(tokensRef);
        const querySnapshot = await getDocs(q);

        let totalTokens = 0;
        let unclaimedTokens = 0;
        let claimed = 0;
        let unclaimed = 0;

        // Iterate through the documents in the tokens collection
        for (const tokenDoc of querySnapshot.docs) {
            totalTokens++; // Increment total tokens count
            const tokenData = tokenDoc.data();
            if (tokenData.status === "Unclaimed") {
                unclaimedTokens++; // Increment unclaimed tokens count
            }

            // Now, fetch the scheduleId from the token and check the schedules collection
            const scheduleId = tokenData.scheduleId;

            const schedulesRef = collection(db, "schedule");
            const scheduleSnapshot = await getDocs(schedulesRef);

            // Iterate through the schedule documents to find the matching schedule by doc.id
            scheduleSnapshot.forEach((scheduleDoc) => {
                if (scheduleDoc.id === scheduleId) {
                    const scheduleData = scheduleDoc.data();
                    if (scheduleData.outletId === outletName) {
                        // Token is issued by the current outlet
                        if (tokenData.status === "Claimed") {
                            claimed += tokenData.quantity; // Count claimed tokens
                        } else if (tokenData.status === "Unclaimed") {
                            unclaimed += tokenData.quantity; // Count unclaimed tokens
                        }
                    }
                }
            });
        }

        console.log("Total Tokens:", totalTokens);
        console.log("Unclaimed Tokens:", unclaimedTokens);

        document.querySelector(".total-tokens").innerText = totalTokens;
        document.querySelector(".pending-tokens").innerText = unclaimedTokens;

        localStorage.setItem("totalTokens", totalTokens);

        // Update Doughnut chart
        new Chart(document.getElementById("doughnut-chart"), {
            type: "doughnut",
            data: {
                labels: ["Claimed", "Unclaimed"],
                datasets: [
                    {
                        label: "Gas Quantities",
                        backgroundColor: ["#0D6EFD", "#FF5252"],
                        data: [claimed, unclaimed],
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: "top",
                    },
                    title: {
                        display: true,
                        text: "Claimed Vs. Unclaimed Gas Quantities",
                        font: {
                            weight: 'bold',
                            size: '18px',
                        },
                    },
                },
            },
        });

        document.getElementById("claimed").innerText = claimed;
        document.getElementById("unclaimed").innerText = unclaimed;

    } catch (error) {
        console.error("Error fetching tokens data:", error);
    }
}


// Load the dashboard data on page load
loadOutletManagerDashboard();

// Initialize the sidebar toggle functionality on page load
reinitializeSidebarToggle();