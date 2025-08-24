const API_BASE_URL = window.location.origin.includes("ngrok")
    ? window.location.origin
    : "http://localhost:3000";

$(document).ready(function() {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    let deleteItemId = null;
    let hasBlockedDates = false;
    let currentPage = 1;
    const itemsPerPage = 21;
    let totalPages = 1;

    let selectedRating = 'all'; // default to all ratings
    let selectedCategory = ''; // default to no category

  // Redirect to login if not logged in
  if (!token) {
    window.location.href = '/login.html';
    return;
}


    // Show/hide Admin navigation link based on userType
    const adminLink = $('#admin-link');
    if (userType === 'Admin') {
        adminLink.show(); // Show the Admin link for Admin users
    } else {
        adminLink.hide(); // Hide the Admin link for all other users
    }

    
// Update user info display
const firstName = localStorage.getItem('firstName');
if (firstName) {
    $('#user-name').text(firstName);
    $('#user-info').show();
    $('#login').hide();

    if ($(window).width() > 768) {
        $('#logout').show();
    }
}

// Logout button functionality with toast notification
$('#logout, #mobile-logout').on('click', function () {
    localStorage.clear(); // Clear all stored data
    showToast('Goodbye! Come back anytime.', 3000); // Display toast notification

    // Redirect to login page after showing toast
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 3000);
});

    $('#deleteModal').hide();
    $('#unmarkBlockedDatesModal').hide();
// Fetch and display machines with pagination, rating, and category filters
function fetchMachines(page = 1, ratingFilter = 'all', categoryFilter = '') {
    $.ajax({
        url: `${API_BASE_URL}/myMachines?page=${page}&limit=${itemsPerPage}`,
        type: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        success: function(response) {
            let machinesData = response.machines;
            currentPage = response.currentPage;

            // Apply the category filter if one is selected
            if (categoryFilter) {
                machinesData = machinesData.filter(machine => machine.category.toLowerCase() === categoryFilter.toLowerCase());
            }

           // Apply the star rating filter if not set to "all"
           if (ratingFilter !== 'all') {
            machinesData = machinesData.filter(machine => Math.floor(machine.averageRating) === parseInt(ratingFilter, 10));
        }
        

            displayMachines(machinesData);
            updatePaginationControls(response.totalPages);

        },
        error: function(xhr, status, error) {
            console.error('Error fetching machines:', xhr.responseText);
            alert("Failed to fetch machines. Please try again.");
        }
    });
}

 // Event listener for the search button
 $('#searchBtn').on('click', function() {
    const enteredKeyword = $('#keywordInput').val().trim().toLowerCase();
    if (enteredKeyword) {
        searchUsers(enteredKeyword);
    } else {
        alert('Please enter a keyword to search');
    }
});

function searchUsers(keyword) {
    $.ajax({
        url: `${API_BASE_URL}/searchUser?keyword=${encodeURIComponent(keyword)}`,
        type: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        success: function(response) {
            if (response && response.length > 0) {
                displayUserProfiles(response); // Correct function call
            } else {
                $('#machine-card-container').html('<p>No users found matching your search criteria.</p>');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error searching users:', xhr.responseText);
            alert("Failed to search users. Please try again.");
        }
    });
}

function displayUserProfiles(users) {
    const machineCardContainer = document.getElementById('machine-card-container');
    machineCardContainer.innerHTML = ''; // Clear previous results

    users.forEach(user => {
        let ratingValue, formattedRating;
        if (user.userType === 'Owner') {
            ratingValue = user.ownerServiceRating || 0;
            formattedRating = ratingValue ? parseFloat(ratingValue).toFixed(1).replace(/\.0$/, '') : 'N/A';
        } else if (user.userType === 'Renter') {
            ratingValue = user.renterRating || 0;
            formattedRating = ratingValue ? parseFloat(ratingValue).toFixed(1).replace(/\.0$/, '') : 'N/A';
        }

        const profileCard = document.createElement('div');
        profileCard.classList.add('owner-card'); 

        const cardLink = document.createElement('a');
        cardLink.href = `OwnerViewProfile.html?id=${encodeURIComponent(user.id)}`;
        cardLink.style.textDecoration = 'none';
        cardLink.style.color = 'inherit';

        cardLink.innerHTML = `
        <div class="user-type ${user.userType === 'Renter' ? 'renter' : 'owner'}">
            ${user.userType ? user.userType : 'N/A'}
        </div>
        <div class="name">
            ${user.firstName || 'First Name'} ${user.lastName || 'Last Name'}
        </div>
        <div class="rating">
            ${renderStars(ratingValue)} ${formattedRating}/5
        </div>
        <div class="location">
            <i class="fa fa-map-marker"></i> ${user.barangay || 'Unknown'}, ${user.address || 'Unknown'}
        </div>
        <div class="phone">
            <i class="fa fa-phone"></i> ${user.phoneNumber || 'Not provided'}
        </div>
    `;
    
    

        profileCard.appendChild(cardLink);
        machineCardContainer.appendChild(profileCard);
    });
}

function renderStars(rating) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        starsHTML += i <= rating ? '<i class="fa fa-star"></i>' : '<i class="fa fa-star-o"></i>';
    }
    return starsHTML;
}


// Event listener for star rating selection
$('input[name="rating"]').on('change', function() {
    selectedRating = $(this).val(); // Get the selected rating value
    fetchMachines(1, selectedRating, selectedCategory); // Fetch machines with updated filters
});

// Event listener for category selection
$('.category').on('click', function() {
    selectedCategory = $(this).text().trim(); // Get the selected category text
    $('.category').removeClass('selected'); // Remove 'selected' class from all categories
    $(this).addClass('selected'); // Add 'selected' class to the clicked category
    fetchMachines(1, selectedRating, selectedCategory); // Fetch machines with updated filters
});

// Function to display filtered machines
function displayMachines(machinesData) {
    const machineCardContainer = $('#machine-card-container');
    machineCardContainer.empty();

    if (machinesData.length === 0) {
        machineCardContainer.append('<p>No machines found for the selected filters.</p>');
        return;
    }
}

   // Event listener for the "Clear" button
   $('#clearBtn').on('click', function() {
    // Reset filters
    selectedRating = 'all';
    selectedCategory = '';

    // Clear UI selections
    $('input[name="rating"]').prop('checked', false); // Uncheck all star ratings
    $('#ratingAll').prop('checked', true); // Set "All Ratings" as checked
    $('.category').removeClass('selected'); // Remove 'selected' class from all categories

    // Fetch all machines without filters
    fetchMachines(1, selectedRating, selectedCategory);
});

// Initial fetch of machines
fetchMachines();

 // No Decimal return `₱${Math.round(price).toLocaleString('en-US')}`;

function formatPrice(price) {
    return `₱${parseFloat(price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

// Function to display all machines
function displayMachines(machinesData) {
    const machineCardContainer = $('#machine-card-container');
    machineCardContainer.empty();

    machinesData.forEach(machine => {
        // Generate star rating based on the averageRating value
        const ratingHTML = generateRatingStars(machine.averageRating || 0); // Ensure a default rating

        // Ensure the image path is constructed correctly
        const sanitizedImage = machine.image1
            .replace(/^\/?uploads\/machine_images\//, '') // Remove 'uploads/machine_images/' prefix if present
            .replace(/^\/?uploads\//, '');                // Remove 'uploads/' prefix if present

        const imagePath = `/uploads/machine_images/${sanitizedImage}`;
        const formattedPrice = machine.price_per_hectare 
            ? formatPrice(machine.price_per_hectare) 
            : 'N/A';

        const machineCard = `
            <div class="machine-card" data-id="${machine.id}">
                <img src="${imagePath}" alt="${machine.title}">
                <div class="rating">${ratingHTML}</div>
                <div class="price">${formattedPrice}</div>
                <div class="name">${machine.title}</div>
                <div class="buttons">
                    <div class="top-buttons">
                        <button class="edit-button">Edit</button>
                        <button class="preview-button">Preview</button>
                    </div>
                    <button class="manage-reservation-button">Manage Reservation</button>
                    <button class="delete-button">Delete</button>
                </div>
            </div>
        `;
        machineCardContainer.append(machineCard);
    });

    handleMachineCardActions();
}


 // Helper function to generate star rating HTML based on the rating value
    function generateRatingStars(rating) {
        const fullStar = '<i class="fa fa-star"></i>';
        const emptyStar = '<i class="fa fa-star-o"></i>';
        
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            starsHTML += i <= rating ? fullStar : emptyStar;
        }
        return starsHTML;
    }

    // Update pagination controls
    function updatePaginationControls() {
        const paginationContainer = $('#pagination-controls');
        paginationContainer.empty();

        // Create Previous button
        const prevButton = $('<button>').text('Previous').prop('disabled', currentPage === 1);
        prevButton.on('click', function() {
            if (currentPage > 1) {
                fetchMachines(currentPage - 1);
            }
        });
        paginationContainer.append(prevButton);

        // Create Next button
        const nextButton = $('<button>').text('Next').prop('disabled', currentPage === totalPages);
        nextButton.on('click', function() {
            if (currentPage < totalPages) {
                fetchMachines(currentPage + 1);
            }
        });
        paginationContainer.append(nextButton);

        // Display current page info
        const pageInfo = $('<span>').text(`Page ${currentPage} of ${totalPages}`);
        paginationContainer.append(pageInfo);
    }

    // Call fetchMachines on page load
    fetchMachines();

   // Handle actions for editing, previewing, deleting, and managing reservations of machines
function handleMachineCardActions() {
    // Edit button action
    $('.edit-button').on('click', function() {
        const machineId = $(this).closest('.machine-card').data('id');
        window.location.href = `Machine_Listing.html?id=${machineId}`;
    });

    // Preview button action
    $('.preview-button').on('click', function() {
        const machineId = $(this).closest('.machine-card').data('id');
        window.location.href = `OMachine_detail.html?id=${machineId}&preview=true`;
    });

    // Delete button action
    $('.delete-button').on('click', function() {
        deleteItemId = $(this).closest('.machine-card').data('id');
        checkBlockedDates(deleteItemId);
    });

    // Confirm delete action
    $('#confirmDelete').on('click', function() {
        if (deleteItemId && !hasBlockedDates) {
            $.ajax({
                url: `${API_BASE_URL}/myMachines/${deleteItemId}`,
                type: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
                success: function(response) {
                    $('#modalText').text("Machine deleted successfully.");
                    $('#modalActions').hide();
                    $('#deleteModal').show();

                    setTimeout(function() {
                        location.reload();
                    }, 2000);
                },
                error: function(xhr, status, error) {
                    console.error('Error deleting machine:', xhr.responseText);
                    alert("Failed to delete machine. Please try again.");
                }
            });
        }
    });

    // Cancel delete action
    $('#cancelDelete').on('click', function() {
        deleteItemId = null;
        $('#deleteModal').hide();
    });

    // Close modal action
    $('.close-button').on('click', function() {
        $('#deleteModal').hide();
        $('#unmarkBlockedDatesModal').hide();
        $('#modalActions').show();
        $('#modalText').text("Are you sure you want to delete this machine?");
    });

    $('.manage-reservation-button').on('click', function () {
        const machineId = $(this).closest('.machine-card').data('id');
        window.location.href = `ManageReservation.html?id=${machineId}`;
    });
    
}


    // Check if the machine has blocked dates
    function checkBlockedDates(machineId) {
        $.ajax({
            url: `${API_BASE_URL}/machines/${machineId}/blockedDates`,
            type: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
            success: function(response) {
                if (response.blockedDates && response.blockedDates.length > 0) {
                    hasBlockedDates = true;
                    $('#unmarkBlockedDatesModal').show();
                } else {
                    hasBlockedDates = false;
                    $('#deleteModal').show();
                }
            },
            error: function(xhr, status, error) {
                console.error('Error checking blocked dates:', xhr.responseText);
                alert("Failed to check blocked dates. Please try again.");
            }
        });
    }  

    // Toggle navigation menu for mobile view
    const menuIcon = document.querySelector('.menu-icon');
    const navLinks = document.querySelector('#nav-links');

    menuIcon.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

  // Function to display toast notifications
function showToast(message, duration = 3000) {
    const toast = document.getElementById("toast");
    if (!toast) {
        console.error("Toast element not found!");
        return;
    }
    toast.textContent = message;
    toast.classList.add("show");

    // Remove the toast after the specified duration
    setTimeout(() => {
        toast.classList.remove("show");
    }, duration);
}

// Logout button functionality with toast notification
$('#logout, #mobile-logout').on('click', function () {
    localStorage.clear(); // Clear all stored data
    showToast('Goodbye! Come back anytime.', 3000); // Display toast notification

    // Redirect to login page after showing toast
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 3000);
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


    // Filter Button and Sidebar Logic
    const filterBtn = document.getElementById('filter-btn');
    const sidebar = document.querySelector('.sidebar');
    const closeSidebar = document.querySelector('.close-sidebar'); // Close "X" button

    // Check if both filter button and sidebar are found in the DOM
    if (filterBtn && sidebar) {
        // Toggle sidebar visibility on filter button click
        filterBtn.addEventListener('click', function () {
            if (window.innerWidth <= 992) {
                sidebar.classList.toggle('visible');
            } else {
                sidebar.classList.toggle('hidden');
            }
            updateFilterButtonText();  // Ensure the button text updates accordingly
        });
    }

    // Close the sidebar when 'X' is clicked
    if (closeSidebar) {
        closeSidebar.addEventListener('click', function () {
            sidebar.classList.remove('visible');  // Close for mobile view
            sidebar.classList.add('hidden');     // Close for desktop view
            updateFilterButtonText();            // Update filter button text
        });
    }

    // Function to update the filter button text based on sidebar visibility
    function updateFilterButtonText() {
        if (window.innerWidth <= 992) {
            sidebar.classList.remove('hidden');
            if (sidebar.classList.contains('visible')) {
                filterBtn.innerHTML = '<i class="fa fa-filter"></i> Hide Filter';
            } else {
                filterBtn.innerHTML = '<i class="fa fa-filter"></i> Show Filter';
            }
        } else {
            sidebar.classList.remove('visible');
            if (!sidebar.classList.contains('hidden')) {
                filterBtn.innerHTML = '<i class="fa fa-filter"></i> Hide Filter';
            } else {
                filterBtn.innerHTML = '<i class="fa fa-filter"></i> Show Filter';
            }
        }
    }

    // Call the update function on page load to set the correct button text
    updateFilterButtonText();

    // Update the filter button text when the window is resized and reset the classes
    window.addEventListener('resize', function () {
        updateFilterButtonText();
    });
});

