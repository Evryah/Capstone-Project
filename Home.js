

// Toggle Menu for Mobile View
function toggleMenu() {
    const navLinks = document.getElementById('nav-links'); // Select the nav-links container
    navLinks.classList.toggle('active'); // Toggle the 'active' class
}

// Attach event listener to the hamburger menu icon
document.addEventListener('DOMContentLoaded', function () {
    const menuIcon = document.querySelector('.menu-icon'); // Hamburger menu icon
    if (menuIcon) {
        menuIcon.addEventListener('click', toggleMenu); // Attach click event
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token'); // Retrieve token from localStorage
    const firstName = localStorage.getItem('firstName'); // Retrieve user's first name from localStorage
    const usertype = localStorage.getItem('userType'); // Correct the key to match "userType" in localStorage
    const userInfo = document.getElementById('user-info'); // User info container
    const userName = document.getElementById('user-name'); // Placeholder for user's name
    const loginLink = document.getElementById('login'); // Login link
    const registerLink = document.getElementById('register'); // Register link
    const logoutButton = document.getElementById('logout'); // Logout button

    // Helper function to create and append the floating button
    function createFloatingButton(buttonText, redirectURL) {
        const floatingButton = document.createElement('button');
        floatingButton.className = 'floating-button';
        floatingButton.textContent = buttonText;
        floatingButton.addEventListener('click', () => {
            window.location.href = redirectURL; // Redirect to specified page
        });
        document.body.appendChild(floatingButton); // Append the button to the body
        console.log(`Floating button added: ${buttonText}`);
    }

    // User is logged in
    if (token && firstName) {
        console.log('User is logged in.');
        if (userInfo) {
            userInfo.style.display = 'flex'; // Show user info section
            userName.textContent = `Welcome, ${firstName}`; // Display user's first name
        }
        if (loginLink) loginLink.style.display = 'none'; // Hide login link
        if (registerLink) registerLink.style.display = 'none'; // Hide register link

        // Add a floating button based on usertype
        if (usertype) {
            console.log(`Usertype detected: ${usertype}`);
            if (usertype === 'Renter') {
                createFloatingButton('Reserve Now!', '/Renter/Machine_list.html');
            } else if (usertype === 'Owner' , 'Admin') {
                createFloatingButton('Manage Machines', '/Owner/My_machine.html');
            } else {
                console.warn('Unknown usertype detected:', usertype);
            }
        } else {
            console.warn('Usertype is not defined in localStorage.');
        }
    } else {
        // User is not logged in
        console.log('User is not logged in.');
        if (userInfo) userInfo.style.display = 'none'; // Hide user info section
        if (loginLink) loginLink.style.display = 'inline-block'; // Show login link
        if (registerLink) registerLink.style.display = 'inline-block'; // Show register link
    }

    // Handle logout functionality
    if (logoutButton) {
        logoutButton.addEventListener('click', function () {
            console.log('Logging out user.');
            localStorage.removeItem('token'); // Remove token from localStorage
            localStorage.removeItem('firstName'); // Remove user's first name
            localStorage.removeItem('userType'); // Remove usertype
            alert('You have been logged out.');
            window.location.href = 'Home.html'; // Redirect to login page
        });
    }
});


// Initialize Lottie Animations
document.addEventListener('DOMContentLoaded', function () {
    lottie.loadAnimation({
        container: document.getElementById('register-animation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/Assets/HIW/Desc1.json'
    });

    lottie.loadAnimation({
        container: document.getElementById('browse-animation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/Assets/HIW/Desc2.json'
    });

    lottie.loadAnimation({
        container: document.getElementById('confirmation-animation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/Assets/HIW/Desc3.json'
    });

    lottie.loadAnimation({
        container: document.getElementById('review-animation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/Assets/HIW/Desc4.json'
    });
});

let currentPage = 1;
const itemsPerPage = 8; // Number of machines to display per page
let machines = []; // Store fetched machines globally

async function fetchAvailableMachines() {
    try {
        // Determine API base URL dynamically
        const API_BASE_URL = window.location.origin.includes("ngrok")
            ? window.location.origin // Use Ngrok public URL
            : "http://localhost:3000"; // Fallback to localhost

        const response = await fetch(`${API_BASE_URL}/machines`); // Use dynamic base URL

        if (!response.ok) {
            throw new Error(`Failed to fetch available machinery: ${response.statusText} (HTTP ${response.status})`);
        }

        const data = await response.json();

        // Validate the response structure
        if (!Array.isArray(data.machines || data)) {
            console.error('Unexpected response format:', data);
            throw new Error('Invalid response format: Expected an array of machines.');
        }

        machines = Array.isArray(data) ? data : data.machines;

        console.log('Fetched machines:', machines); // Debugging log

        renderPage(currentPage); // Render the first page
        setupPagination(); // Initialize pagination controls
    } catch (error) {
        console.error('Error fetching machinery:', error);

        const container = document.getElementById('machine-card-container');
        container.innerHTML = `
            <p class="error-message">
                Failed to load machinery. Please try again later.
                <br>Error: ${error.message}
            </p>
        `;
    }
}


function formatPrice(price) {
    return `₱${parseFloat(price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

// Render the current page
function renderPage(page) {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = page * itemsPerPage;
    const paginatedMachines = machines.slice(startIndex, endIndex);

    const container = document.getElementById('machine-card-container');
    container.innerHTML = ''; // Clear existing content

    // Handle no machines available
    if (paginatedMachines.length === 0) {
        container.innerHTML = '<p class="no-machines">No machinery available at the moment.</p>';
        return;
    }

    // Generate cards for the current page
    paginatedMachines.forEach(machine => {
        const card = document.createElement('div');
        card.className = 'machine-card';

        const sanitizedImage = machine.image1
            ? `/uploads/machine_images/${machine.image1.replace(/^\/?uploads\/machine_images\//, '')}`
            : '/assets/default-machine.png'; // Default image fallback

        const rating = machine.averageRating || 0; // Fallback for missing rating
        const starsHTML = generateRatingStars(rating);

        const formattedPrice = machine.price_per_hectare
            ? formatPrice(machine.price_per_hectare)
            : 'N/A';

        card.innerHTML = `
            <div class="card-image">
                <img src="${sanitizedImage}" alt="${machine.title || 'Machine'}">
            </div>
            <div class="card-details">
                <div class="machine-title">${machine.title || 'Unnamed Machine'}</div>
                <div class="rating">${starsHTML}</div>
                <div class="machine-price">${formattedPrice}</div>
            </div>
        `;
        card.addEventListener('click', () => {
            if (machine.id) {
                window.location.href = `PreviewMachine.html?machineId=${machine.id}`;
            } else {
                console.error('Machine ID is missing.');
            }
        });

        container.appendChild(card);
    });

    updatePaginationControls(); // Update the state of pagination controls
}


// Generate rating stars as HTML (no half-stars)
function generateRatingStars(rating) {
    const fullStar = '<i class="fa fa-star"></i>';
    const emptyStar = '<i class="fa fa-star-o"></i>';

    let starsHTML = '';
    const roundedRating = Math.round(rating); // Round rating to the nearest integer

    for (let i = 1; i <= 5; i++) {
        starsHTML += i <= roundedRating ? fullStar : emptyStar;
    }
    return starsHTML;
}

// Setup pagination controls
function setupPagination() {
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');

    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage(currentPage);
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentPage < Math.ceil(machines.length / itemsPerPage)) {
            currentPage++;
            renderPage(currentPage);
        }
    });
}

// Update the state of pagination controls
function updatePaginationControls() {
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === Math.ceil(machines.length / itemsPerPage);
    pageInfo.innerText = `Page ${currentPage} of ${Math.ceil(machines.length / itemsPerPage)}`;
}

// Fetch machines when the page loads
document.addEventListener('DOMContentLoaded', fetchAvailableMachines);
