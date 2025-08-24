function showToast(message, duration = 3000, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Set the message
    toastMessage.textContent = message;

    // Apply the appropriate class based on the type
    if (type === 'error') {
        toast.classList.add('error');
    } else {
        toast.classList.remove('error');
    }

    // Show the toast
    toast.classList.add('show');

    // Hide the toast after the specified duration
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

const API_BASE_URL = window.location.origin.includes("ngrok")
    ? window.location.origin
    : "http://localhost:3000";

// Toggle filters sidebar visibility when the filter button is clicked
const filterButton = document.querySelector('.filter-button');
const filtersSidebar = document.querySelector('.filters-sidebar');

filterButton.addEventListener('click', () => {
    filtersSidebar.classList.toggle('hidden');
});

function applyFilters() {
    // Apply selected equipment category filters and status filters together
    const selectedCategories = Array.from(document.querySelectorAll('.equipment-category:checked')).map(checkbox => checkbox.value);
    const selectedStatus = 'Rejected'; // Since we only want to display rejected items
    
    const rows = document.querySelectorAll(".booking-table tbody tr");
    let filterApplied = false; // Track if any filter is applied

    rows.forEach(row => {
        const equipmentCategory = row.querySelector(".equipment-category-data").textContent;
        const bookingStatus = row.querySelector(".status").textContent;

       // Check if the row matches both category and status
       if ((selectedCategories.includes(equipmentCategory) || selectedCategories.length === 0) && (!selectedStatus || bookingStatus === selectedStatus)) {
        row.style.display = "";  // Show matching rows
    } else {
        row.style.display = "none";  // Hide non-matching rows
        filterApplied = true;  // A filter has been applied
    }
});
 // Toggle the filter-active class based on filter status
 const filtersSidebar = document.querySelector('.filters-sidebar');
 if (filterApplied) {
     filtersSidebar.classList.add('filter-active');
 } else {
     filtersSidebar.classList.remove('filter-active');
 }
}

// Event listeners for status and category filters
document.querySelectorAll('.filter-category li').forEach(item => {
 item.addEventListener('click', (event) => {
     document.querySelectorAll('.filter-category li').forEach(status => status.classList.remove('active'));
     event.target.classList.add('active');
     applyFilters();
 });
});

document.querySelectorAll('.equipment-category').forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
});

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
    fetchBookings();  // Assuming page=1, limit=10, and no filters applied
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
    const selectedStatus = document.querySelector('.filter-category li.active')?.textContent || '';  // Get the selected status
    const rows = document.querySelectorAll(".booking-table tbody tr");

    rows.forEach(row => {
        const bookingStatus = row.querySelector(".status").textContent;
        if (!selectedStatus || bookingStatus === selectedStatus) {
            row.style.display = "";  // Show matching rows
        } else {
            row.style.display = "none";  // Hide non-matching rows
        }
    });
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

// Attach event listeners to the equipment category checkboxes
document.querySelectorAll('.equipment-category').forEach(checkbox => {
    checkbox.addEventListener('change', filterBookingsByCategory);
});

// Toggle navigation menu for mobile view
const menuIcon = document.querySelector('.menu-icon');
const navLinks = document.querySelector('#nav-links');

menuIcon.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

function getIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

const userProfileLink = document.getElementById('user-profile-link');
const userId = localStorage.getItem('userId');
if (userProfileLink && userId) {
userProfileLink.href = `OwnerViewProfile.html?id=${encodeURIComponent(userId)}`;
console.log('Profile link updated:', userProfileLink.href);
}

/// Logout button functionality with toast notification
document.querySelectorAll('#logout, #mobile-logout').forEach((button) => {
    button.addEventListener('click', function (event) {
        event.preventDefault();
        localStorage.clear(); // Clear all stored data
        showToast('Goodbye! Come back anytime.', 3000); // Display toast notification

        // Redirect to login page after showing toast
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 3000);
    });
});

// Display the first name of the user from localStorage
const firstName = localStorage.getItem('firstName'); 
if (firstName) {
    document.getElementById('user-name').textContent = firstName;
} else {
    window.location.href = '/login.html';
}

// Extract machine ID from the URL
function getMachineIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Fetch and display reservations for the specific machine
function fetchReservations(machineId) {
    const token = localStorage.getItem('token');

    if (!machineId) {
        const noMachineMessage = `
            <tr>
                <td colspan="7" class="no-reservations-message">
                    Machine ID is missing. Please select a machine to view reservations.
                </td>
            </tr>
        `;
        $('#booking-tbody').html(noMachineMessage);
        return;
    }

    // Make an API request to fetch reservations
    $.ajax({
        url: `${API_BASE_URL}/reservations?machineId=${machineId}`,
        type: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        success: function (reservations) {
            if (reservations && reservations.length > 0) {
                populateReservationsTable(reservations);
            } else {
                // Display "No reservations found for this machine"
                const noReservationsMessage = `
                    <tr>
                        <td colspan="7" class="no-reservations-message">
                            No reservations found for this machine.
                        </td>
                    </tr>
                `;
                $('#booking-tbody').html(noReservationsMessage);
            }
        },
        error: function (xhr, status, error) {
            console.error('Error fetching reservations:', xhr.responseText);
            // Show "No reservations found for this machine" for both API errors and empty data
            const noReservationsMessage = `
                <tr>
                    <td colspan="7" class="no-reservations-message">
                        No reservations found for this machine.
                    </td>
                </tr>
            `;
            $('#booking-tbody').html(noReservationsMessage);
        }
    });
}

function populateReservationsTable(reservations) {
    const tbody = $('#booking-tbody');
    tbody.empty(); // Clear existing rows

    reservations.forEach((reservation) => {
        const date = reservation.date ? new Date(reservation.date).toLocaleDateString() : "N/A";
        const reservationId = reservation.bookingId ? `#${reservation.bookingId}` : "N/A";
        
        // Determine visibility for action buttons
        const isActionable = reservation.status && reservation.status.toLowerCase() === 'pending';
        const canCancel = reservation.status && reservation.status.toLowerCase() === 'accepted';

        const row = `
        <tr data-booking-id="${reservation.bookingId}">
            <td data-label="Date">${date}</td>
            <td data-label="Booking ID">${reservationId}</td>
            <td data-label="Machine Name">${reservation.machineName || "N/A"}</td>
            <td data-label="Category">${reservation.category || "N/A"}</td>
            <td data-label="Status"><span class="status ${reservation.status?.toLowerCase() || "unknown"}">${reservation.status || "Unknown"}</span></td>
            <td data-label="Details">
                <a href="OBookingDetails.html?bookingId=${reservation.bookingId}" class="view-details-link">View Details</a>
            </td>
            <td data-label="Action">
                ${isActionable ? `
                    <button class="reject" onclick="handleBookingAction(${reservation.bookingId}, 'reject')">Reject</button>
                    <button class="accept" onclick="handleBookingAction(${reservation.bookingId}, 'accept')">Accept</button>
                ` : ''}
                ${canCancel ? `
                    <button class="cancel" onclick="handleBookingAction(${reservation.bookingId}, 'cancel')">Cancel</button>
                ` : ''}
            </td>
        </tr>
        `;
        tbody.append(row);
    });
}
// Initialize page
$(document).ready(function () {
    const machineId = getMachineIdFromUrl();
    if (machineId) {
        fetchReservations(machineId);
    } else {
        alert('Machine ID not found. Redirecting...');
        window.location.href = 'My_Machine.html';
    }
});

function handleBookingAction(bookingId, action) {
    if (!bookingId || !action) {
        console.error("Invalid booking ID or action.");
        return;
    }

    // Show appropriate modal based on the action
    let modal, confirmButton, closeButton;
    if (action === 'accept') {
        modal = document.getElementById('acceptModal');
        confirmButton = document.getElementById('confirmAccept');
        closeButton = document.getElementById('closeAcceptBtn');
    } else if (action === 'reject') {
        modal = document.getElementById('rejectModal');
        confirmButton = document.getElementById('confirmReject');
        closeButton = document.getElementById('closeRejectBtn');
    } else if (action === 'cancel') {
        modal = document.getElementById('cancelModal'); // New Cancel Modal
        confirmButton = document.getElementById('confirmCancel');
        closeButton = document.getElementById('closeCancelBtn');
    }

    modal.style.display = 'block';

    const closeModal = () => {
        modal.style.display = 'none';
        confirmButton.removeEventListener('click', confirmAction);
        closeButton.removeEventListener('click', closeModal);
    };

    const confirmAction = () => {
        // Perform API action for Accept, Reject, or Cancel
        const token = localStorage.getItem('token');
        const actionUrl = `${API_BASE_URL}/reservations/${bookingId}/${action}`;

        $.ajax({
            url: actionUrl,
            type: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
            success: function () {
                let message;
                if (action === 'accept') {
                    message = 'Reservation accepted successfully!';
                } else if (action === 'reject') {
                    message = 'Reservation rejected successfully!';
                } else if (action === 'cancel') {
                    message = 'Reservation cancelled successfully!';
                }
                showToast(message, 3000, action === 'cancel' ? 'warning' : action === 'accept' ? 'success' : 'error');

                // Update UI if action is "Cancel"
                if (action === 'cancel') {
                    const row = document.querySelector(`tr[data-booking-id="${bookingId}"]`);
                    if (row) {
                        row.querySelector('.cancel').style.display = 'none'; // Hide Cancel button
                    }
                }

                closeModal();
                fetchReservations(getMachineIdFromUrl());
            },
            error: function () {
                let message;
                if (action === 'accept') {
                    message = 'Failed to accept reservation. Please try again.';
                } else if (action === 'reject') {
                    message = 'Failed to reject reservation. Please try again.';
                } else if (action === 'cancel') {
                    message = 'Failed to cancel reservation. Please try again.';
                }
                showToast(message, 3000, 'error');
            }
        });
    };

    confirmButton.addEventListener('click', confirmAction);
    closeButton.addEventListener('click', closeModal);

    // Add event listener to close the modal when clicking outside it
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
}

// Add event listeners for the Cancel modal close button
document.getElementById('closeCancelModal').addEventListener('click', () => {
    document.getElementById('cancelModal').style.display = 'none';
});
