const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const cors = require('cors');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'agri_machinery'
};

const secretKey = 'your_secret_key'; 

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '/')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Home.html'));
});


// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(uploadDir));


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// User Registration, Login, and Authentication Routes

// Accepted ID Type values
const validIdTypes = ['Government-Issued ID', 'Barangay Residence ID', 'Cruzian ID'];

// Register route
app.post('/register', upload.single('idDocument'), async (req, res) => {
    try {
        const {
            FirstName,
            LastName,
            PhoneNumber,
            Barangay,
            Address,
            registrationType,
            UserName,
            Npassword,
            idType,
            ReferredBy
        } = req.body;

        const idDocumentPath = req.file ? req.file.path : null;

        // Check for required fields and log missing ones
        const missingFields = [];
        if (!FirstName) missingFields.push('FirstName');
        if (!LastName) missingFields.push('LastName');
        if (!PhoneNumber) missingFields.push('PhoneNumber');
        if (!Barangay) missingFields.push('Barangay');
        if (!Address) missingFields.push('Address');
        if (!registrationType) missingFields.push('registrationType');
        if (!UserName) missingFields.push('UserName');
        if (!Npassword) missingFields.push('Npassword');
        if (!idType) missingFields.push('idType');
        if (!idDocumentPath) missingFields.push('idDocument');

        if (missingFields.length > 0) {
            console.error('Missing fields:', missingFields);
            return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
        }

        // Validate idType
        if (!validIdTypes.includes(idType)) {
            console.error('Invalid ID Type:', idType);
            return res.status(400).json({
                message: `Invalid ID Type. Accepted values are: ${validIdTypes.join(', ')}.`
            });
        }

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(Npassword, 10);
        const connection = await mysql.createConnection(dbConfig);

        let redirectPage;

        if (registrationType === 'Owner') {
            const query = `
                INSERT INTO owners (firstName, lastName, phoneNumber, barangay, address, userName, password, idType, idDocument, referredBy) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await connection.execute(query, [
                FirstName,
                LastName,
                PhoneNumber,
                Barangay,
                Address,
                UserName,
                hashedPassword,
                idType,
                idDocumentPath,
                ReferredBy
            ]);
            redirectPage = 'Login.html';
        } else if (registrationType === 'Renter') {
            const query = `
                INSERT INTO renters (firstName, lastName, phoneNumber, barangay, address, userName, password, idType, idDocument) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await connection.execute(query, [
                FirstName,
                LastName,
                PhoneNumber,
                Barangay,
                Address,
                UserName,
                hashedPassword,
                idType,
                idDocumentPath
            ]);
            redirectPage = 'Login.html';
        } else {
            throw new Error('Invalid registration type');
        }

        connection.end();
        res.status(200).json({ message: 'Registration successful', redirectPage });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).send('Registration failed. Please try again.');
    }
});

// Login route
app.post('/login', async (req, res) => {
    try {
        const { UserName, password, registrationType } = req.body; // Include 'registrationType'
        const connection = await mysql.createConnection(dbConfig);

        let query;
        let params;

        // Validate registrationType and determine query
        if (registrationType === 'Owner') {
            query = `
                SELECT id, userName, firstName, password, status, 'Owner' AS userType, role
                FROM owners
                WHERE (userName = ? OR phoneNumber = ?)
            `;
            params = [UserName, UserName];
        } else if (registrationType === 'Renter') {
            query = `
                SELECT id, userName, firstName, password, status, 'Renter' AS userType
                FROM renters
                WHERE (userName = ? OR phoneNumber = ?)
            `;
            params = [UserName, UserName];
        } else {
            return res.status(400).send('Invalid registration type.');
        }

        // Execute query
        const [results] = await connection.execute(query, params);
        connection.end();

        // Check if user exists
        if (results.length === 0) {
            return res.status(401).send('Invalid username/phone number or password.');
        }

        const user = results[0];

        // Validate password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).send('Invalid username/phone number or password.');
        }

        // Validate user status
        if (user.status !== 'Active') {
            return res.status(403).send(`Your account is currently ${user.status}. Please contact support.`);
        }

        // Determine the role for owners and renters
        let userType = user.userType; // Default to userType fetched from query (Owner or Renter)
        if (user.userType === 'Owner' && user.role === 'admin') {
            userType = 'Admin'; // Promote Owner to Admin if applicable
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, UserName: user.userName, userType },
            secretKey,
            { expiresIn: '1h' }
        );

        // Return token and user details
        res.status(200).json({
            token,
            userId: user.id,
            firstName: user.firstName,
            userType // Include the accurate userType in the response
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).send('Login failed. Please try again.');
    }
});



// Helper function to map and validate idType for frontend
function formatAndValidateIdType(idType) {
    const idTypeMap = {
        governmentIssued: "Government-Issued ID",
        barangayResidence: "Barangay Residence ID",
        cruzianID: "Cruzian ID" 
    };

    // Map the idType if possible, otherwise validate directly
    const formattedIdType = idTypeMap[idType] || idType;
    const validIdTypes = ["Government-Issued ID", "Barangay Residence ID", "Cruzian ID"]; // Include Cruzian ID

    if (validIdTypes.includes(formattedIdType)) {
        return formattedIdType;
    }

    console.warn("Invalid ID Type received:", idType);
    return "Unknown"; // Fallback for invalid ID Types
}


// Updated /userDetails route
app.get('/userDetails', async (req, res) => {
    const authHeader = req.headers['authorization'];

    // Validate authorization header
    if (!authHeader) {
        return res.status(403).json({ message: "No token provided" });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).json({ message: "Invalid token format" });
    }

    try {
        // Verify token and extract user details
        const decoded = jwt.verify(token, secretKey);
        const userId = decoded.id;
        const userType = decoded.userType;

        if (!userType) {
            return res.status(400).json({ message: "Invalid user type" });
        }

        const connection = await mysql.createConnection(dbConfig);

        // Define queries for owners and renters
        const queries = {
            Owner: `
                SELECT firstName, lastName, phoneNumber, barangay, address, userName, idType, idDocument 
                FROM owners WHERE id = ?
            `,
            Renter: `
                SELECT firstName, lastName, phoneNumber, barangay, address, userName, idType, idDocument 
                FROM renters WHERE id = ?
            `,
            Admin: `
                SELECT firstName, lastName, phoneNumber, barangay, address, userName, idType, idDocument, role
                FROM owners WHERE id = ? AND role = 'admin'
            `
        };

        const query = queries[userType];
        if (!query) {
            connection.end();
            return res.status(400).json({ message: "Invalid user type" });
        }

        // Execute query to fetch user details
        const [user] = await connection.execute(query, [userId]);
        connection.end();

        // Check if user exists
        if (user.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // Format user details
        const userDetails = {
            ...user[0],
            idType: formatAndValidateIdType(user[0].idType), // Validate and format idType
            idDocument: user[0].idDocument
                ? `${req.protocol}://${req.get('host')}/${user[0].idDocument}`
                : null
        };

        // Add role information for Admin users
        if (userType === 'Admin') {
            userDetails.role = 'Admin';
        }

        res.status(200).json(userDetails);
    } catch (error) {
        console.error("Error fetching user details:", error);
        res.status(500).json({ message: "Failed to fetch user details. Please try again." });
    }
});



app.get('/bookingDetails/:bookingId', async (req, res) => {
    const { bookingId } = req.params;

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Updated query to include barangay for owner and renter
        const [results] = await connection.execute(`
            SELECT 
                b.id AS bookingId,
                b.createdAt,
                b.startDate,
                b.endDate,
                b.category,
                b.status,
                m.title AS equipmentName,
                m.image1, m.image2, m.image3, m.image4, m.image5,
                o.firstName AS ownerFirstName,
                o.lastName AS ownerLastName,
                o.phoneNumber AS ownerPhone,
                CONCAT(o.barangay, ', ', o.address) AS ownerAddress,  -- Include barangay
                r.firstName AS renterFirstName,
                r.lastName AS renterLastName,
                r.phoneNumber AS renterPhone,
                CONCAT(r.barangay, ', ', r.address) AS renterAddress,  -- Include barangay
                (SELECT COUNT(*) FROM reviews WHERE bookingId = b.id) AS reviewExists
            FROM bookings b
            JOIN machines m ON b.machineId = m.id
            JOIN owners o ON m.ownerId = o.id
            JOIN renters r ON b.userId = r.id
            WHERE b.id = ?;
        `, [bookingId]);

        connection.end();

        if (results.length === 0) {
            return res.status(404).send('Booking not found');
        }

        // Prepare the response with review existence and booking details
        const booking = results[0];
        const startDate = new Date(booking.startDate);
        const endDate = new Date(booking.endDate);
        const diffInTime = endDate.getTime() - startDate.getTime();
        booking.numDays = Math.round(diffInTime / (1000 * 3600 * 24)) + 1;

        // Return the first non-null image for the machine
        booking.machineImage = booking.image1 || booking.image2 || booking.image3 || booking.image4 || booking.image5;

        res.status(200).json(booking);
   } catch (error) {
        console.error('Error fetching booking details:', error);
        res.status(500).send('Failed to fetch booking details');
    }
});


 
app.get('/ownerBookings', verifyToken, async (req, res) => {
    try {
        const { id: ownerId } = req.user;

        // Get 'page' and 'limit' from query parameters, or set default values
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 21;
        let offset = (page - 1) * limit;

        const connection = await mysql.createConnection(dbConfig);

        // Count total number of bookings for pagination purposes
        const [totalResults] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM bookings b
            JOIN machines m ON b.machineId = m.id
            WHERE m.ownerId = ?
        `, [ownerId]);
        const totalBookings = totalResults[0].count;
        const totalPages = Math.ceil(totalBookings / limit);

        // Fetch paginated bookings and include review existence check
        const [bookings] = await connection.execute(`
            SELECT 
                b.id AS bookingId, 
                b.startDate, 
                b.endDate, 
                m.title AS machineTitle, 
                b.category, 
                b.status,
                (SELECT COUNT(*) FROM reviews WHERE bookingId = b.id) AS reviewExists
            FROM bookings b
            JOIN machines m ON b.machineId = m.id
            WHERE m.ownerId = ? 
            ORDER BY b.createdAt DESC 
            LIMIT ? OFFSET ?
        `, [ownerId, limit, offset]);

        // Close the database connection
        connection.end();

        // Send paginated results with review existence data
        res.status(200).json({
            bookings,
            currentPage: page,
            totalPages: totalPages,
            totalBookings: totalBookings
        });
    } catch (error) {
        console.error('Error fetching owner bookings:', error);
        res.status(500).json({ message: 'Failed to fetch bookings' });
    }
});

app.post('/bookings/:bookingId/:action', verifyToken, async (req, res) => {
    const { bookingId, action } = req.params;
    const validActions = ['accept', 'reject', 'cancel', 'complete']; // Ensure 'complete' action is included

    if (!validActions.includes(action)) {
        return res.status(400).json({ message: 'Invalid action' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Check if the booking exists and retrieve its details
        const [booking] = await connection.execute('SELECT status, startDate, endDate FROM bookings WHERE id = ?', [bookingId]);

        if (booking.length === 0) {
            connection.end();
            return res.status(404).json({ message: 'Booking not found' });
        }

        let currentStatus = booking[0].status; // Changed to 'let' for reassignment
        const startDate = new Date(booking[0].startDate);
        const endDate = new Date(booking[0].endDate);
        const today = new Date();

        // Automatically update status to 'Ongoing' if within date range
        if (currentStatus === 'Accepted' && today >= startDate && today <= endDate) {
            await connection.execute('UPDATE bookings SET status = ? WHERE id = ?', ['Ongoing', bookingId]);
            console.log(`Booking ${bookingId} status updated to Ongoing.`);
            currentStatus = 'Ongoing'; // Now reassignment is allowed
        }

        // Handle the 'complete' action, allowing only ongoing bookings to be marked as completed
        let newStatus;
        if (action === 'complete') {
            if (currentStatus !== 'Ongoing') {
                connection.end();
                return res.status(400).json({ message: 'Only ongoing bookings can be marked as completed' });
            }
            newStatus = 'Completed';
        } else if (action === 'accept') {
            newStatus = 'Accepted';
        } else if (action === 'reject') {
            newStatus = 'Rejected';
        } else if (action === 'cancel') {
            newStatus = 'Cancelled';
        }

        // Update the booking status in the database
        await connection.execute('UPDATE bookings SET status = ? WHERE id = ?', [newStatus, bookingId]);
        connection.end();

        return res.status(200).json({ message: `Booking ${action}ed successfully` });
    } catch (error) {
        console.error('Error handling booking action:', error);
        return res.status(500).json({ message: `Failed to ${action} booking. Please try again.` });
    }
});

app.post('/updateProfile', async (req, res) => {
    const authHeader = req.headers['authorization'];

    // Validate authorization header
    if (!authHeader) {
        console.error('No token provided');
        return res.status(403).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        console.error('Invalid token format');
        return res.status(403).json({ message: 'Invalid token format' });
    }

    try {
        // Decode the token
        const decoded = jwt.verify(token, secretKey);
        const userId = decoded.id;
        const userType = req.body.userType || decoded.userType;

        // Validate userType and determine table name
        const tableName = userType === 'owner' ? 'owners' : userType === 'renter' ? 'renters' : null;
        if (!tableName) {
            console.error('Invalid user type:', userType);
            return res.status(400).json({ message: 'Invalid user type. Allowed: owner, renter' });
        }

        // Extract and validate request body
        const { phoneNumber, barangay, address, newPassword } = req.body;
        if (!phoneNumber || !barangay || !address) {
            console.error('Missing required fields:', { phoneNumber, barangay, address });
            return res.status(400).json({ message: 'Phone number, barangay, and address are required' });
        }

        const connection = await mysql.createConnection(dbConfig);

        // Fetch user details
        const [user] = await connection.execute(`SELECT password FROM ${tableName} WHERE id = ?`, [userId]);
        if (user.length === 0) {
            console.error(`User not found in table ${tableName} with ID:`, userId);
            connection.end();
            return res.status(404).json({ message: `User not found in table ${tableName} with ID: ${userId}` });
        }

        let hashedPassword = user[0].password;

        // Handle password update if newPassword is provided
        if (newPassword) {
            // Hash the new password
            hashedPassword = await bcrypt.hash(newPassword, 10);
        }

        // Update user profile
        const updateQuery = `
            UPDATE ${tableName}
            SET phoneNumber = ?, barangay = ?, address = ?, password = ?
            WHERE id = ?
        `;
        console.log('Executing SQL:', updateQuery, [phoneNumber, barangay, address, hashedPassword, userId]);

        await connection.execute(updateQuery, [phoneNumber, barangay, address, hashedPassword, userId]);
        connection.end();

        res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Failed to update profile. Please try again.' });
    }
});




// Configure multer storage for machine images
const machineStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/machine_images');  // Set destination to 'machine_images' folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));  // Use a unique timestamp for the filename
    }
});

const machineUpload = multer({ storage: machineStorage });

// Add Machine Listing
app.post('/addMachine', machineUpload.fields([
    { name: 'image1' },
    { name: 'image2' },
    { name: 'image3' },
    { name: 'image4' },
    { name: 'image5' }
]), async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).send('No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).send('Invalid token format');
    }

    let connection;

    try {
        const decoded = jwt.verify(token, secretKey);
        const ownerId = decoded.id;

        const {
            category,
            title,
            description,
            blockedDates,
            price_per_hectare,
            percentage_rice_grains
        } = req.body;
        let { minRentalDays } = req.body;

        // Set default value for minRentalDays if not provided
        minRentalDays = minRentalDays ? parseInt(minRentalDays, 10) : 2;

        // Validate and parse price_per_hectare
        const parsedPricePerHectare = parseFloat(price_per_hectare);
        if (isNaN(parsedPricePerHectare) || parsedPricePerHectare <= 0) {
            return res.status(400).send('Invalid price per hectare. It must be a positive number.');
        }

        // Normalize and store filenames only for images
        const images = [
            req.files['image1'] ? path.basename(req.files['image1'][0].path) : null,
            req.files['image2'] ? path.basename(req.files['image2'][0].path) : null,
            req.files['image3'] ? path.basename(req.files['image3'][0].path) : null,
            req.files['image4'] ? path.basename(req.files['image4'][0].path) : null,
            req.files['image5'] ? path.basename(req.files['image5'][0].path) : null
        ];

        connection = await mysql.createConnection(dbConfig);

        // Start transaction
        await connection.beginTransaction();

        // Insert into machines table including price details
        const insertMachineQuery = `
            INSERT INTO machines (ownerId, category, title, description, min_rental_days,price_per_hectare, percentage_rice_grains, image1, image2, image3, image4, image5)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.execute(insertMachineQuery, [
            ownerId,
            category,
            title,
            description,
            minRentalDays,
            parsedPricePerHectare,
            percentage_rice_grains,
            ...images
        ]);

        const machineId = result.insertId;

        // Insert blocked dates into the blockeddays table
        if (blockedDates) {
            const blockedDatesArray = JSON.parse(blockedDates);
            const insertBlockedDatesQuery = `
                INSERT INTO blockeddays (MachineID, BlockedDate) VALUES (?, ?)
            `;
            for (const date of blockedDatesArray) {
                if (date !== 'Invalid Date' && date.trim() !== '') {
                    await connection.execute(insertBlockedDatesQuery, [machineId, date]);
                }
            }
        }

        // Commit transaction
        await connection.commit();
        connection.end();
        res.status(200).send('Machine listing added successfully');
    } catch (error) {
        console.error('Add machine error:', error);
        // Rollback transaction in case of error
        if (connection) await connection.rollback();
        res.status(500).send(`Failed to add machine: ${error.message}`);
    }
});



// Update Machine Listing
app.put('/updateMachine/:id', machineUpload.fields([
    { name: 'image1' }, 
    { name: 'image2' }, 
    { name: 'image3' }, 
    { name: 'image4' }, 
    { name: 'image5' }
]), async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).send('No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).send('Invalid token format');
    }

    let connection;

    try {
        const decoded = jwt.verify(token, secretKey);
        const ownerId = decoded.id;
        const machineId = req.params.id;

        const { category, title, description,blockedDates, price_per_hectare, percentage_rice_grains } = req.body;
        let { minRentalDays } = req.body;

        // Set default value for minRentalDays if not provided or is null
        minRentalDays = minRentalDays ? parseInt(minRentalDays, 10) : 2;

        // Validate and parse price_per_hectare
        const parsedPricePerHectare = parseFloat(price_per_hectare);
        if (price_per_hectare && (isNaN(parsedPricePerHectare) || parsedPricePerHectare <= 0)) {
            return res.status(400).send('Invalid price per hectare. It must be a positive number.');
        }

        // Normalize and store filenames only for images
        const images = [
            req.files['image1'] ? path.basename(req.files['image1'][0].path) : null,
            req.files['image2'] ? path.basename(req.files['image2'][0].path) : null,
            req.files['image3'] ? path.basename(req.files['image3'][0].path) : null,
            req.files['image4'] ? path.basename(req.files['image4'][0].path) : null,
            req.files['image5'] ? path.basename(req.files['image5'][0].path) : null
        ];

        connection = await mysql.createConnection(dbConfig);

        // Start transaction
        await connection.beginTransaction();

        // Update machine details including price details
        const updateMachineQuery = `
            UPDATE machines
            SET category = ?, title = ?, description = ?, min_rental_days = ?, price_per_hectare = ?, percentage_rice_grains = ?,
                image1 = COALESCE(?, image1), image2 = COALESCE(?, image2), image3 = COALESCE(?, image3),
                image4 = COALESCE(?, image4), image5 = COALESCE(?, image5)
            WHERE id = ? AND ownerId = ?
        `;
        await connection.execute(updateMachineQuery, [
            category || null,
            title || null,
            description || null,
            minRentalDays || 2,
            parsedPricePerHectare || null,
            percentage_rice_grains || null,
            ...images,
            machineId,
            ownerId
        ]);

        // Clear existing blocked dates
        const deleteBlockedDatesQuery = 'DELETE FROM blockeddays WHERE MachineID = ?';
        await connection.execute(deleteBlockedDatesQuery, [machineId]);

        // Insert new blocked dates if provided
        if (blockedDates) {
            const blockedDatesArray = JSON.parse(blockedDates);
            const insertBlockedDatesQuery = 'INSERT INTO blockeddays (MachineID, BlockedDate) VALUES (?, ?)';
            for (const date of blockedDatesArray) {
                if (date !== 'Invalid Date' && date.trim() !== '') {
                    await connection.execute(insertBlockedDatesQuery, [machineId, date]);
                }
            }
        }

        // Commit transaction
        await connection.commit();
        connection.end();
        res.status(200).send('Machine listing updated successfully');
    } catch (error) {
        console.error('Update machine error:', error);
        // Rollback transaction in case of error
        if (connection) await connection.rollback();
        res.status(500).send(`Failed to update machine: ${error.message}`);
    }
});



app.get('/machines', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Get 'page' and 'limit' from query parameters, or set default values
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 21;
        let offset = (page - 1) * limit;

        // Count total number of machines for pagination purposes
        const [totalResults] = await connection.execute('SELECT COUNT(*) as count FROM machines');
        const totalMachines = totalResults[0].count;
        const totalPages = Math.ceil(totalMachines / limit);

        // Fetch paginated results including average rating, blocked dates, and booked dates
        const [machines] = await connection.execute(`
            SELECT 
                m.*, 
                COALESCE(AVG(r.machineOperatorPerformanceRating), 0) AS averageRating,
                GROUP_CONCAT(DISTINCT bd.BlockedDate) AS blockedDates,
                GROUP_CONCAT(
                    DISTINCT CONCAT('{"startDate":"', b.startDate, '","endDate":"', b.endDate, '"}')
                ) AS bookedDates
            FROM machines m
            LEFT JOIN reviews r ON m.id = r.machineId
            LEFT JOIN blockeddays bd ON m.id = bd.MachineID
            LEFT JOIN bookings b ON m.id = b.machineId AND b.status IN ('Accepted', 'Completed')
            GROUP BY m.id
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        connection.end();

        // Format machines data
        const formattedMachines = machines.map(machine => ({
            ...machine,
            price_per_hectare: parseFloat(machine.price_per_hectare).toFixed(2), // Format price as decimal
            blockedDates: machine.blockedDates ? machine.blockedDates.split(',') : [],
            bookedDates: machine.bookedDates ? JSON.parse(`[${machine.bookedDates}]`.replace(/},}/g, '}}')) : [],
            averageRating: parseFloat(machine.averageRating).toFixed(2) // Ensure averageRating is properly formatted
        }));

        // Send the paginated results, current page, and total pages info
        res.status(200).json({
            machines: formattedMachines,
            currentPage: page,
            totalPages: totalPages,
            totalMachines: totalMachines
        });
    } catch (error) {
        console.error('Error fetching machines:', error);
        res.status(500).send('Failed to fetch machines. Please try again.');
    }
});


app.get('/machines/barangay/:barangay', async (req, res) => {
    const barangay = req.params.barangay;

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Query to fetch machines based on the barangay of the owner
        const [machines] = await connection.execute(`
            SELECT 
                m.*, 
                COALESCE(AVG(r.machineOperatorPerformanceRating), 0) AS averageRating,
                o.barangay AS ownerBarangay
            FROM machines m
            JOIN owners o ON m.ownerId = o.id
            LEFT JOIN reviews r ON m.id = r.machineId
            WHERE o.barangay = ?
            GROUP BY m.id
        `, [barangay]);

        connection.end();

        // Return a 200 status with an empty array if no machines are found
        if (machines.length === 0) {
            return res.status(200).json([]); // Respond with an empty array
        }

        res.status(200).json(machines);
    } catch (error) {
        console.error('Error fetching machines by barangay:', error);
        res.status(500).send('Failed to fetch machines by barangay');
    }
});

app.get('/machines/owner/:ownerId/listings', async (req, res) => {
    const ownerId = req.params.ownerId;
    const excludeMachineId = req.query.exclude || -1; // Default to a non-existent ID

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Fetch machines with the updated average rating and images
        const [machines] = await connection.execute(`
            SELECT 
                m.id, 
                m.title, 
                m.price_per_hectare, 
                m.image1 AS image, 
                COALESCE(AVG(r.machineOperatorPerformanceRating), 0) AS averageRating
            FROM machines m
            LEFT JOIN reviews r ON m.id = r.machineId
            WHERE m.ownerId = ? AND m.id != ?
            GROUP BY m.id
        `, [ownerId, excludeMachineId]);

        connection.end();

        if (machines.length === 0) {
            return res.status(200).json([]); // Respond with an empty array if no machines found
        }

        res.status(200).json(machines);
    } catch (error) {
        console.error('Error fetching more listings:', error);
        res.status(500).send('Failed to fetch more listings. Please try again.');
    }
});


app.get('/machines/:id', async (req, res) => {
    const machineId = req.params.id;

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Fetch machine details including `barangay`, `min_rental_days`, owner information, and average owner service rating
        const [machines] = await connection.execute(`
            SELECT 
                m.*, 
                CONCAT(o.firstName, ' ', o.lastName) AS ownerFullName, 
                o.barangay AS ownerBarangay,
                o.address AS ownerAddress, 
                o.phoneNumber AS ownerPhoneNumber,
                COALESCE(AVG(r.ownerServiceRating), 0) AS ownerServiceRating  -- Calculate average owner service rating
            FROM machines m
            JOIN owners o ON m.ownerId = o.id
            LEFT JOIN reviews r ON m.id = r.machineId  -- Join with reviews table to get owner service rating
            WHERE m.id = ?
            GROUP BY m.id
        `, [machineId]);

        if (machines.length === 0) {
            connection.end();
            return res.status(404).send('Machine not found');
        }

        const machine = machines[0];

        // Ensure price_per_hectare is returned as a decimal with 2 places
        machine.price_per_hectare = parseFloat(machine.price_per_hectare).toFixed(2);

        // Ensure owner service rating is returned as a number
        machine.ownerServiceRating = parseFloat(machine.ownerServiceRating);

        // Combine `barangay` with `address` for the full owner address
        machine.ownerFullAddress = `${machine.ownerBarangay ? machine.ownerBarangay + ', ' : ''}${machine.ownerAddress}`;

        // Fetch blocked dates for this machine
        const [blockedDates] = await connection.execute('SELECT BlockedDate FROM blockeddays WHERE MachineID = ?', [machineId]);
        machine.blockedDates = blockedDates.map(row => row.BlockedDate);

        // Fetch 'Accepted' and 'Completed' booked dates for this machine
        const [bookedDates] = await connection.execute(
            'SELECT startDate, endDate FROM bookings WHERE machineId = ? AND status IN (?, ?)',
            [machineId, 'Accepted', 'Completed']
        );
        machine.bookedDates = bookedDates.map(booking => ({
            startDate: booking.startDate,
            endDate: booking.endDate
        }));

        // Combine blocked and booked dates for the frontend calendar
        const combinedBlockedDates = machine.blockedDates.concat(
            machine.bookedDates.flatMap(({ startDate, endDate }) => {
                const range = [];
                let currentDate = new Date(startDate);
                while (currentDate <= new Date(endDate)) {
                    range.push(new Date(currentDate).toISOString().split('T')[0]);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                return range;
            })
        );
        machine.blockedDates = combinedBlockedDates;

        // Combine image fields into an array
        const images = [machine.image1, machine.image2, machine.image3, machine.image4, machine.image5].filter(image => image !== null);
        machine.images = images;

        // Fetch reviews for this machine and join with renters table
        const [reviews] = await connection.execute(`
            SELECT r.*, CONCAT(rt.firstName, ' ', rt.lastName) AS reviewerName
            FROM reviews r
            JOIN renters rt ON r.userId = rt.id
            WHERE r.machineId = ?
        `, [machineId]);

        machine.reviews = reviews.map(review => ({
            user: review.reviewerName,
            machineOperatorPerformanceRating: review.machineOperatorPerformanceRating,
            ownerServiceRating: review.ownerServiceRating,
            comment: review.comment,
            reviewImage1: review.reviewImage1 ? `/uploads/review_images/${review.reviewImage1}` : null,
            reviewImage2: review.reviewImage2 ? `/uploads/review_images/${review.reviewImage2}` : null,
            reviewImage3: review.reviewImage3 ? `/uploads/review_images/${review.reviewImage3}` : null,
            createdAt: review.createdAt
        }));

        connection.end();
        res.status(200).json(machine);
    } catch (error) {
        console.error('Fetch machine error:', error);
        res.status(500).send('Failed to fetch machine. Please try again.');
    }
});



// Middleware for token validation
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).send('No token provided');

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(403).send('Invalid token format');

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) return res.status(401).send('Invalid token');
        req.user = decoded;
        next();
    });
}


app.post('/createBooking', verifyToken, async (req, res) => {
    try {
        const { id: userId } = req.user;
        const { machineId, startDate, endDate, category, status = 'Pending' } = req.body;

        const parsedStartDate = new Date(startDate).toLocaleDateString('en-CA');
        const parsedEndDate = new Date(endDate).toLocaleDateString('en-CA');

        if (!machineId || !parsedStartDate || !parsedEndDate || !category) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const connection = await mysql.createConnection(dbConfig);
        const query = `
            INSERT INTO bookings (userId, machineId, startDate, endDate, category, status, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        await connection.execute(query, [userId, machineId, parsedStartDate, parsedEndDate, category, status]);
        connection.end();

        res.status(201).json({ message: 'Booking created successfully' });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: 'Failed to create booking' });
    }
});


app.get('/renterBookings', verifyToken, async (req, res) => {
    try {
        const { id: userId } = req.user;
        const statusFilter = req.query.status;
        const createdDate = req.query.createdDate;
        
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        let offset = (page - 1) * limit;
        
        const connection = await mysql.createConnection(dbConfig);

        let filters = 'b.userId = ? AND b.status != "Cancelled"';
        let queryParams = [userId];

        if (statusFilter) {
            filters += ' AND b.status = ?';
            queryParams.push(statusFilter);
        }

        if (createdDate) {
            filters += ' AND DATE(b.createdAt) = ?';
            queryParams.push(createdDate);
        }

        const [totalResults] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM bookings b
            WHERE ${filters}
        `, queryParams);
        const totalBookings = totalResults[0].count;
        const totalPages = Math.ceil(totalBookings / limit);

        queryParams.push(limit, offset);

        // Fetch bookings along with the review existence check
        const [bookings] = await connection.execute(`
            SELECT b.id AS bookingId, b.startDate, b.endDate, b.createdAt, m.title AS equipmentName, b.category, b.status, 
                   (SELECT COUNT(*) FROM reviews r WHERE r.bookingId = b.id) AS reviewExists
            FROM bookings b
            JOIN machines m ON b.machineId = m.id
            WHERE ${filters}
            ORDER BY b.createdAt DESC 
            LIMIT ? OFFSET ?
        `, queryParams);

        const today = new Date();
        bookings.forEach(booking => {
            const startDate = new Date(booking.startDate);
            const endDate = new Date(booking.endDate);

            // Only mark the booking as "Ongoing" if it's accepted and falls within the date range
            if (booking.status === "Accepted" && today >= startDate && today <= endDate) {
                booking.status = "Ongoing";
            }

            // Check if the end date has passed
            if (today > endDate) {
                booking.status = "Completed";
                booking.showReviewButton = true;
            } else {
                booking.showReviewButton = false;
            }

            // If reviewExists is greater than 0, indicate that a review exists
            booking.hasReview = booking.reviewExists > 0;
        });

        connection.end();

        // Send the updated bookings with review information
        res.status(200).json({
            bookings,
            currentPage: page,
            totalPages: totalPages,
            totalBookings: totalBookings
        });
    } catch (error) {
        console.error('Error fetching renter bookings:', error);
        res.status(500).json({ message: 'Failed to fetch renter bookings' });
    }
});



app.get('/myMachines', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).send('No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).send('Invalid token format');
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        const ownerId = decoded.id;

        // Get 'page' and 'limit' from query parameters, or set default values
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        let offset = (page - 1) * limit;

        const connection = await mysql.createConnection(dbConfig);

        // Count total machines for the owner
        const [totalResults] = await connection.execute('SELECT COUNT(*) as count FROM machines WHERE ownerId = ?', [ownerId]);
        const totalMachines = totalResults[0].count;
        const totalPages = Math.ceil(totalMachines / limit);

        // Fetch paginated machine results along with average ratings
        const [machines] = await connection.execute(`
            SELECT m.*, 
                   COALESCE(AVG(r.machineOperatorPerformanceRating), 0) AS averageRating
            FROM machines m
            LEFT JOIN reviews r ON r.machineId = m.id
            WHERE m.ownerId = ?
            GROUP BY m.id
            LIMIT ? OFFSET ?
        `, [ownerId, limit, offset]);

        connection.end();

        res.status(200).json({
            machines,
            currentPage: page,
            totalPages: totalPages,
            totalMachines: totalMachines
        });
    } catch (error) {
        console.error('Fetch machines error:', error);
        res.status(500).send('Failed to fetch machines. Please try again.');
    }
});


// Delete Machine Listing
app.delete('/myMachines/:id', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).send('No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).send('Invalid token format');
    }

    let connection;

    try {
        const decoded = jwt.verify(token, secretKey);
        const ownerId = decoded.id;
        const machineId = req.params.id;

        connection = await mysql.createConnection(dbConfig);

        // Start transaction
        await connection.beginTransaction();

        // Check if the machine belongs to the logged-in owner
        const [machine] = await connection.execute('SELECT * FROM machines WHERE id = ? AND ownerId = ?', [machineId, ownerId]);

        if (machine.length === 0) {
            connection.end();
            return res.status(404).send('Machine not found or you are not authorized to delete this listing');
        }

        // Delete the machine from the database
        await connection.execute('DELETE FROM machines WHERE id = ? AND ownerId = ?', [machineId, ownerId]);

        // Delete the blocked dates associated with this machine
        await connection.execute('DELETE FROM blockeddays WHERE MachineID = ?', [machineId]);

        // Commit transaction
        await connection.commit();
        connection.end();
        res.status(200).send('Machine listing deleted successfully');
    } catch (error) {
        console.error('Delete machine error:', error);
        // Rollback transaction in case of error
        if (connection) await connection.rollback();
        res.status(500).send('Failed to delete machine. Please try again.');
    }
});

// Fetch blocked dates for a specific machine
app.get('/machines/:machineId/blockedDates', async (req, res) => {
    const machineId = req.params.machineId;

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Fetch blocked dates for the machine
        const [blockedDates] = await connection.execute('SELECT BlockedDate FROM blockeddays WHERE MachineID = ?', [machineId]);

        connection.end();

        if (blockedDates.length > 0) {
            res.status(200).json({ blockedDates: blockedDates.map(row => row.BlockedDate) });
        } else {
            // Return a 200 status with an empty array if no blocked dates are found
            res.status(200).json({ blockedDates: [] });
        }
    } catch (error) {
        console.error('Error fetching blocked dates:', error);
        res.status(500).send('Failed to fetch blocked dates. Please try again.');
    }
});
const reviewImagesDir = path.join(__dirname, 'uploads/review_images');
if (!fs.existsSync(reviewImagesDir)) {
    fs.mkdirSync(reviewImagesDir, { recursive: true });
}

const reviewStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, reviewImagesDir);  // Store review images in this folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));  // Save with a unique timestamp
    }
});

const reviewUpload = multer({ storage: reviewStorage });

app.post('/submitReview', reviewUpload.fields([
    { name: 'reviewImage1', maxCount: 1 },
    { name: 'reviewImage2', maxCount: 1 },
    { name: 'reviewImage3', maxCount: 1 }
]), async (req, res) => {
    try {
        const { bookingId, machineOperatorPerformanceRating, ownerServiceRating, comment } = req.body;
        const reviewImages = req.files || {};  // Handle the case when no files are uploaded

        const connection = await mysql.createConnection(dbConfig);

        // Check if the booking exists and fetch related userId and machineId
        const [rows] = await connection.execute('SELECT userId, machineId FROM bookings WHERE id = ?', [bookingId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const { userId, machineId } = rows[0];

        // Check if a review already exists for this booking
        const [existingReview] = await connection.execute('SELECT reviewImage1, reviewImage2, reviewImage3 FROM reviews WHERE bookingId = ?', [bookingId]);
        const isUpdatingReview = existingReview.length > 0;

        // Use existing images if no new images are uploaded
        const existingImages = existingReview[0] || {};
        const reviewImage1 = reviewImages.reviewImage1 ? reviewImages.reviewImage1[0].filename : (existingImages.reviewImage1 || null);
        const reviewImage2 = reviewImages.reviewImage2 ? reviewImages.reviewImage2[0].filename : (existingImages.reviewImage2 || null);
        const reviewImage3 = reviewImages.reviewImage3 ? reviewImages.reviewImage3[0].filename : (existingImages.reviewImage3 || null);

        if (isUpdatingReview) {
            // Update the existing review
            await connection.execute(`
                UPDATE reviews
                SET machineOperatorPerformanceRating = ?, ownerServiceRating = ?, comment = ?,
                    reviewImage1 = ?, reviewImage2 = ?, reviewImage3 = ?
                WHERE bookingId = ?
            `, [machineOperatorPerformanceRating, ownerServiceRating, comment, reviewImage1, reviewImage2, reviewImage3, bookingId]);

            res.status(200).json({ message: 'Review updated successfully!' });
        } else {
            // Insert a new review
            await connection.execute(`
                INSERT INTO reviews (bookingId, userId, machineId, machineOperatorPerformanceRating, ownerServiceRating, comment, reviewImage1, reviewImage2, reviewImage3)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [bookingId, userId, machineId, machineOperatorPerformanceRating, ownerServiceRating, comment, reviewImage1, reviewImage2, reviewImage3]);

            res.status(201).json({ message: 'Review submitted successfully!' });
        }

        connection.end();
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ message: 'Failed to submit review', error: error.message });
    }
});


app.get('/reviewDetails/:bookingId', async (req, res) => {
    const { bookingId } = req.params;

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Updated query to handle NULL values in comment and other fields
        const [results] = await connection.execute(`
            SELECT 
                r.machineOperatorPerformanceRating, 
                r.ownerServiceRating, 
                COALESCE(r.comment, '') AS comment,  -- Replace NULL with an empty string
                r.reviewImage1, 
                r.reviewImage2, 
                r.reviewImage3,
                m.title AS equipmentName,
                m.image1 AS machineImage,
                rt.firstName AS renterFirstName,    -- Fetch renter's first name
                rt.lastName AS renterLastName       -- Fetch renter's last name
            FROM reviews r
            JOIN machines m ON r.machineId = m.id
            JOIN renters rt ON r.userId = rt.id    -- Join renters table to get renter's details
            WHERE r.bookingId = ?
        `, [bookingId]);

        connection.end();

        if (results.length === 0) {
            return res.status(404).send('Review not found');
        }

        // Prepare the response with renter's name and handle review images
        const review = results[0];
        review.reviewImages = [];
        if (review.reviewImage1) review.reviewImages.push(`/uploads/review_images/${review.reviewImage1}`);
        if (review.reviewImage2) review.reviewImages.push(`/uploads/review_images/${review.reviewImage2}`);
        if (review.reviewImage3) review.reviewImages.push(`/uploads/review_images/${review.reviewImage3}`);

        res.status(200).json({
            equipmentName: review.equipmentName,
            machineImage: review.machineImage,
            machineOperatorPerformanceRating: review.machineOperatorPerformanceRating,
            ownerServiceRating: review.ownerServiceRating,
            comment: review.comment,  // Safely handles NULL values
            reviewImages: review.reviewImages,
            renterName: `${review.renterFirstName} ${review.renterLastName}`  // Add full name of the renter
        });
    } catch (error) {
        console.error('Error fetching review details:', error);
        res.status(500).send('Failed to fetch review details');
    }
});



app.post('/reviews/renter', verifyToken, async (req, res) => {
    try {
        const { bookingId, rating, comment } = req.body;
        const { id: reviewerId } = req.user; // User who is submitting the review

        // Create a connection to the database
        const connection = await mysql.createConnection(dbConfig);

        // Check if the booking exists and retrieve the userId (representing the renter)
        const [bookingCheck] = await connection.execute(
            'SELECT userId FROM bookings WHERE id = ?',
            [bookingId]
        );

        if (bookingCheck.length === 0) {
            console.warn('Booking not found', { bookingId });
            await connection.end();
            return res.status(404).json({ message: 'Booking not found. Please verify the booking ID.' });
        }

        const userId = bookingCheck[0].userId;

        // Validate that necessary fields are present
        if (!bookingId || !userId || !reviewerId || !rating) {
            console.warn('Validation error: Missing required fields', { bookingId, userId, reviewerId, rating });
            await connection.end();
            return res.status(400).json({ message: 'Booking ID, user ID, reviewer ID, and rating are required' });
        }

        // Validate rating range
        if (rating < 1 || rating > 5) {
            console.warn('Validation error: Rating out of range', { rating });
            await connection.end();
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Replace null or empty comment with an empty string
        const commentToInsert = comment && comment.trim().length > 0 ? comment.trim() : '';

        // Validate comment length if provided
        if (commentToInsert.length > 500) {
            console.warn('Validation error: Comment too long', { commentLength: commentToInsert.length });
            await connection.end();
            return res.status(400).json({ message: 'Comment cannot exceed 500 characters' });
        }

        // Log variables for debugging
        console.log('Review data:', { bookingId, userId, reviewerId, rating, comment: commentToInsert });

        // Check if a review already exists for this booking
        const [existingReview] = await connection.execute(
            'SELECT review_id FROM review_renter WHERE booking_id = ? AND renter_id = ?',
            [bookingId, userId]
        );
        if (existingReview.length > 0) {
            console.warn('Duplicate review detected', { bookingId, userId });
            await connection.end();
            return res.status(400).json({ message: 'A review for this booking and user already exists.' });
        }

        // Insert a new review into the `review_renter` table
        const [result] = await connection.execute(
            `
            INSERT INTO review_renter (booking_id, renter_id, reviewer_id, rating, comment, review_date)
            VALUES (?, ?, ?, ?, ?, NOW())
            `,
            [bookingId, userId, reviewerId, rating, commentToInsert] // Ensure userId matches renter_id
        );

        // Close the connection
        await connection.end();

        // Confirm the insertion was successful
        if (result.affectedRows === 1) {
            console.log('Review added successfully', { bookingId, userId, reviewerId });
            res.status(201).json({ message: 'Review added successfully' });
        } else {
            console.error('Unexpected error: Review not added', { result });
            res.status(500).json({ message: 'Failed to add review. Please try again.' });
        }
    } catch (error) {
        console.error('Error submitting review:', error);

        // Handle specific SQL errors (optional)
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            res.status(400).json({ message: 'Invalid foreign key reference. Ensure related data exists.' });
        } else {
            res.status(500).json({ message: 'Failed to add review', error: error.message });
        }
    }
});

// Get all reviews for a specific renter
app.get('/reviews/renter/:renterId', async (req, res) => {
    const { renterId } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [reviews] = await connection.execute(`
            SELECT r.*, CONCAT(o.firstName, ' ', o.lastName) AS reviewerName
            FROM review_renter r
            JOIN owners o ON r.reviewer_id = o.id
            WHERE r.renter_id = ?
            ORDER BY r.review_date DESC
        `, [renterId]);

        connection.end();
        res.status(200).json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Failed to fetch reviews' });
    }
});

// Get renter review by booking ID
app.get('/reviews/renter/booking/:bookingId', async (req, res) => {
    const { bookingId } = req.params;
    
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Query to fetch renter review for a specific booking
        const [reviews] = await connection.execute(`
            SELECT 
                rr.rating,
                rr.comment,
                CONCAT(o.firstName, ' ', o.lastName) AS reviewerName
            FROM review_renter rr
            JOIN owners o ON rr.reviewer_id = o.id
            WHERE rr.booking_id = ?
        `, [bookingId]);
        
        connection.end();
        
        if (reviews.length === 0) {
            return res.status(404).json({ message: 'Review not found' });
        }

        res.status(200).json(reviews[0]); // Send the first result if multiple exist
    } catch (error) {
        console.error('Error fetching renter review:', error);
        res.status(500).json({ message: 'Failed to fetch renter review', error: error.message });
    }
});

// Search user by a single keyword (username, first name, or last name)
app.get('/searchUser', async (req, res) => {
    const { keyword } = req.query;

    if (!keyword) {
        return res.status(400).json({ message: 'Keyword is required' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const query = `
            SELECT 'Owner' AS userType, o.id, o.userName, o.firstName, o.lastName, o.phoneNumber, o.barangay, o.address,
                   COALESCE(AVG(r.ownerServiceRating), 0) AS ownerServiceRating, NULL AS renterRating  -- Include average owner service rating
            FROM owners o
            LEFT JOIN machines m ON o.id = m.ownerId  -- Link owners to machines
            LEFT JOIN reviews r ON m.id = r.machineId  -- Link machines to reviews
            WHERE o.userName LIKE ? OR o.firstName LIKE ? OR o.lastName LIKE ?
            GROUP BY o.id

            UNION

            SELECT 'Renter' AS userType, ren.id, ren.userName, ren.firstName, ren.lastName, ren.phoneNumber, ren.barangay, ren.address,
                   NULL AS ownerServiceRating, COALESCE(AVG(rr.rating), 0) AS renterRating  -- Include average renter rating
            FROM renters ren
            LEFT JOIN review_renter rr ON ren.id = rr.renter_id  -- Link renters to their reviews
            WHERE ren.userName LIKE ? OR ren.firstName LIKE ? OR ren.lastName LIKE ?
            GROUP BY ren.id
        `;
        
        const [results] = await connection.execute(query, [
            `%${keyword}%`, `%${keyword}%`, `%${keyword}%`,
            `%${keyword}%`, `%${keyword}%`, `%${keyword}%`
        ]);
        
        connection.end();

        if (results.length === 0) {
            return res.status(404).json({ message: 'No matching users found' });
        }

        res.status(200).json(results);
    } catch (error) {
        console.error('Error searching user:', error);
        res.status(500).json({ message: 'Failed to search users' });
    }
});

// Route to fetch owner details by ID
app.get('/owners/:ownerId', async (req, res) => {
    const { ownerId } = req.params;

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [owner] = await connection.execute(`
            SELECT 
                firstName, lastName, phoneNumber, barangay, address, 
                COALESCE(AVG(r.ownerServiceRating), 0) AS ownerServiceRating
            FROM owners o
            LEFT JOIN machines m ON o.id = m.ownerId
            LEFT JOIN reviews r ON m.id = r.machineId
            WHERE o.id = ?
            GROUP BY o.id
        `, [ownerId]);

        connection.end();

        if (owner.length === 0) {
            return res.status(404).json({ message: 'Owner not found' });
        }

        res.status(200).json(owner[0]);
    } catch (error) {
        console.error('Error fetching owner details:', error);
        res.status(500).send('Failed to fetch owner details. Please try again.');
    }
});

// Route to fetch all reviews for a specific owner
app.get('/reviews/owner/:ownerId', async (req, res) => {
    const { ownerId } = req.params;

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const [reviews] = await connection.execute(`
            SELECT 
                r.machineOperatorPerformanceRating, r.ownerServiceRating, r.comment,
                r.reviewImage1, r.reviewImage2, r.reviewImage3,
                CONCAT(rt.firstName, ' ', rt.lastName) AS reviewerName,
                r.createdAt
            FROM reviews r
            JOIN renters rt ON r.userId = rt.id
            JOIN machines m ON r.machineId = m.id
            WHERE m.ownerId = ?
            ORDER BY r.createdAt DESC
        `, [ownerId]);

        connection.end();

        if (reviews.length === 0) {
            return res.status(404).json({ message: 'No reviews found for this owner' });
        }

        // Prepare the review response
        const formattedReviews = reviews.map(review => ({
            reviewerName: review.reviewerName,
            ratings: {
                machineOperatorPerformance: review.machineOperatorPerformanceRating,
                ownerService: review.ownerServiceRating,
            },
            comment: review.comment,
            images: [
                review.reviewImage1 ? `/uploads/review_images/${review.reviewImage1}` : null,
                review.reviewImage2 ? `/uploads/review_images/${review.reviewImage2}` : null,
                review.reviewImage3 ? `/uploads/review_images/${review.reviewImage3}` : null,
            ].filter(img => img !== null),
            createdAt: review.createdAt,
        }));

        res.status(200).json(formattedReviews);
    } catch (error) {
        console.error('Error fetching owner reviews:', error);
        res.status(500).json({ message: 'Failed to fetch owner reviews' });
    }
});

app.get('/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Fetch user details for both owner and renter in parallel
        const [ownerPromise, renterPromise] = await Promise.all([
            connection.execute(`
                SELECT firstName, lastName, phoneNumber, barangay, address, 
                       COALESCE(AVG(r.ownerServiceRating), 0) AS ownerServiceRating
                FROM owners o
                LEFT JOIN machines m ON o.id = m.ownerId
                LEFT JOIN reviews r ON m.id = r.machineId
                WHERE o.id = ?
                GROUP BY o.id
            `, [id]),

            connection.execute(`
                SELECT firstName, lastName, phoneNumber, barangay, address, 
                       COALESCE(AVG(rr.rating), 0) AS renterRating
                FROM renters ren
                LEFT JOIN review_renter rr ON ren.id = rr.renter_id
                WHERE ren.id = ?
                GROUP BY ren.id
            `, [id])
        ]);

        const [owner] = ownerPromise;
        const [renter] = renterPromise;

        // Add logging to debug data retrieval
        console.log(`Owner Query Result for ID ${id}:`, owner);
        console.log(`Renter Query Result for ID ${id}:`, renter);

        connection.end();

        // Return the response based on which type of user was found
        if (owner.length > 0) {
            console.log(`User ID ${id} identified as Owner.`);
            return res.status(200).json({ ...owner[0], userType: 'Owner' });
        } else if (renter.length > 0) {
            console.log(`User ID ${id} identified as Renter.`);
            return res.status(200).json({ ...renter[0], userType: 'Renter' });
        } else {
            console.log(`User ID ${id} not found in the database.`);
            return res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(`Error fetching user data for ID ${id}:`, error);
        res.status(500).send('Failed to fetch user data. Please try again.');
    }
});

// Middleware to verify if the user is an admin
function verifyAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).send('No token provided');

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(403).send('Invalid token format');

    jwt.verify(token, secretKey, async (err, decoded) => {
        if (err) return res.status(401).send('Invalid token');
        req.user = decoded;

        try {
            const connection = await mysql.createConnection(dbConfig);
            const [result] = await connection.execute(
                'SELECT role FROM owners WHERE id = ?',
                [decoded.id]
            );
            connection.end();

            if (result.length > 0 && result[0].role === 'admin') {
                next(); // User is an admin, proceed
            } else {
                res.status(403).send('Access denied: Admins only');
            }
        } catch (error) {
            console.error('Error verifying admin role:', error);
            res.status(500).send('Failed to verify admin role');
        }
    });
}


// Admin //
app.get('/api/users', verifyAdmin, async (req, res) => {
    const { role, status, page = 1, limit = 10 } = req.query;

    try {
        const connection = await mysql.createConnection(dbConfig);

        let query = `
            SELECT 
                id, 
                firstName, 
                lastName, 
                phoneNumber, 
                barangay, 
                address, 
                referredBy, 
                role, 
                status, 
                createdAt 
            FROM (
                SELECT 
                    id, 
                    firstName, 
                    lastName, 
                    phoneNumber, 
                    barangay, 
                    address, 
                    referredBy, 
                    CASE 
                        WHEN role = 'admin' THEN 'Admin'
                        ELSE 'Owner' 
                    END AS role, 
                    status, 
                    createdAt
                FROM owners
                UNION ALL
                SELECT 
                    id, 
                    firstName, 
                    lastName, 
                    phoneNumber, 
                    barangay, 
                    address, 
                    NULL AS referredBy, 
                    'Renter' AS role, 
                    status, 
                    createdAt
                FROM renters
            ) AS users`;

        const params = [];
        const conditions = [];

        // Apply filters based on role and status
        if (role && role !== 'all') {
            conditions.push('role = ?');
            params.push(role);
        }

        if (status && status !== 'all') {
            conditions.push('status = ?');
            params.push(status);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        const offset = (page - 1) * limit;
        query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [results] = await connection.execute(query, params);
        connection.end();

        // Format the `createdAt` field into a readable date string
        const formattedResults = results.map(user => ({
            ...user,
            createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US') : 'N/A',
        }));

        res.status(200).json({ users: formattedResults });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send({ error: 'Failed to fetch users', details: error.message });
    }
});


app.put('/api/users/:id/approve', async (req, res) => {
    const { id } = req.params;

    try {
        const connection = await mysql.createConnection(dbConfig);

        const [result] = await connection.execute(
            `UPDATE owners SET status = 'Approved' WHERE id = ? AND status = 'Pending'`,
            [id]
        );

        connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).send('User not found or already approved');
        }

        res.status(200).send('User approved successfully');
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).send('Failed to approve user');
    }
});

// Approve a user
app.put('/api/users/:id/approve', verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute(
            `UPDATE owners SET status = 'Approved' WHERE id = ? AND status = 'Pending'`,
            [id]
        );
        connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).send('User not found or already approved');
        }

        res.status(200).send('User approved successfully');
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).send('Failed to approve user');
    }
});

// Reject a user
app.put('/api/users/:id/reject', verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute(
            `UPDATE owners SET status = 'Rejected' WHERE id = ? AND status = 'Pending'`,
            [id]
        );
        connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).send('User not found or already processed');
        }

        res.status(200).send('User rejected successfully');
    } catch (error) {
        console.error('Error rejecting user:', error);
        res.status(500).send('Failed to reject user');
    }
});

// Update user status
app.put('/api/users/:id/status', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { status, role } = req.body;

    if (!status || !role) {
        return res.status(400).send('Status and role are required');
    }

    // Validate role and status
    const validRoles = ['Owner', 'Renter'];
    const validStatuses = role === 'Renter' ? ['Active', 'Inactive'] : ['Pending', 'Active', 'Inactive'];

    if (!validRoles.includes(role)) {
        return res.status(400).send('Invalid role');
    }

    if (!validStatuses.includes(status)) {
        return res.status(400).send('Invalid status value');
    }

    try {
        const tableName = role === 'Renter' ? 'renters' : 'owners'; // Determine the table based on role

        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute(
            `UPDATE ${tableName} SET status = ? WHERE id = ?`,
            [status, id]
        );
        connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).send('User not found or status update failed');
        }

        res.status(200).send('User status updated successfully');
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).send('Failed to update user status');
    }
});



app.delete('/api/users/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [ownerResult] = await connection.execute(`DELETE FROM owners WHERE id = ?`, [id]);
        const [renterResult] = await connection.execute(`DELETE FROM renters WHERE id = ?`, [id]);
        connection.end();

        if (ownerResult.affectedRows === 0 && renterResult.affectedRows === 0) {
            return res.status(404).send('User not found');
        }

        res.status(200).send('User deleted successfully');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Failed to delete user');
    }
});

app.get('/admin/userDetails/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Define queries for owners and renters
        const queries = {
            Owner: `
                SELECT firstName, lastName, phoneNumber, barangay, address, userName, idType, idDocument, status, role
                FROM owners WHERE id = ?
            `,
            Renter: `
                SELECT firstName, lastName, phoneNumber, barangay, address, userName, idType, idDocument, status
                FROM renters WHERE id = ?
            `
        };

        // Execute queries
        const [owner] = await connection.execute(queries.Owner, [id]);
        const [renter] = await connection.execute(queries.Renter, [id]);

        connection.end();

        // Determine user type and return the appropriate response
        if (owner.length > 0) {
            res.status(200).json(formatUserDetails(owner[0], 'Owner', req));
        } else if (renter.length > 0) {
            res.status(200).json(formatUserDetails(renter[0], 'Renter', req));
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user details by ID:', error);
        res.status(500).json({ message: 'Failed to fetch user details' });
    }
});

// Helper function to format user details
function formatUserDetails(user, userType, req) {
    return {
        ...user,
        idDocument: user.idDocument
            ? `${req.protocol}://${req.get('host')}/${user.idDocument}`
            : null, // Ensure valid URL for idDocument
        userType // Explicitly set userType
    };
}


app.get('/reservations', async (req, res) => {
    const { machineId } = req.query;

    if (!machineId) {
        return res.status(400).json({ message: 'Machine ID is required' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Fetch reservations by machine ID
        const [reservations] = await connection.execute(`
            SELECT 
                b.id AS bookingId,
                b.createdAt AS date,
                b.endDate,
                b.status,
                b.category,
                m.title AS machineName,
                CONCAT(o.firstName, ' ', o.lastName) AS ownerName,
                CONCAT(r.firstName, ' ', r.lastName) AS renterName
            FROM bookings b
            JOIN machines m ON b.machineId = m.id
            JOIN owners o ON m.ownerId = o.id
            JOIN renters r ON b.userId = r.id
            WHERE b.machineId = ?
            ORDER BY b.createdAt DESC
        `, [machineId]);

        connection.end();

        if (reservations.length === 0) {
            return res.status(404).json({ message: 'No reservations found for this machine' });
        }

        // Ensure valid data format in the response
        const formattedReservations = reservations.map(reservation => ({
            bookingId: reservation.bookingId || 'N/A',
            date: reservation.date ? new Date(reservation.date).toLocaleDateString() : 'Invalid Date',
            endDate: reservation.endDate ? new Date(reservation.endDate).toLocaleDateString() : 'Invalid Date',
            status: reservation.status || 'Unknown',
            category: reservation.category || 'N/A',
            machineName: reservation.machineName || 'Unknown Machine',
            ownerName: reservation.ownerName || 'Unknown Owner',
            renterName: reservation.renterName || 'Unknown Renter',
        }));

        res.status(200).json(formattedReservations);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ message: 'Failed to fetch reservations' });
    }
});

// Update reservation status (Accept, Reject, or Cancel)
app.patch('/reservations/:bookingId/:action', async (req, res) => {
    const { bookingId, action } = req.params;

    // Validate the action
    if (!['accept', 'reject', 'cancel'].includes(action)) {
        return res.status(400).json({ message: 'Invalid action. Allowed actions are accept, reject, or cancel.' });
    }

    // Determine the status based on the action
    const status = action === 'accept' 
        ? 'Accepted' 
        : action === 'reject' 
        ? 'Rejected' 
        : 'Cancelled';

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Update reservation status
        const [result] = await connection.execute(`
            UPDATE bookings
            SET status = ?
            WHERE id = ?
        `, [status, bookingId]);

        connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Reservation not found or could not be updated.' });
        }

        res.status(200).json({ message: `Reservation ${action}ed successfully.` });
    } catch (error) {
        console.error(`Error updating reservation status (${action}):`, error);
        res.status(500).json({ message: `Failed to ${action} the reservation.` });
    }
});



// Handle 404 - Route not found
app.use((req, res, next) => {
    res.status(404).send('Route not found');
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on port 3000');
});

