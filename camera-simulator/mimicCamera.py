# SCRIPT BELOW PRODUCES THIS OUTPUT WHEN CAMERA APP CONNECTS:
#INFO - Starting BLE peripheral...
# bluezero.GATT - INFO - GATT application registered
# INFO - GATT application registered
#Advertisement registered
# INFO - Sending response: Response from simulated camera
# INFO - Received command: GPIO3 on Service UUID: FFE0, Characteristic UUID: FFE9
# INFO - Advertising as HTC-12345678

import logging
from bluezero import adapter
from bluezero import peripheral

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Device Information
DEVICE_NAME = "HTC-12345678"
ADVERTISEMENT_SERVICE_UUID = "FEFF"

# Service and Characteristic UUIDs
SERVICE_1_UUID = "5833FF01-9B8B-5191-6142-22A4536EF123"
CHARACTERISTIC_1_1_UUID = "5833FF02-9B8B-5191-6142-22A4536EF123"
CHARACTERISTIC_1_2_UUID = "5833FF03-9B8B-5191-6142-22A4536EF123"

SERVICE_2_UUID = "FFE0"
CHARACTERISTIC_2_1_UUID = "FFF3"
CHARACTERISTIC_2_2_UUID = "FFF4"
CHARACTERISTIC_2_3_UUID = "FFE9"
CHARACTERISTIC_2_4_UUID = "FFEA"
CHARACTERISTIC_2_5_UUID = "FFEB"

# Callback for writable characteristics
def write_callback(value, options, service_uuid, characteristic_uuid):
    command = bytes(value).decode("utf-8", errors="ignore")
    logging.info(f"Received command: {command} on Service UUID: {service_uuid}, Characteristic UUID: {characteristic_uuid}")
    with open("received_commands.log", "a") as log_file:
        log_file.write(f"Service UUID: {service_uuid}, Characteristic UUID: {characteristic_uuid}, Command: {command}\n")

# Callback for readable characteristics
def read_callback():
    response = "Response from simulated camera"
    logging.info(f"Sending response: {response}")
    return list(response.encode())

def main(adapter_address):
    logging.info("Starting BLE peripheral...")

    # Create peripheral
    ble_peripheral = peripheral.Peripheral(adapter_address,
                                           local_name=DEVICE_NAME,
                                           appearance=0x0340)

    # Advertise the primary service
    ble_peripheral.add_service(srv_id=1, uuid=ADVERTISEMENT_SERVICE_UUID, primary=True)

    # Add first service and its characteristics
    ble_peripheral.add_service(srv_id=2, uuid=SERVICE_1_UUID, primary=True)
    ble_peripheral.add_characteristic(srv_id=2, chr_id=1, uuid=CHARACTERISTIC_1_1_UUID,
                                      value=[], notifying=False,
                                      flags=['write'],
                                      write_callback=lambda value, options: write_callback(value, options, SERVICE_1_UUID, CHARACTERISTIC_1_1_UUID))
    ble_peripheral.add_characteristic(srv_id=2, chr_id=2, uuid=CHARACTERISTIC_1_2_UUID,
                                      value=[], notifying=True,
                                      flags=['notify'])

    # Add second service and its characteristics
    ble_peripheral.add_service(srv_id=3, uuid=SERVICE_2_UUID, primary=True)
    ble_peripheral.add_characteristic(srv_id=3, chr_id=1, uuid=CHARACTERISTIC_2_1_UUID,
                                      value=[], notifying=True,
                                      flags=['notify'])
    ble_peripheral.add_characteristic(srv_id=3, chr_id=2, uuid=CHARACTERISTIC_2_2_UUID,
                                      value=[], notifying=False,
                                      flags=['write'],
                                      write_callback=lambda value, options: write_callback(value, options, SERVICE_2_UUID, CHARACTERISTIC_2_2_UUID))
    ble_peripheral.add_characteristic(srv_id=3, chr_id=3, uuid=CHARACTERISTIC_2_3_UUID,
                                      value=[], notifying=False,
                                      flags=['write', 'write-without-response'],
                                      write_callback=lambda value, options: write_callback(value, options, SERVICE_2_UUID, CHARACTERISTIC_2_3_UUID))
    ble_peripheral.add_characteristic(srv_id=3, chr_id=4, uuid=CHARACTERISTIC_2_4_UUID,
                                      value=[], notifying=True,
                                      flags=['read', 'notify'],
                                      read_callback=read_callback)
    ble_peripheral.add_characteristic(srv_id=3, chr_id=5, uuid=CHARACTERISTIC_2_5_UUID,
                                      value=[], notifying=True,
                                      flags=['notify'])

    # Publish peripheral and start event loop
    ble_peripheral.publish()
    logging.info(f"Advertising as {DEVICE_NAME}")

if __name__ == '__main__':
    # Get the default adapter address and pass it to main
    adapter_address = list(adapter.Adapter.available())[0].address
    main(adapter_address)
