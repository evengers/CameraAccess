const fs = require('fs');
const path = require('path');
const axios = require('axios');
const wifi = require('wifi-control');
const cheerio = require('cheerio');

const WIFI_CREDENTIALS_FILE = 'wifi_credentials.txt';
const MEDIA_DIR = path.join(__dirname, 'media/DCIM/100HUNTI');
const MAX_RETRIES = 20;
const WAIT_TIME = 5000;
const CAMERA_URL = 'http://192.168.8.120/DCIM/100HUNTI';

// Ensure media directory exists
if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

// Initialize Wi-Fi module
wifi.init({
    debug: true
});

// Read Wi-Fi credentials from file
function getWifiCredentials() {
    return fs.readFileSync(WIFI_CREDENTIALS_FILE, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')) // Ignore empty lines and comments
        .map(line => {
            const [ssid, password] = line.split(',');
            return { ssid: ssid.trim(), password: password ? password.trim() : '' };
        });
}

// Connect to Wi-Fi
async function connectToWifi(ssid, password) {
    console.log(`Trying to connect to Wi-Fi: ${ssid}`);
    let retries = 0;

    while (retries < MAX_RETRIES) {
        const response = wifi.connectToAP({ ssid, password });
        if (response.success) {
            console.log(`Connected to ${ssid}`);
            return true;
        }
        console.log(`Retrying Wi-Fi connection (${retries + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
        retries++;
    }

    console.log(`Failed to connect to ${ssid}. Trying next network.`);
    return false;
}

// Fetch the image/video list from the camera
async function fetchMediaList() {
    try {
        const response = await axios.get(CAMERA_URL);
        return response.data;
    } catch (error) {
        console.error(`Error fetching media list: ${error.message}`);
        return null;
    }
}

// Parse filenames from the HTML
function parseMediaFilenames(html) {
    const $ = cheerio.load(html);
    const filenames = [];

    $('table tr').each((index, row) => {
        const fileName = $(row).find('td:nth-child(2) a').text().trim();
        if (fileName && !fileName.startsWith('.')) {
            filenames.push(fileName);
        }
    });

    return filenames;
}

// Download a file
async function downloadFile(filename) {
    const fileUrl = `${CAMERA_URL}/${filename}`;
    const filePath = path.join(MEDIA_DIR, filename);

    try {
        const response = await axios({
            method: 'GET',
            url: fileUrl,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`Downloaded: ${filename}`);
                resolve(true);
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`Error downloading ${filename}: ${error.message}`);
        return false;
    }
}

// Delete file from the camera
async function deleteFile(filename) {
    const deleteUrl = `${CAMERA_URL}/${filename}?del=1`;

    try {
        await axios.get(deleteUrl);
        console.log(`Deleted: ${filename}`);
        return true;
    } catch (error) {
        console.error(`Error deleting ${filename}: ${error.message}`);
        return false;
    }
}

// Process media files (download and delete)
async function processMediaFiles() {
    const html = await fetchMediaList();
    if (!html) return;

    const filenames = parseMediaFilenames(html);
    if (filenames.length === 0) {
        console.log('No media files found.');
        return;
    }

    for (const filename of filenames) {
        const success = await downloadFile(filename);
        if (success) {
            await deleteFile(filename);
        }
    }
}

// Main function
async function main() {
    const credentials = getWifiCredentials();

    for (const { ssid, password } of credentials) {
        const connected = await connectToWifi(ssid, password);
        if (connected) {
            await processMediaFiles();
        }
    }

    console.log('All Wi-Fi networks processed.');
}

main();
