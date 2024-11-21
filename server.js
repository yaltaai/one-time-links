const express = require('express'); // Import Express
const bodyParser = require('body-parser'); // Middleware for parsing JSON
const app = express(); // Initialize Express

app.use(bodyParser.json()); // Parse incoming JSON (for webhooks)

// Temporary in-memory store for links
const links = {};

// Root endpoint to show a welcome message
app.get('/', (req, res) => {
    res.send("Welcome to the One-Time Link Generator! Use /generate to create links.");
});

// Endpoint to generate a unique link
app.get('/generate', (req, res) => {
    const userId = req.query.userId || 'default'; // Use query parameter as a unique user identifier

    // Check if a valid link already exists for the user
    const existingLink = links[userId];
    if (existingLink && !existingLink.used && Date.now() <= existingLink.expirationTime) {
        return res.send(`Your existing link: ${existingLink.uniqueUrl}`);
    }

    // Generate a new link
    const token = Math.random().toString(36).substr(2, 12); // Generate random unique token
    const baseUrl = `${req.protocol}://${req.get('host')}`; // Dynamically detect base URL
    const uniqueUrl = `${baseUrl}/redirect/${token}`;

    // Save the link
    links[userId] = {
        uniqueUrl,
        hubspotLink: "https://meetings.hubspot.com/joseph626", // Your HubSpot meeting scheduler link
        expirationTime: Date.now() + 24 * 60 * 60 * 1000, // Expire in 24 hours
        used: false,
    };

    res.send(`Your new link: ${uniqueUrl}`);
});

// Endpoint to handle redirection
app.get('/redirect/:token', (req, res) => {
    const token = req.params.token;
    const link = Object.values(links).find(link => link.uniqueUrl.includes(token));

    if (!link) return res.status(404).send("Invalid link");
    if (Date.now() > link.expirationTime) return res.status(400).send("This link has expired");

    // Redirect to the HubSpot scheduler with the token included
    const schedulerUrl = `${link.hubspotLink}?custom_token=${token}`;
    res.redirect(schedulerUrl);
});

// Webhook endpoint for when meetings are booked
app.post('/webhook', (req, res) => {
    const data = req.body;

    if (data.event === 'meetings.created') {
        const token = data.properties.custom_token; // Token passed via the scheduler URL
        const link = Object.values(links).find(link => link.uniqueUrl.includes(token));
        
        if (link) {
            link.used = true; // Mark link as used when a meeting is scheduled
        }

        console.log(`Meeting booked with token: ${token}`);
    }

    res.status(200).send("Webhook received");
});

// Start the server
app.listen(3000, () => {
    console.log('Server running');
});
