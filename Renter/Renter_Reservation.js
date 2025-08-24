// Determine API base URL dynamically
const API_BASE_URL = window.location.origin.includes("ngrok")
    ? window.location.origin
    : "http://localhost:3000";

// Get modal elements
const modal = document.getElementById("cancelModal");
const closeModalBtn = document.getElementById("closeModal");
const confirmCancelBtn = document.getElementById("confirmCancel");
let bookingIdToCancel = null;
let buttonElementToRemove = null;

// Open the modal when the cancel button is clicked
function openCancelModal(bookingId, buttonElement) {
    console.log('Opening modal for booking:', bookingId); // Debugging log
    bookingIdToCancel = bookingId; // Store the booking ID to be canceled
    buttonElementToRemove = buttonElement; // Store the button element for later
    modal.style.display = "block"; // Show the modal
}

// Close the modal when clicking the close button or "No, Keep Booking"
closeModalBtn.onclick = function () {
    modal.style.display = "none"; // Close the modal
    bookingIdToCancel = null; // Reset the stored booking ID
    buttonElementToRemove = null; // Reset the stored button element
};

// Close the modal if clicking outside of the modal content
window.onclick = function (event) {
    if (event.target === modal) {
        modal.style.display = "none";
    }
};

// Confirm cancellation and proceed with the booking cancellation
confirmCancelBtn.onclick = function () {
    if (bookingIdToCancel) {
        handleBookingAction(bookingIdToCancel, 'cancel', buttonElementToRemove); // Call the cancellation logic
    }
    modal.style.display = "none"; // Close the modal after confirming
};

const filterButton = document.querySelector('.filter-button');
const filtersSidebar = document.querySelector('.filters-sidebar');

filterButton.addEventListener('click', () => {
    filtersSidebar.classList.toggle('hidden');
});


function filterBookingsByCategory() {
    const selectedCategories = Array.from(document.querySelectorAll('.equipment-category:checked')).map(checkbox => checkbox.value);
    let filterApplied = false;

    const rows = document.querySelectorAll(".booking-table tbody tr");

    rows.forEach(row => {
        const equipmentCategory = row.querySelector(".equipment-category-data").textContent;

        if (selectedCategories.length === 0 || selectedCategories.includes(equipmentCategory)) {
            row.style.display = "";  // Show matching rows
        } else {
            row.style.display = "none";  // Hide non-matching rows
            filterApplied = true;  // Mark filter as applied
        }
    });

    // Toggle filter-active class based on whether any filters are applied
    toggleFilterActiveState(filterApplied);
}


// Clear filters function
function clearFilters() {
    // Clear all equipment category checkboxes
    document.querySelectorAll('.equipment-category').forEach(checkbox => checkbox.checked = false);

    // Clear the status selection by removing the active class from the status filters
    document.querySelectorAll('.filter-category li').forEach(status => status.classList.remove('active'));

    // Show all booking rows (reset to default view)
    const rows = document.querySelectorAll(".booking-table tbody tr");
    rows.forEach(row => {
        row.style.display = "";  // Show all rows
    });

    // Fetch and display the default list of bookings without any filters
    fetchNewBookings();  // Assuming page=1, limit=10, and no filters applied
}

// Apply filters function (re-apply category and status filters)
function applyFilters() {
    // Apply selected equipment category filters
    filterBookingsByCategory();

    // Apply selected status filters
    filterBookingsByStatus();
}
function toggleFilterActiveState(isActive) {
    const filtersSidebar = document.querySelector('.filters-sidebar');
    if (isActive) {
        filtersSidebar.classList.add('filter-active');
    } else {
        filtersSidebar.classList.remove('filter-active');
    }
}
// Function to filter bookings by selected equipment categories
function filterBookingsByCategory() {
    const selectedCategories = Array.from(document.querySelectorAll('.equipment-category:checked')).map(checkbox => checkbox.value);

    const rows = document.querySelectorAll(".booking-table tbody tr");

    rows.forEach(row => {
        const equipmentCategory = row.querySelector(".equipment-category-data").textContent;

        if (selectedCategories.length === 0 || selectedCategories.includes(equipmentCategory)) {
            row.style.display = "";  // Show matching rows
        } else {
            row.style.display = "none";  // Hide non-matching rows
        }
    });
}

// Function to filter bookings by selected status
function filterBookingsByStatus() {
    const selectedStatus = document.querySelector('.filter-category li.active')?.textContent || '';
    let filterApplied = false;

    const rows = document.querySelectorAll(".booking-table tbody tr");

    rows.forEach(row => {
        const bookingStatus = row.querySelector(".status").textContent;

        if (!selectedStatus || bookingStatus === selectedStatus) {
            row.style.display = "";  // Show matching rows
        } else {
            row.style.display = "none";  // Hide non-matching rows
            filterApplied = true;  // Mark filter as applied
        }
    });

    // Toggle filter-active class based on whether any filters are applied
    toggleFilterActiveState(filterApplied);
}

// Add event listeners to the status filter buttons
document.querySelectorAll('.filter-category li').forEach(item => {
    item.addEventListener('click', (event) => {
        // Remove active class from all statuses
        document.querySelectorAll('.filter-category li').forEach(status => status.classList.remove('active'));
        
        // Add active class to the clicked status
        event.target.classList.add('active');

        // Apply the status filter
        filterBookingsByStatus();
    });
});

// Add event listeners for the buttons
document.getElementById('clear-filters').addEventListener('click', clearFilters);
document.getElementById('apply-filters').addEventListener('click', applyFilters);


document.querySelectorAll('.equipment-category').forEach(checkbox => {
    checkbox.addEventListener('change', filterBookingsByCategory);
});
// Toggle navigation menu for mobile view
const menuIcon = document.querySelector('.menu-icon');
const navLinks = document.querySelector('#nav-links');

menuIcon.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

document.addEventListener('DOMContentLoaded', function () {
    const userProfileLink = document.getElementById('user-profile-link');
    const userId = localStorage.getItem('userId'); // Ensure 'userId' is stored during login

    if (userProfileLink && userId) {
        userProfileLink.href = `ViewProfile.html?id=${encodeURIComponent(userId)}`;
    }
});


// Modify the logout event to include a toast
document.getElementById('logout').addEventListener('click', function (event) {
    event.preventDefault();
    localStorage.clear(); // Clear local storage
    showToast('Goodbye! Come back anytime.'); // Show toast message
    setTimeout(() => {
        window.location.href = '/login.html'; // Redirect after toast disappears
    }, 3000); // Delay redirection to allow toast to show
});

document.getElementById('mobile-logout').addEventListener('click', function (event) {
    event.preventDefault();
    localStorage.clear(); // Clear local storage
    showToast('Goodbye! Come back anytime.'); // Show toast message
    setTimeout(() => {
        window.location.href = '/login.html'; // Redirect after toast disappears
    }, 3000); // Delay redirection to allow toast to show
});

// Display a simple notification count and user name
const userNameElement = document.getElementById('user-name');
const notificationCountElement = document.querySelector('.notification-count');

 // Display the first name of the user
 const firstName = localStorage.getItem('firstName'); 
 if (firstName) {
     $('#user-name').text(firstName);
 } else {
     // If no user is logged in, redirect to the login page
     window.location.href = '/login.html';
 }
    fetchNewBookings(); // Load bookings when page loads

    function fetchNewBookings(page = 1, limit = 10, status = '', createdDate = '') {
        const token = localStorage.getItem('token');
        
        if (!token) {
            alert('Please log in to view your reservations.');
            return;
        }
    
        // Construct the URL with pagination, status, and date filters
        let url = `${API_BASE_URL}/renterBookings?page=${page}&limit=${limit}`;
        if (status) {
            url += `&status=${status}`;
        }
        if (createdDate) {
            url += `&createdDate=${createdDate}`;  // Add date filter
        }
    
        fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Ensure token is valid
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch bookings: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            displayBookings(data.bookings);  // Pass bookings to a separate function to display them
            updatePaginationControls(data.currentPage, data.totalPages, status, createdDate);
        })
        .catch(error => {
            console.error('Error fetching bookings:', error);
            alert('Failed to load bookings. Please try again later.');
        });
    }


    function displayBookings(bookings) {
        const bookingTbody = document.getElementById('booking-tbody');
        bookingTbody.innerHTML = ''; // Clear previous bookings to avoid duplication
    
        bookings.forEach(booking => {
            let actionButtons = '';
    
            // Check the current status and apply actions accordingly
            const currentStatus = booking.status.toLowerCase();
    
            // Show review button for completed bookings
            if (booking.status === 'Completed') {
                const machineName = encodeURIComponent(booking.equipmentName); // Ensure machine name is URL-safe
                if (booking.reviewExists > 0) {
                    actionButtons = `<button class="review" onclick="window.location.href='ReviewPage.html?bookingId=${booking.bookingId}&machineName=${machineName}&view=1'">View Review</button>`;
                } else {
                    actionButtons = `<button class="review" onclick="window.location.href='ReviewPage.html?bookingId=${booking.bookingId}&machineName=${machineName}'">Review</button>`;
                }
            } else if (booking.status === 'Ongoing') {
                actionButtons = `<span class="ongoing-status">Ongoing</span>`;
            } else if (booking.status === 'Pending' || booking.status === 'Accepted') {
                // Show Cancel button for Pending or Accepted bookings
                actionButtons = `<button class="cancel" onclick="openCancelModal(${booking.bookingId}, this)">Cancel</button>`;
            }
    
            const createdDate = new Date(booking.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
    
            const row = `
                <tr id="booking-row-${booking.bookingId}">
                    <td data-label="Date" class="booking-date">${createdDate}</td>
                    <td data-label="Booking ID">#${booking.bookingId}</td>
                    <td data-label="Equipment Name">${booking.equipmentName}</td>
                    <td data-label="Category" class="equipment-category-data">${booking.category}</td>
                    <td data-label="Status"><span class="status ${currentStatus}">${booking.status}</span></td>
                    <td data-label="Details"><a href="RBookingDetails.html?bookingId=${booking.bookingId}">View Details</a></td>
                    <td data-label="Action">${actionButtons}</td>
                </tr>
            `;
            bookingTbody.insertAdjacentHTML('beforeend', row);
        });
    }
    
    console.log("Booking ID for review:", bookingId);
    

function updatePaginationControls(currentPage, totalPages, status = '', createdDate = '') {
    const paginationControls = document.getElementById('pagination-controls');
    paginationControls.innerHTML = ''; // Clear existing pagination controls

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.disabled = i === currentPage;
        button.addEventListener('click', () => fetchNewBookings(i, 10, status, createdDate));
        paginationControls.appendChild(button);
    }
}

// Add event listeners to the status filter buttons
document.querySelectorAll('.filter-category li').forEach(item => {
    item.addEventListener('click', (event) => {
        const status = event.target.textContent;  // Get the text of the clicked item
        fetchNewBookings(1, 10, status);  // Fetch bookings for the selected status
    });
});

// Call fetchNewBookings on page load to fetch the first page of bookings without filters
document.addEventListener('DOMContentLoaded', () => {
    fetchNewBookings(); // Fetch the first page with default limit and no status filter
});




function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast show";
    setTimeout(function () {
        toast.className = toast.className.replace("show", "");
    }, 3000); // Hide after 3 seconds
}

// Modify the cancel button event to show toast and remove row
function handleBookingAction(bookingId, action, buttonElement = null) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to manage reservations.');
        return;
    }

    fetch(`${API_BASE_URL}/bookings/${bookingId}/${action}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to process booking action: ${response.statusText}`);
        }

        // Show the toast notification for successful cancellation
        showToast(`Booking ${action}ed successfully.`);

        // Delay removal of the booking row to allow toast to show
        setTimeout(() => {
            if (action === 'cancel' && buttonElement) {
                const row = buttonElement.closest('tr');
                row.remove(); // Remove the row after successful cancellation
            }
        }, 3000); // Delay the row removal for 3 seconds
    })
    .catch(error => {
        console.error(`Error processing booking ${action}:`, error);
        alert(`Failed to ${action} booking. Please try again.`);
    });
}


// Call fetchNewBookings when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
    fetchNewBookings();
});
