const API_BASE_URL = window.location.origin.includes("ngrok")
    ? window.location.origin
    : "http://localhost:3000";

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

// Logout functionality
function setupLogoutListeners() {
    const logoutButtons = document.querySelectorAll('#logout, #mobile-logout');
    logoutButtons.forEach((logoutButton) => {
        logoutButton.addEventListener('click', (event) => {
            event.preventDefault();
            // Clear session storage
            localStorage.removeItem('token');
            localStorage.removeItem('firstName');
            localStorage.removeItem('userType');

            // Provide feedback and redirect
            alert('You have been logged out.');
            window.location.href = '/login.html';
        });
    });
}
document.addEventListener('DOMContentLoaded', setupLogoutListeners);

// Display user name and notification count
const userNameElement = document.getElementById('user-name');
const notificationCountElement = document.querySelector('.notification-count');

const firstName = localStorage.getItem('firstName');
if (firstName) {
    userNameElement.textContent = firstName;
} else {
    // If no user is logged in, redirect to the login page
    window.location.href = 'login.html';
}

// Approve user
async function approveUser(userId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/approve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (response.ok) {
            alert('User approved successfully!');
            location.reload();
        } else {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error('Failed to approve user');
        }
    } catch (error) {
        console.error('Error approving user:', error);
    }
}

// Reject user
async function rejectUser(userId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/reject`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (response.ok) {
            alert('User rejected successfully!');
            location.reload();
        } else {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error('Failed to reject user');
        }
    } catch (error) {
        console.error('Error rejecting user:', error);
    }
}

// Delete user
async function deleteUser(userId, role) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (response.ok) {
            alert('User deleted successfully!');
            location.reload();
        } else {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error('Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
    }
}

// Helper function to format the date (month in words)
function formatDate(createdAt) {
    if (!createdAt) return 'N/A';
    try {
        return new Date(createdAt).toLocaleDateString('en-PH', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: 'long', // Month in words (e.g., November)
            day: '2-digit',
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

// Helper function to create status dropdown
function createStatusDropdown(user) {
    const options = user.role === 'Admin' || user.role === 'Owner'
        ? `
            <option value="Pending" ${user.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Active" ${user.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Inactive" ${user.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
            <option value="Rejected" ${user.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          `
        : `
            <option value="Active" ${user.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Inactive" ${user.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
            <option value="Rejected" ${user.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          `;

    return `<select onchange="updateUserStatus(${user.id}, '${user.role}', this.value)">${options}</select>`;
}


// Helper function to create action buttons
function createActionButtons(user) {
    if (user.status === 'Rejected') {
        return `<span class="badge badge-rejected">Rejected</span>`;
    }
    if (user.role === 'Owner' && user.status === 'Pending') {
        return `
            <button class="approve" onclick="approveUser(${user.id})">Approve</button>
            <button class="reject" onclick="rejectUser(${user.id})">Reject</button>`;
    }
    return `<button class="delete" onclick="deleteUser(${user.id}, '${user.role}')">Delete</button>`;
}


// Fetch users by role and status
async function filterUsersByRoleAndStatus() {
    const selectedRole = document.getElementById('roleFilter').value;
    const selectedStatus = document.getElementById('statusFilter').value;
    const userTableBody = document.getElementById('userTableBody');

    try {
        const token = localStorage.getItem('token');
        let query = '';

        if (selectedRole !== 'all') {
            query += `role=${selectedRole}`;
        }

        if (selectedStatus !== 'all') {
            query += query ? `&status=${selectedStatus}` : `status=${selectedStatus}`;
        }

        const response = await fetch(`/api/users?${query}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.statusText}`);
        }

        const { users } = await response.json(); // Assuming API returns an object with a `users` array
        userTableBody.innerHTML = ''; // Clear existing rows

        if (users.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="10">No users found.</td></tr>';
            return;
        }

        function createRoleBadge(role) {
            let badgeClass;
            switch (role) {
                case 'Owner':
                    badgeClass = 'badge-owner';
                    break;
                case 'Renter':
                    badgeClass = 'badge-renter';
                    break;
                case 'Admin':
                    badgeClass = 'badge-admin';
                    break;
                default:
                    badgeClass = 'badge-default'; // Fallback class for unknown roles
                    break;
            }
            return `<span class="badge ${badgeClass}">${role}</span>`;
        }


        users.forEach(user => {
            const formattedDate = formatDate(user.createdAt);
            const statusDropdown = createStatusDropdown(user);
            const actionButtons = createActionButtons(user);
            const roleBadge = createRoleBadge(user.role); // Generate badge dynamically

            const row = `
        <tr>
            <td>${formattedDate}</td>
            <td>${user.id}</td>
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.phoneNumber}</td>
            <td>${user.barangay}, ${user.address}</td>
            <td>${user.referredBy ? user.referredBy : 'N/A'}</td>
            <td>${roleBadge}</td>
            <td>${statusDropdown}</td>
            <td>
                <a href="AViewProfile.html?id=${encodeURIComponent(user.id)}" class="view-profile-link">
                    View Details
                </a>
            </td>
            <td>${actionButtons}</td>
        </tr>`;
    userTableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error fetching users:', error.message);
    }
}

// Fetch all users with default filters on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set default values for the filters
    document.getElementById('roleFilter').value = 'all';
    document.getElementById('statusFilter').value = 'all';

    // Fetch users with default filters
    filterUsersByRoleAndStatus();
});

// Add event listeners for role and status filters
document.getElementById('roleFilter').addEventListener('change', filterUsersByRoleAndStatus);
document.getElementById('statusFilter').addEventListener('change', filterUsersByRoleAndStatus);


// Update user status
async function updateUserStatus(userId, role, newStatus) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role, status: newStatus }),
        });

        if (response.ok) {
            alert('User status updated successfully!');
            location.reload();
        } else {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error('Failed to update user status');
        }
    } catch (error) {
        console.error('Error updating user status:', error);
    }
}
