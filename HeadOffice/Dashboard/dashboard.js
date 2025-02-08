import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { app } from "../../app.js"; // Adjust the path to app.js if needed

const db = getFirestore(app);

const hamburger = document.querySelector(".toggle-btn");
const toggler = document.querySelector("#icon");

hamburger.addEventListener("click", function(){
    document.querySelector("#sidebar").classList.toggle("expand");
    toggler.classList.toggle("bxs-chevrons-right");
    toggler.classList.toggle("bxs-chevrons-left");
});

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
          const scriptFile = page.replace(".html", ".js"); // Assume JS file has the same name as HTML
          const scriptElement = document.createElement("script");
          scriptElement.type = "module"; // Use "module" if the script exports/imports
          scriptElement.src = scriptFile;

          // Remove any existing dynamically added scripts
          const existingScripts = document.querySelectorAll("#main-content script");
          existingScripts.forEach((script) => script.remove());

          // Append the new script
          document.getElementById("main-content").appendChild(scriptElement);
      })
      .catch((error) => console.error("Error loading content:", error));
}



// Add click event listeners to all sidebar links
document.querySelectorAll('.sidebar-link').forEach((link) => {
  link.addEventListener('click', (event) => {
      event.preventDefault(); // Prevent the browser from navigating
      const page = event.target.closest('a').getAttribute('href'); // Get the link's href
      loadContent(page); // Call the function to load content
  });
});


async function fetchDashboardData() {
  try {
      // Fetch Total Outlets
      const outletsRef = collection(db, "outlets");
      const outletsSnapshot = await getDocs(outletsRef);
      const totalOutlets = outletsSnapshot.size;

      document.querySelector(".total-outlets").innerText = totalOutlets;

  } catch (error) {
      console.error("Error fetching dashboard data:", error);
  }
}

async function calculateTotalSales() {
    let totalSales = 0;

    try {
        // Reference the 'requests' collection and fetch the data
        const requestsRef = collection(db, 'requests');
        const requestsSnapshot = await getDocs(requestsRef);

        requestsSnapshot.forEach((doc) => {
            const requestData = doc.data();

            // Check if the status is "received"
            if (requestData.status === "received") {
                // Retrieve the quantity field and multiply by 3680
                totalSales += (requestData.quantity || 0) * 3680;
            }
        });

        console.log("Total Sales:", totalSales);
        document.querySelector(".total-sales").innerText = "Rs. " + totalSales;
        // You can now use the totalSales variable as needed
    } catch (error) {
        console.error("Error calculating total sales:", error);
    }
}

// Call the function to calculate total sales
calculateTotalSales();


// Function to fetch outlet data and find the one with the lowest stock
async function fetchLowStockOutlet() {
    try {
      const stockRef = collection(db, "stock");
      const querySnapshot = await getDocs(stockRef);
  
      let lowStockOutletId = null;
      let lowestStock = Infinity; // Start with an infinitely high number
  
      querySnapshot.forEach(doc => {
        const outletData = doc.data();
        const quantity = outletData.quantity; // Use quantity instead of stock
  
        if (quantity < lowestStock) {
          lowestStock = quantity;
          lowStockOutletId = outletData.outletId; // Store the outletId
        }
      });
  
      // Update the dashboard with the outlet ID and stock
      const lowStockElement = document.querySelector("#low-stock-outlet");
      if (lowStockOutletId) {
        lowStockElement.innerHTML = `${lowStockOutletId} : ${lowestStock} cylinders`;
      } else {
        lowStockElement.innerHTML = "No outlets found!";
      }
    } catch (error) {
      console.error("Error fetching low stock outlet:", error);
    }
  }
  

  async function loadChartData() {
    try {
      const outletsRef = collection(db, "outlets");
      const outletsSnapshot = await getDocs(outletsRef);
  
      const labels = []; // To store "name" field values
      const data = [];   // To store stock values
  
      // Iterate through outlets and fetch stock based on outletId
      for (const outletDoc of outletsSnapshot.docs) {
        const outlet = outletDoc.data();
        const outletId = outlet.name;
  
        // Fetch stock data from 'stock' collection where outletId matches
        const stockQuery = query(collection(db, "stock"), where("outletId", "==", outletId));
        const stockSnapshot = await getDocs(stockQuery);
  
        let stockAmount = 0; // Default stock value
        if (!stockSnapshot.empty) {
          stockAmount = stockSnapshot.docs[0].data().quantity; // Assuming stock has a 'quantity' field
        }
  
        labels.push(outlet.name); // Use the "name" field as a label
        data.push(stockAmount); // Use the fetched stock quantity
      }
  
      // Call the function to render the chart
      renderBarChart(labels, data);
  
    } catch (error) {
      console.error("Error fetching outlets and stock data:", error);
    }
  }
  

function renderBarChart(labels, data) {
  const ctx = document.getElementById("bar-chart").getContext("2d");

  // Predefined colors for bars
  const predefinedColors = [
      "#3e95cd", "#8e5ea2", "#3cba9f", "#e8c3b9", "#c45850", 
      "#ffa726", "#66bb6a", "#42a5f5", "#ab47bc", "#ef5350"
  ];

  // Cycle through the predefined colors for each bar
  const backgroundColors = labels.map((_, index) => 
      predefinedColors[index % predefinedColors.length]
  );

  new Chart(ctx, {
      type: 'bar',
      data: {
          labels: labels, // Dynamic labels from Firestore
          datasets: [
              {
                  label: "Stock",
                  backgroundColor: backgroundColors, // Dynamic colors
                  borderColor: "#fff",
                  borderWidth: 1,
                  data: data, // Dynamic data from Firestore
              },
          ],
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
              legend: {
                  display: true,
                  position: "top",
              },
              title: {
                  display: true,
              },
          },
          scales: {
              x: {
                  title: {
                      display: true,
                      text: "Outlet Names",
                      font: {
                          weight: 'bold', // This makes the text bold
                      },
                  },
              },
              y: {
                  title: {
                      display: true,
                      text: "Stock Quantity",
                      font: {
                          weight: 'bold', // This makes the text bold
                      },
                  },
                  beginAtZero: true,
              },
          },
      },
  });
}

// Load the chart data on page load
loadChartData();
// Call the function when the dashboard is loaded
fetchLowStockOutlet();

fetchDashboardData();