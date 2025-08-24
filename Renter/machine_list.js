// Determine API base URL dynamically
const API_BASE_URL = window.location.origin.includes("ngrok")
    ? window.location.origin // Use Ngrok public URL
    : "http://localhost:3000"; // Fallback to localhost

document.addEventListener('DOMContentLoaded', function() {
    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
    
        // Hide the toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    let machinesData = [];
    let currentPage = 1;
    const itemsPerPage = 24;
    let totalPages = 1;

    const machineCardContainer = document.getElementById('machine-card-container');
    const noResultsMessage = document.getElementById('no-results');

    // Pagination controls
    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination-controls';
    machineCardContainer.parentNode.insertBefore(paginationContainer, machineCardContainer.nextSibling);

    // Check user login status and fetch machines data
    checkLoginStatus();
    fetchMachines();

    // Search bar elements  
    const searchBtn = document.getElementById('searchBtn');
    const categorySelect = document.getElementById('categorySelect');
    const keywordInput = document.getElementById('keywordInput');
    const barangayDropdown = document.getElementById('barangayDropdown');
    const noUsersMessage = document.getElementById('no-users'); // "No matching users found"
   

    // Rating filter elements
    const ratingRadios = document.getElementsByName('rating');

    // Clear and Apply Button elements
    const clearBtn = document.getElementById('clearBtn');
    const applyBtn = document.getElementById('applyBtn');

    // Event listener for the "Clear" button
    clearBtn.addEventListener('click', function () {
        // Clear category selection
        selectedCategory = '';
        categoryElements.forEach(cat => cat.classList.remove('selected'));

        // Reset star rating selection to 'All Ratings'
        document.getElementById('ratingAll').checked = true;
        selectedRating = 'all';

        // Reset any keyword input or dropdowns if needed
        document.getElementById('keywordInput').value = '';
        document.getElementById('barangayDropdown').value = '';

        // Display all machines (clear filters)
        displayFilteredMachines(machinesData);
    });


    // Initialize flatpickr instance
    let datePicker = null;

    categorySelect.addEventListener('change', function () {
        const selectedCategory = categorySelect.value.toLowerCase();
    
        if (selectedCategory === "availability") {
            // Initialize flatpickr only once
            if (!datePicker) {
                datePicker = flatpickr(keywordInput, {
                    dateFormat: "m/d/Y",  // Updated format to MM/DD/YYYY
                    mode: "range", // Date range selection
                    onChange: function (selectedDates) {
                        if (selectedDates.length === 2) {
                            console.log(`Selected dates: ${selectedDates[0].toLocaleDateString()} to ${selectedDates[1].toLocaleDateString()}`);
                            filterMachinesByDateRange(selectedDates);
                        } else if (selectedDates.length === 1) {
                            console.log(`Single selected date: ${selectedDates[0].toLocaleDateString()}`);
                        } else {
                            console.log('No valid date selected.');
                        }
                    }
                });
            }
            keywordInput.placeholder = "Select Date Range";
            keywordInput.style.display = 'block'; // Ensure input is visible
            barangayDropdown.style.display = 'none'; // Hide dropdown
        } else if (selectedCategory === "location") {
            // Handle location-specific logic
            if (datePicker) {
                datePicker.destroy();
                datePicker = null;
            }
            keywordInput.style.display = 'none'; // Hide input field
            barangayDropdown.style.display = 'block'; // Show dropdown
            keywordInput.value = ''; // Clear input value
        } else {
            // Handle other categories
            if (datePicker) {
                datePicker.destroy();
                datePicker = null;
            }
            keywordInput.style.display = 'block'; // Show input field
            barangayDropdown.style.display = 'none'; // Hide dropdown
            keywordInput.type = 'text'; // Reset to normal text input
            keywordInput.placeholder = "Enter Keywords?";
            keywordInput.value = ''; // Clear input value
        }
    });
    

    // Sync the dropdown selection to the input for search processing
    barangayDropdown.addEventListener('change', function () {
        keywordInput.value = barangayDropdown.value; // Copy selected barangay to input
    });

    function filterMachinesByDateRange(dateRange) {
        const startDate = new Date(dateRange[0]);
        const endDate = new Date(dateRange[1]);
    
        console.log(`Start Date (formatted string): ${startDate.toLocaleDateString('en-US')}`);
        console.log(`End Date (formatted string): ${endDate.toLocaleDateString('en-US')}`);
    
        const filteredMachines = machinesData.filter(machine => {
            if ((machine.blockedDates || machine.bookedDates) && Array.isArray(machine.blockedDates)) {
                console.log(`Checking machine: ${machine.title}`);
    
                // Combine blocked and booked dates for filtering
                const unavailableDates = machine.blockedDates.concat(
                    machine.bookedDates ? machine.bookedDates.flatMap(({ startDate, endDate }) => {
                        const range = [];
                        let currentDate = new Date(startDate);
                        while (currentDate <= new Date(endDate)) {
                            range.push(currentDate.toISOString().split('T')[0]);
                            currentDate.setDate(currentDate.getDate() + 1);
                        }
                        return range;
                    }) : []
                );
    
                return !unavailableDates.some(dateStr => {
                    const unavailableDate = new Date(dateStr);
                    console.log(`Unavailable date (parsed): ${unavailableDate}`);
                    const isUnavailable = (unavailableDate >= startDate && unavailableDate <= endDate);
                    console.log(`Is unavailable in range: ${isUnavailable}`);
                    return isUnavailable;
                });
            }
            return true; // Include machines without blocked dates
        });
    
        console.log(`Filtered machines for date range ${startDate.toLocaleDateString('en-US')} to ${endDate.toLocaleDateString('en-US')}:`, filteredMachines);
        displayFilteredMachines(filteredMachines);
    }
    

    // Sidebar and filter button elements
    const sidebar = document.querySelector('.sidebar');
    const filterBtn = document.getElementById('filter-btn');
    const closeSidebarBtn = document.querySelector('.close-sidebar');
    
    function displayFilteredMachines(filteredMachines) {
        const machineCardContainer = document.getElementById('machine-card-container');
        machineCardContainer.innerHTML = ''; // Clear existing machine cards
    
        if (filteredMachines.length === 0) {
            noResultsMessage.style.display = 'block';
        } else {
            noResultsMessage.style.display = 'none';
            filteredMachines.forEach(machine => {
                const machineCard = document.createElement('div');
                machineCard.classList.add('machine-card');
    
                const cardLink = document.createElement('a');
                cardLink.href = `machine_detail.html?id=${machine.id}`; // Add a leading slash
                cardLink.classList.add('card-link');
    
                const pricePerHectare = machine.price_per_hectare !== undefined && machine.price_per_hectare !== null
                    ? `₱${machine.price_per_hectare}`
                    : 'N/A';
    
                // Generate the star rating HTML
                const ratingHTML = generateRatingStars(machine.averageRating || 0); // Ensure rating has a default value
    
                // Ensure the image path is sanitized and constructed correctly
                const sanitizedImage = machine.image1
                    .replace(/^\/?uploads\/machine_images\//, '') // Remove 'uploads/machine_images/' prefix if present
                    .replace(/^\/?uploads\//, '');                // Remove 'uploads/' prefix if present
    
                // Construct the final image path pointing directly to '/uploads/machine_images/'
                const imagePath = `${API_BASE_URL}/uploads/machine_images/${sanitizedImage}`;

    
                cardLink.innerHTML = `
                    <img src="${imagePath}" alt="${machine.title}">
                    <div class="rating">${ratingHTML}</div> 
                    <div class="price">${pricePerHectare}</div>
                    <div class="name">${machine.title}</div>
                `;
    
                machineCard.appendChild(cardLink);
                machineCardContainer.appendChild(machineCard);
            });
        }
    }
    

    barangayDropdown.addEventListener('change', function () {
        const selectedBarangay = barangayDropdown.value;
    
        if (selectedBarangay) {
            fetch(`${API_BASE_URL}/machines/barangay/${encodeURIComponent(selectedBarangay)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    displayFilteredMachines(data); // Reuse the existing function to display machines
                })
                .catch(error => console.error('Error fetching machines for selected barangay:', error));
        } else {
            // Display all machines if no barangay is selected
            fetchMachines();
        }
    });
    

    function generateRatingStars(rating) {
        const fullStar = '<i class="fas fa-star"></i>';  // Full star
        const emptyStar = '<i class="far fa-star"></i>'; // Empty star
    
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            starsHTML += i <= Math.round(rating) ? fullStar : emptyStar;
        }
        return starsHTML;
    }


    // Add basic CSS for category selection highlight
    const style = document.createElement('style');
    style.innerHTML = `
        .category.selected {
            background-color: #036e3a;
            color: white;
        }
    `;
    document.head.appendChild(style);


    function fetchMachines(page = 1, limit = itemsPerPage) {
         fetch(`${API_BASE_URL}/machines?page=${page}&limit=${limit}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                machinesData = data.machines;
                totalPages = data.totalPages;
                currentPage = data.currentPage;
                displayMachines(); // Display the machines
                updatePaginationControls();
            })
            .catch(error => console.error('Error fetching machines:', error));
    }
    // No Decimal return `₱${Math.round(price).toLocaleString('en-US')}`;
    // Decimal
    function formatPrice(price) {
        return `₱${parseFloat(price).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
    

    function displayMachines() {
        machineCardContainer.innerHTML = ''; // Clear existing machine cards
    
        if (machinesData.length === 0) {
            noResultsMessage.style.display = 'block';
        } else {
            noResultsMessage.style.display = 'none';
            machinesData.forEach(machine => {
                const machineCard = document.createElement('div');
                machineCard.classList.add('machine-card');
    
                const cardLink = document.createElement('a');
                cardLink.href = `machine_detail.html?id=${machine.id}`; // Add a leading slash
                cardLink.classList.add('card-link');
    
                const price_per_hectare = machine.price_per_hectare !== undefined && machine.price_per_hectare !== null 
                    ? formatPrice(machine.price_per_hectare)
                    : 'N/A';
    
                // Convert the rating to stars (assuming `machine.averageRating` contains the rating)
                const ratingHTML = generateRatingStars(machine.averageRating || 0);
    
                // Ensure the image path is sanitized and constructed correctly
                const sanitizedImage = machine.image1
                    .replace(/^\/?uploads\/machine_images\//, '') // Remove 'uploads/machine_images/' prefix if present
                    .replace(/^\/?uploads\//, '');                // Remove 'uploads/' prefix if present
    
                // Construct the final image path pointing directly to '/uploads/machine_images/'
                const imagePath = `${API_BASE_URL}/uploads/machine_images/${sanitizedImage}`;

    
                cardLink.innerHTML = `
                <img src="${imagePath}" alt="${machine.title}">
                <div class="rating">${ratingHTML}</div> <!-- Use the generated star rating -->
                <div class="price">${price_per_hectare}</div>
                <div class="name">${machine.title}</div>
                `;
                machineCard.appendChild(cardLink);
                machineCardContainer.appendChild(machineCard);
            });
        }
    }
    

// Helper function to generate star rating HTML based on the rating value
function generateRatingStars(rating) {
    const fullStar = '<i class="fa fa-star"></i>';
    const halfStar = '<i class="fa fa-star-half-o"></i>';
    const emptyStar = '<i class="fa fa-star-o"></i>';
    
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHTML += fullStar;
        } else if (i - rating < 1) {
            starsHTML += halfStar;
        } else {
            starsHTML += emptyStar;
        }
    }
    return starsHTML;
}
    // Function to update the pagination controls
function updatePaginationControls() {
    paginationContainer.innerHTML = ''; // Clear existing pagination controls

    // Create Previous button
    const prevButton = document.createElement('button');
    prevButton.innerText = 'Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            fetchMachines(currentPage - 1);
        }
    });
    paginationContainer.appendChild(prevButton);

    // Create Next button
    const nextButton = document.createElement('button');
    nextButton.innerText = 'Next';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            fetchMachines(currentPage + 1);
        }
    });
    paginationContainer.appendChild(nextButton);

    // Display current page info
    const pageInfo = document.createElement('span');
    pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
    paginationContainer.appendChild(pageInfo);
}


function checkLoginStatus() {
    const firstName = localStorage.getItem('firstName'); // Get user's first name from local storage
    const userId = localStorage.getItem('userId'); // Assuming the user ID is stored in local storage
    const authSection = document.getElementById('auth-section');

    if (firstName && userId) {
        // User is logged in
        authSection.innerHTML = `
            <a href="ViewProfile.html?id=${encodeURIComponent(userId)}" id="user-profile-link">
                <i class="fa fa-user"></i> <span id="user-name">${firstName}</span>
            </a>
            <a href="#" id="logout">
                <i class="fa fa-sign-out"></i> Logout
            </a>
        `;
        addLogoutEvent(); // Attach logout functionality
    } else {
        // User is not logged in
        authSection.innerHTML = `
            <div class="auth-buttons">
                <a href="/login.html" id="login"><i class="fa fa-sign-in-alt"></i> Login</a>
                <a href="/register.html" id="register"><i class="fa fa-user-plus"></i> Register</a>
            </div>
        `;
    }
}

// Function to handle logout logic
function handleLogout() {
    localStorage.clear(); // Clear all user data
    showToast('Goodbye! Come back anytime.'); // Show toast notification
    setTimeout(() => {
        window.location.href = '/login.html'; // Redirect to login page after 3 seconds
    }, 3000);
}

  // Attach logout event to both desktop and mobile buttons
  const desktopLogoutButton = document.getElementById('logout');
  const mobileLogoutButton = document.getElementById('mobile-logout');

  if (desktopLogoutButton) {
    desktopLogoutButton.addEventListener('click', function (event) {
        event.preventDefault();
        handleLogout();
    });
}

if (mobileLogoutButton) {
    mobileLogoutButton.addEventListener('click', function (event) {
        event.preventDefault();
        handleLogout();
    });
}

window.addEventListener('resize', function () {
    const isMobileView = window.innerWidth <= 768;
    if (isMobileView) {
        // Show only mobile logout button
        if (mobileLogoutButton) mobileLogoutButton.style.display = 'block';
        if (desktopLogoutButton) desktopLogoutButton.style.display = 'none';
    } else {
        // Show only desktop logout button
        if (mobileLogoutButton) mobileLogoutButton.style.display = 'none';
        if (desktopLogoutButton) desktopLogoutButton.style.display = 'inline-block';
    }
});

// Trigger the resize event handler on page load
window.dispatchEvent(new Event('resize'));

function addLogoutEvent() {
    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function (event) {
            event.preventDefault();
            localStorage.clear(); // Clear all user data
            showToast('You have been logged out.');
            setTimeout(() => location.reload(), 3000); // Reload after toast disappears
        });
    }
}

  // Toggle sidebar visibility when the "Filter" button is clicked
  filterBtn.addEventListener('click', function () {
    if (window.innerWidth <= 992) {
        sidebar.classList.toggle('visible');
        sidebar.style.transform = sidebar.classList.contains('visible') ? 'translateX(0)' : 'translateX(-100%)';
    } else {
        sidebar.classList.toggle('hidden');  // Toggle hidden class for desktop view
    }
    updateFilterButtonText();
});

    closeSidebarBtn.addEventListener('click', function () {
        if (window.innerWidth <= 992) {
            sidebar.classList.remove('visible');
            sidebar.style.transform = 'translateX(-100%)';
        } else {
            sidebar.classList.add('hidden');
        }
        updateFilterButtonText();  // Reflect in the filter button
    });


    // Function to update the filter button text based on sidebar visibility
    function updateFilterButtonText() {
        if (window.innerWidth <= 992) {
            if (sidebar.classList.contains('visible')) {
                filterBtn.innerHTML = '<i class="fa fa-filter"></i> Hide Filter';
            } else {
                filterBtn.innerHTML = '<i class="fa fa-filter"></i> Show Filter';
            }
        } else {
            if (!sidebar.classList.contains('hidden')) {
                filterBtn.innerHTML = '<i class="fa fa-filter"></i> Hide Filter';
            } else {
                filterBtn.innerHTML = '<i class="fa fa-filter"></i> Show Filter';
            }
        }
    }

    // Handle screen resize events to update logout button visibility
    window.addEventListener('resize', function() {
        const logoutButton = document.getElementById('logout');
        if (logoutButton) {
            if (window.innerWidth > 768) {
                logoutButton.style.display = 'inline-block';
            } else {
                logoutButton.style.display = 'none';
            }
        }

        if (window.innerWidth > 992) {
            // Ensure hidden class is reapplied in desktop mode
            sidebar.classList.remove('visible');
            sidebar.classList.remove('hidden'); // Sidebar should be visible by default in desktop
            sidebar.style.transform = ''; // Reset transform for desktop mode
        } else {
            // Ensure hidden class is removed in mobile mode, sidebar visibility controlled by 'visible' class
            sidebar.classList.remove('hidden');
            sidebar.style.transform = sidebar.classList.contains('visible') ? 'translateX(0)' : 'translateX(-100%)';
        }
        updateFilterButtonText(); // Update the button text accordingly
    });

    // Call the update function on page load to set the correct button text
    updateFilterButtonText();

     // Event listener for the search button
     searchBtn.addEventListener('click', function () {
        const selectedCategory = categorySelect.value.toLowerCase();
        const enteredKeyword = keywordInput.value.toLowerCase();

        // Filter machines based on the selected category and input keyword
        const filteredMachines = machinesData.filter(machine => {
            let matchesCategory = false;

            // Match based on category
            if (selectedCategory === "all") {
                matchesCategory = machine.title.toLowerCase().includes(enteredKeyword) ||
                    (machine.location && machine.location.toLowerCase().includes(enteredKeyword));
            } else if (selectedCategory === "availability") {
                matchesCategory = machine.availability && machine.availability.toLowerCase().includes(enteredKeyword);
            } else if (selectedCategory === "location") {
                matchesCategory = machine.location && machine.location.toLowerCase().includes(enteredKeyword);
            }

            return matchesCategory;
        });

        displayFilteredMachines(filteredMachines);
    });

    const categoryElements = document.querySelectorAll('.category');
    let selectedCategory = '';

    // Event listener for category selection
    categoryElements.forEach(category => {
        category.addEventListener('click', function () {
            selectedCategory = this.getAttribute('data-category');

            // Highlight the selected category (optional UI feedback)
            categoryElements.forEach(cat => cat.classList.remove('selected'));
            this.classList.add('selected');

            filterMachinesByCategory(selectedCategory);
        });
    });

    function filterMachinesByCategory(category) {
        const filteredMachines = machinesData.filter(machine => {
            // Check if the machine's category matches the selected category
            return machine.category && machine.category.toLowerCase() === category.toLowerCase();
        });

        displayFilteredMachines(filteredMachines);
    }


    let selectedRating = 'all'; // Default to 'all' ratings

// Event listener for star rating selection
ratingRadios.forEach(radio => {
    radio.addEventListener('change', function () {
        selectedRating = this.value; // Get the selected rating value
        filterMachines();
    });
});

function filterMachines() {
    const filteredMachines = machinesData.filter(machine => {
        console.log('Machine Data:', machine); // Log the entire machine object to check properties

        let matchesRating = true;

        // Check rating filter with a fallback if `averageRating` is undefined
        const machineRating = machine.averageRating !== undefined ? parseFloat(machine.averageRating) : 0; // Default to 0 if undefined

        // Check rating filter
        if (selectedRating !== 'all') {
            matchesRating = machineRating === parseFloat(selectedRating); // Check for exact match
            // Debug: Log the comparison details
            console.log(`Machine Title: ${machine.title}, Rating: ${machineRating}, Selected Rating: ${selectedRating}, Matches: ${matchesRating}`);
        }

        return matchesRating; // Apply other filter criteria if needed
    });

    // Debug: Log filtered machines
    console.log('Filtered Machines:', filteredMachines);
    displayFilteredMachines(filteredMachines);
}


    // Clear Button - Resets all filters
    clearBtn.addEventListener('click', function() {
        // Clear the rating selection
        document.getElementById('ratingAll').checked = true;

        // Clear category checkboxes
        const categories = document.querySelectorAll('.category input');
        categories.forEach(category => {
            category.checked = false;
        });

        // Clear other filters like date or keywords
        document.getElementById('keywordInput').value = '';
    });


    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            // Trigger the search functionality or filter logic
            searchBtn.click();
        });
    }

   // Event listener for the search button
   searchBtn.addEventListener('click', function () {
    const keyword = keywordInput.value.trim();
    if (keyword) {
        searchUser(keyword);
    } else {
        alert('Please enter a keyword to search');
    }
});

async function searchUser(keyword) {
    try {
        const response = await fetch(`${API_BASE_URL}/searchUser?keyword=${encodeURIComponent(keyword)}`);
        
        // Clear previous messages
        noResultsMessage.style.display = 'none';
        noUsersMessage.style.display = 'none';
        machineCardContainer.innerHTML = ''; // Clear previous results

        if (response.status === 404) {
            // Show "No matching users found" message if no results are found
            noUsersMessage.style.display = 'block';
            return;
        }

        if (!response.ok) {
            throw new Error('Error fetching data');
        }

        const users = await response.json();
        displayUserProfiles(users);
    } catch (error) {
        console.error('Error searching user:', error);
    }
}

function displayUserProfiles(users) {
    const machineCardContainer = document.getElementById('machine-card-container');
    machineCardContainer.innerHTML = ''; // Clear previous results

    users.forEach(user => {
        // Determine which rating to display based on user type
        let ratingValue, formattedRating;
        if (user.userType === 'Owner') {
            ratingValue = user.ownerServiceRating || 0;
            formattedRating = ratingValue ? parseFloat(ratingValue).toFixed(1).replace(/\.0$/, '') : 'N/A';
        } else if (user.userType === 'Renter') {
            ratingValue = user.renterRating || 0;
            formattedRating = ratingValue ? parseFloat(ratingValue).toFixed(1).replace(/\.0$/, '') : 'N/A';
        }

        // Create a profile card and wrap it in a clickable link
        const profileCard = document.createElement('div');
        profileCard.classList.add('owner-card'); // Use the new owner-card styling

        const cardLink = document.createElement('a');
        // Redirect to `RenterViewProfile.html` when the profile is clicked
        if (user.userType === 'Owner') {
            cardLink.href = `ViewProfile.html?id=${encodeURIComponent(user.id)}`;
        } else if (user.userType === 'Renter') {
            // Redirect to the renter profile page
            cardLink.href = `ViewProfile.html?id=${encodeURIComponent(user.id)}`;
        }
        cardLink.style.textDecoration = 'none'; // Remove underline for better UI
        cardLink.style.color = 'inherit'; // Maintain text color

        cardLink.innerHTML = `
            <div class="user-type ${user.userType === 'Renter' ? 'renter' : 'owner'}">
                ${user.userType ? user.userType : 'N/A'}
            </div>
            <div class="name">
                <img src="path-to-default-avatar.jpg" alt="User Avatar"> 
                ${user.firstName || 'First Name'} ${user.lastName || 'Last Name'}
            </div>
            <div class="rating">
                ${renderStars(ratingValue)} ${formattedRating}/5  <!-- Display formatted rating -->
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



  // Selecting the menu icon and navigation links container
const menuIcon = document.querySelector('.menu-icon');
const navLinks = document.querySelector('#nav-links');

// Toggle 'active' class on hamburger menu click to show/hide navigation links
menuIcon.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Close the menu if the user clicks outside the menu icon and nav-links
document.addEventListener('click', function(event) {
    if (!event.target.closest('.menu-icon, #nav-links')) {
        // Check if the menu is active and needs to be closed
        if (navLinks.classList.contains('active')) {
            navLinks.classList.remove('active'); // Close the dropdown
        }
    }
});


    // Example: Set initial notification count to 3
    updateNotificationCount(3);

    function updateNotificationCount(count) {
        const badge = document.querySelector('.notification-icon .badge');
        if (badge) {
            badge.textContent = count;
        }
    }
});
