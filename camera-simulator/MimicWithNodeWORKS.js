const HciSocket = require('hci-socket');
const NodeBleHost = require('ble-host');
const BleManager = NodeBleHost.BleManager;
const AdvertisingDataBuilder = NodeBleHost.AdvertisingDataBuilder;
const HciErrors = NodeBleHost.HciErrors;
const AttErrors = NodeBleHost.AttErrors;

const deviceName = 'HTC-12345678';
const advertiseService = 'FEFF';

// Try using 16-bit UUID instead of 128-bit
//advertisingData.add16BitServiceUUIDs([0xFFEF]);

//Primary Services
const SERVICE_1_UUID = "5833ff01-9b8b-5191-6142-22a4536ef123";  // First primary service
const SERVICE_2_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";  //Second primary service

//Characteristics for First Service (FF01)
const CHARACTERISTIC_1_1_UUID = "5833ff02-9b8b-5191-6142-22a4536ef123";  // write
const CHARACTERISTIC_1_2_UUID = "5833ff03-9b8b-5191-6142-22a4536ef123";  //notify (Has a descriptor)

//Characteristics for Second Service (FFE0)
const CHARACTERISTIC_2_1_UUID = "0000fff3-0000-1000-8000-00805f9b34fb";  //Notify (Has a descriptor)
const CHARACTERISTIC_2_2_UUID = "0000fff4-0000-1000-8000-00805f9b34fb";  //Write
const CHARACTERISTIC_2_3_UUID = "0000ffe9-0000-1000-8000-00805f9b34fb";  //Write, Write Without Response
const CHARACTERISTIC_2_4_UUID = "0000ffea-0000-1000-8000-00805f9b34fb";  //Notify, Read (Has a descriptor)
const CHARACTERISTIC_2_5_UUID = "0000ffeb-0000-1000-8000-00805f9b34fb";  // Notify

//Descriptors**
const DESCRIPTOR_1_2_UUID = "00002902-0000-1000-8000-00805f9b34fb";  // For Characteristic 1_2
const DESCRIPTOR_2_1_UUID = "00002902-0000-1000-8000-00805f9b34fb";  // For Characteristic 2_1
const DESCRIPTOR_2_4_UUID = "00002902-0000-1000-8000-00805f9b34fb";  // For Characteristic 2_4

//Predefined characteristic values
const CHARACTERISTIC_2_4_VALUE = Buffer.from("763237203234303831332335363500", "hex"); //bluetooth version?
const CHARACTERISTIC_2_5_VALUE = Buffer.from("5b53445d52443730313050524f2d0000","hex"); //model
const NOTIFY_VALUE = Buffer.from("01000000");
const SEND_FROM_FFEB = "RD7010PRO-cc641a2229e/12345678/(null)/1";

var transport = new HciSocket(); // connects to the first hci device on the computer, for example hci0

var options = {
    // optional properties go here
};

BleManager.create(transport, options, function(err, manager) {
    // err is either null or an Error object
    // if err is null, manager contains a fully initialized BleManager object
    if (err) {
        console.error(err);
        return;
    }
    
    var notificationCharacteristic;
    
    manager.gattDb.setDeviceName(deviceName);
    manager.gattDb.addServices([
           {
              uuid: SERVICE_1_UUID,
               characteristics: [
                 {
                    uuid: CHARACTERISTIC_1_1_UUID,
                    properties: ['write'],
                    value: NOTIFY_VALUE, // could be a Buffer for a binary value
                    onWrite: function(connection, needsResponse, value, callback) {
                      console.log(CHARACTERISTIC_1_1_UUID,'written to:', value);
                      const buffer = Buffer.from(value);
                      console.log('1-1 write: ',buffer.toString('ascii')); // Output: ?
                      needsResponse =false; // so callback not needed
                      //callback(AttErrors.SUCCESS); // actually only needs to be called when need>
                     }
                 },
                 {
                    uuid: CHARACTERISTIC_1_2_UUID,
                    properties: ['notify'],
                    value: NOTIFY_VALUE, // could be a Buffer for a binary value
                    onSubscriptionChange: function(connection, notification, indication, isWrite) {
                    if (notification) {
                        console.log("1-2 Notify enabled for: ",CHARACTERISTIC_1_2_UUID);
                       // Notifications are now enabled, so let's send something
                        notificationCharacteristic.notify(connection, NOTIFY_VALUE);
                        const buffer = Buffer.from(NOTIFY_VALUE);
                        console.log('1-2sending mock response: ',buffer.toString('ascii')); //>
                     }
                 }

                 }
               ]
          },
        {
            uuid: SERVICE_2_UUID,
            characteristics: [
                {
                    uuid: CHARACTERISTIC_2_1_UUID,
                    properties: ['notify'],
                    value: NOTIFY_VALUE, // could be a Buffer for a binary value
                    onSubscriptionChange: function(connection, notification, indication, isWrite) {
                       if (notification) {
                          console.log("2-1 Notify enabled for: ",CHARACTERISTIC_2_1_UUID);
                         // Notifications are now enabled, so let's send something
                         notificationCharacteristic.notify(connection, NOTIFY_VALUE);
                         const buffer = Buffer.from(NOTIFY_VALUE);
                         console.log('2-1sending mock response: ',buffer.toString('ascii')); //>
                       }
                      }
               },
                {
                    uuid: CHARACTERISTIC_2_2_UUID,
                    properties: ['write'],
                    onWrite: function(connection,needsResponse, value, callback) {
                        //console.log('2-2 value was written:', value);
                        const buffer = Buffer.from(value);
                        console.log('2-2 write: ',buffer.toString('ascii')); // Output: ?????
                        needsResponse = false; //so callback not needed
                        //callback(AttErrors.SUCCESS, new Date().toString());
                    }
                },
                {
                    uuid: CHARACTERISTIC_2_3_UUID,
                    properties: ['write','write-without-response'],
                    onWrite: function(connection, needsResponse, value, callback) {
                        //console.log('2-3value was written:', value);
                        const buffer = Buffer.from(value);
                        console.log('2-3 write (GETSD or GPIO3): ',buffer.toString('ascii')); // Output: GETSD   OR GPIO3
                        needsResponse = false; //so callback not needed
                        //callback(AttErrors.SUCCESS); // actually only needs to be called when needsResponse is true
                    }
                },
                notificationCharacteristic = {
                    uuid: CHARACTERISTIC_2_4_UUID,
                    properties: ['notify','read'],
                    value: CHARACTERISTIC_2_4_VALUE,
                    onSubscriptionChange: function(connection, notification, indication, isWrite) {
                        if (notification) {
                             console.log("2-4 Notify enabled for: ",CHARACTERISTIC_2_4_UUID);
                            // Notifications are now enabled, so let's send something
                            notificationCharacteristic.notify(connection, CHARACTERISTIC_2_4_VALUE);
                            const buffer = Buffer.from(CHARACTERISTIC_2_4_VALUE);
                            console.log('2-4sending mock response: ',buffer.toString('ascii')); // Output:  version

                        }
                    }
                },
                notificationCharacteristic = {
                  uuid: CHARACTERISTIC_2_5_UUID,
                  properties: ['notify'],
                  value: SEND_FROM_FFEB,
                  onSubscriptionChange: function(connection, notification, indication, isWrite) {
                  if (notification) {
                       // Notifications are now enabled, so let's send something
                      console.log("2-5 Notify enabled for: ",CHARACTERISTIC_2_5_UUID);
                      notificationCharacteristic.notify(connection, CHARACTERISTIC_2_5_VALUE);
                      const buffer = Buffer.from(CHARACTERISTIC_2_5_VALUE);
                      console.log('2-5sending mock response: ',buffer.toString('ascii')); // Camera model
                    }
                }
             }
            ]
        }
    ]);
    
    const advDataBuffer = new AdvertisingDataBuilder()
                            .addFlags(['leGeneralDiscoverableMode', 'brEdrNotSupported'])
                            .addLocalName(/*isComplete*/ true, deviceName)
                            .add16BitServiceUUIDs(/*isComplete*/ true, [0xFFEF])
                            .build();
    manager.setAdvertisingData(advDataBuffer);
    // call manager.setScanResponseData(...) if scan response data is desired too
    startAdv();

    function startAdv() {
        manager.startAdvertising({/*options*/}, connectCallback);
    }
    
    function connectCallback(status, conn) {
        if (status != HciErrors.SUCCESS) {
            // Advertising could not be started for some controller-specific reason, try again after 10 seconds
            setTimeout(startAdv, 10000);
            return;
        }
        conn.on('disconnect', startAdv); // restart advertising after disconnect
        console.log('Connection established!', conn);
    }
});
