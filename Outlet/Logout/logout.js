console.log("Logout script loaded");
document.getElementById("logoutButton").addEventListener("click", function () {
    Swal.fire({
        title: 'Confirm Logout',
        text: "You are about to be logged out.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Logout',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {

            // Clear session data
            sessionStorage.removeItem("userSession");
            sessionStorage.removeItem("outletName");
            
            Swal.fire(
                'Logged Out',
                'You have successfully logged out.',
                'success'
            ).then(() => {
                window.location.href = "../../index.html";
            });
        }
    });
});