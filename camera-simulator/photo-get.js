const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');
const cheerio = require('cheerio');

const WIFI_CREDENTIALS_FILE = 'wifi_credentials.txt';
const MEDIA_DIR = path.join(__dirname, 'media/DCIM/100HUNTI');
const MAX_RETRIES = 20;
const DOWNLOAD_RETRIES = 3;
const WAIT_TIME = 5000;
const CAMERA_URL = 'http://192.168.8.120/DCIM/100HUNTI';
const INTERFACE = 'wlp6s16';
const REQUEST_TIMEOUT = 60000; // 60 seconds

// Ensure media directory exists
if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

// Read Wi-Fi credentials from file
function getWifiCredentials() {
    return fs.readFileSync(WIFI_CREDENTIALS_FILE, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
            const [ssid, password] = line.split(',');
            return { ssid: ssid.trim(), password: password ? password.trim() : '' };
        });
}

// Get currently connected SSID
function getCurrentSSID() {
    try {
        const ssid = execSync(`nmcli -t -f ACTIVE,SSID dev wifi | grep '^yes:' | cut -d: -f2`).toString().trim();
        console.log(`Current connected Wi-Fi: ${ssid || 'None'}`);
        return ssid || null;
    } catch (error) {
        console.error(`Error getting current SSID: ${error.message}`);
        return null;
    }
}

// Disconnect from current Wi-Fi
function disconnectWiFi() {
    try {
        console.log(`Disconnecting Wi-Fi on interface: ${INTERFACE}`);
        execSync(`nmcli device disconnect ${INTERFACE}`);
        console.log(`Disconnected from Wi-Fi.`);
    } catch (error) {
        console.warn(`Failed to disconnect: ${error.message}`);
    }
}

// Bring up Wi-Fi interface
function bringUpWiFiInterface() {
    try {
        console.log(`Bringing up Wi-Fi interface: ${INTERFACE}`);
        execSync(`rfkill unblock wifi`);
        execSync(`ip link set ${INTERFACE} up`);
        console.log(`Wi-Fi interface ${INTERFACE} is up.`);
    } catch (error) {
        console.error(`Failed to bring up Wi-Fi interface: ${error.message}`);
    }
}

// Connect to Wi-Fi
async function connectToWifi(ssid, password) {
    console.log(`Trying to connect to Wi-Fi: ${ssid}`);
    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            console.log(`Executing: nmcli device wifi connect "${ssid}" password "${password}"`);
            execSync(`nmcli device wifi connect "${ssid}" password "${password}"`, { stdio: 'ignore' });

            console.log(`Connected to ${ssid}`);
            return true;
        } catch (error) {
            console.warn(`Failed to connect to ${ssid}: ${error.message}`);
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
        console.log(`Sending GET request to: ${CAMERA_URL}`);
        const response = await axios.get(CAMERA_URL, { timeout: REQUEST_TIMEOUT });

        console.log(`Response received. Status: ${response.status}`);
        console.log(`Response body length: ${response.data.length}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching media list: ${error.message}`);
        return null;
    }
}

// Parse filenames from the HTML
function parseMediaFilenames(html) {
    console.log(`Parsing media filenames from HTML...`);
    const $ = cheerio.load(html);
    let filenames = [];

    $('table tr').each((index, row) => {
        const fileName = $(row).find('td:first-child a b').text().trim();
        if (fileName && !fileName.startsWith('.')) {
            filenames.push(fileName);
        }
    });

    // Sort: JPGs first, then MP4s
    filenames.sort((a, b) => {
        const aIsJpg = a.toLowerCase().endsWith('.jpg');
        const bIsJpg = b.toLowerCase().endsWith('.jpg');
        return aIsJpg === bIsJpg ? 0 : aIsJpg ? -1 : 1;
    });

    console.log(`Parsed filenames (JPEGs first): ${filenames.length > 0 ? filenames.join(', ') : 'None found'}`);
    return filenames;
}

// Download a file
async function downloadFile(filename) {
    const fileUrl = `${CAMERA_URL}/${filename}`;
    const filePath = path.join(MEDIA_DIR, filename);

    for (let attempt = 1; attempt <= DOWNLOAD_RETRIES; attempt++) {
        try {
            console.log(`Attempt ${attempt}: Downloading file: ${fileUrl}`);
            const response = await axios({
                method: 'GET',
                url: fileUrl,
                responseType: 'stream',
                timeout: REQUEST_TIMEOUT
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log(`Downloaded: ${filename}`);
                    resolve(true);
                });
                writer.on('error', (err) => {
                    console.error(`Write stream error for ${filename}: ${err.message}`);
                    reject(err);
                });
            });
        } catch (error) {
            console.error(`Error downloading ${filename} (Attempt ${attempt}): ${error.message}`);
            if (attempt === DOWNLOAD_RETRIES) return false;
        }
    }
}

// Delete file from the camera
async function deleteFile(filename) {
    const deleteUrl = `${CAMERA_URL}/${filename}?del=1`;

    try {
        console.log(`Sending DELETE request to: ${deleteUrl}`);
        await axios.get(deleteUrl, { timeout: REQUEST_TIMEOUT });
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
        console.log(`Processing file: ${filename}`);
        const success = await downloadFile(filename);
        if (success) {
            console.log(`Deleting file: ${filename}`);
            await deleteFile(filename);
        }
    }
}

// Main function
async function main() {
    bringUpWiFiInterface();
    
    const credentials = getWifiCredentials();
    const allowedSSIDs = credentials.map(({ ssid }) => ssid);
    const currentSSID = getCurrentSSID();

    if (allowedSSIDs.includes(currentSSID)) {
        console.log(`Using existing Wi-Fi connection: ${currentSSID}`);
        await processMediaFiles();
        return;
    }

    if (currentSSID) {
        console.log(`Current Wi-Fi (${currentSSID}) is not allowed. Disconnecting...`);
        disconnectWiFi();
    }

    for (const { ssid, password } of credentials) {
        const connected = await connectToWifi(ssid, password);
        if (connected) {
            await processMediaFiles();
            disconnectWiFi();
        }
    }

    console.log('All Wi-Fi networks processed.');
}

main();
