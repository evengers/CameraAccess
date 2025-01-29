/*
uses node v18.20.6
npm -v 10.8.2

camera app running on iphone tries to communicate with this.
point is only to trap the initial bluetooth traffic

the assumption is that the camera is being controlled by an ESP32 or something similar. Bluetooth wakes up the camera access point. next step is to deconstruct the wifi HTTP traffic.



the "wild cam" ios app connect results:

[INFO] Connected to client: 6b:c1:72:e2:2a:8d
[READ] Characteristic ffea read.
[WRITE] Characteristic ffe9 written with data: 4750494f33
[ACTION] Received "GPIO3" command on ffe9.
[SEND] Response on ffea: abcd1234
[INFO] Disconnected from client: 6b:c1:72:e2:2a:8d

*/
const bleno = require('@abandonware/bleno');
const fs = require('fs');

// Load JSON data
const advData = JSON.parse(fs.readFileSync('./123424092815_HTC-24092815.adv.json', 'utf-8'));
const serviceData = JSON.parse(fs.readFileSync('./123424092815.srv.json', 'utf-8'));

// Set custom BLE device name
process.env['BLENO_DEVICE_NAME'] = advData.decodedNonEditable.localName || 'MockDevice';

// Parse advertising data
const ADV_DATA = Buffer.from(advData.eir, 'hex');
const SCAN_RESP = Buffer.from(advData.scanResponse, 'hex');

// Helper to create characteristics
function createCharacteristics(characteristics) {
    return characteristics.map((char) => {
        const options = {
            uuid: char.uuid,
            properties: char.properties,
        };

        // Only set the value for strictly "read-only" characteristics
        if (char.properties.length === 1 && char.properties.includes('read') && char.value) {
            options.value = Buffer.from(char.value, 'hex');
        }

        const characteristic = new bleno.Characteristic({
            ...options,
            onReadRequest: (offset, callback) => {
                if (char.properties.includes('read')) {
                    console.log(`[READ] Characteristic ${char.uuid} read.`);
                    
                    // Simulate a response value for `ffea`
                    let responseValue;
                    if (char.uuid === 'ffea') {
                        responseValue = Buffer.from('01020304', 'hex'); // Example mock data
                    } else {
                        responseValue = options.value || Buffer.alloc(0);
                    }

                    callback(bleno.Characteristic.RESULT_SUCCESS, responseValue);
                } else {
                    callback(bleno.Characteristic.RESULT_UNLIKELY_ERROR);
                }
            },
            onWriteRequest: (data, offset, withoutResponse, callback) => {
                if (char.properties.includes('write') || char.properties.includes('writeWithoutResponse')) {
                    console.log(`[WRITE] Characteristic ${char.uuid} written with data: ${data.toString('hex')}`);
                    
                    // Detect "GPIO3" write on `ffe9`
                    if (char.uuid === 'ffe9' && data.toString('hex') === '4750494f33') {
                        console.log(`[ACTION] Received "GPIO3" command on ffe9.`);

                        // Send response directly to ffea
                        const ffeaCharacteristic = characteristics.find(c => c.uuid === 'ffea');
                        if (ffeaCharacteristic) {
                            const responseData = Buffer.from('ABCD1234', 'hex'); // Mock response
                            console.log(`[SEND] Response on ffea: ${responseData.toString('hex')}`);
                            
                            // Send the response if the characteristic supports notifications
                            if (ffeaCharacteristic.properties.includes('notify') && ffeaCharacteristic.updateValueCallback) {
                                ffeaCharacteristic.updateValueCallback(responseData);
                            }
                        }
                    }

                    callback(bleno.Characteristic.RESULT_SUCCESS);
                } else {
                    callback(bleno.Characteristic.RESULT_UNLIKELY_ERROR);
                }
            },
            onSubscribe: (maxValueSize, updateValueCallback) => {
                if (char.properties.includes('notify')) {
                    console.log(`[NOTIFY] Subscribed to ${char.uuid}.`);
                    characteristic.updateValueCallback = updateValueCallback; // Store callback for future use

                    setInterval(() => {
                        const notification = Buffer.from('MockNotificationData', 'utf-8');
                        updateValueCallback(notification);
                        console.log(`[NOTIFY] Sent notification for ${char.uuid}: ${notification.toString('utf-8')}`);
                    }, 3000);
                }
            },
            onUnsubscribe: () => {
                console.log(`[NOTIFY] Unsubscribed from ${char.uuid}.`);
            },
        });

        return characteristic;
    });
}

// Helper to create services
function createServices(serviceData) {
    return serviceData.map((service) => {
        const characteristics = createCharacteristics(service.characteristics || []);
        return new bleno.PrimaryService({
            uuid: service.uuid,
            characteristics: characteristics,
        });
    });
}

// Initialize services
const services = createServices(serviceData);

console.log('Starting Bleno...');

// Bleno event handlers
bleno.on('stateChange', (state) => {
    console.log(`[STATE] Bleno state changed to: ${state}`);
    if (state === 'poweredOn') {
        console.log('[INFO] Starting advertising...');
        bleno.startAdvertisingWithEIRData(ADV_DATA, SCAN_RESP, (err) => {
            if (err) {
                console.error('[ERROR] Advertising failed:', err);
            } else {
                console.log('[INFO] Advertising started successfully');
                bleno.setServices(services, (error) => {
                    if (error) {
                        console.error('[ERROR] Setting services failed:', error);
                    } else {
                        console.log('[INFO] Services set successfully');
                    }
                });
            }
        });
    } else {
        bleno.stopAdvertising();
        console.log('[INFO] Stopped advertising.');
    }
});

bleno.on('advertisingStartError', (error) => {
    console.error('[ERROR] Advertising failed to start:', error);
});

bleno.on('accept', (clientAddress) => {
    console.log(`[INFO] Connected to client: ${clientAddress}`);
});

bleno.on('disconnect', (clientAddress) => {
    console.log(`[INFO] Disconnected from client: ${clientAddress}`);
});
