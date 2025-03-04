
12:34:24:09:28:15 HTC-24092815 Mac address as returns by Lescan

Id shown on app:  24:09:28:15


Model TCo8BXPXXX
TC08
RDF-4724

Device 12:34:24:09:2E:B4 Name: HTC-24092EB4 (west)

Device         24:09:28:15        HTC-24092815 (east startscalso with 12:34?)


Trigkey KEY-N100 Mini PC, Intel Alder Lake N100 (4C/4T, Up to 3.4Hz) 16G DDR4 500G SSD Mini Computer, Intel N100 Mini PC Support Dual Display 2*HDMI/Dual 1000MB/S Ethernet/WiFi-5/BT5.0
runs proxmox NOTE: WIFI adapter does work as wifi client but  not work as AP bridge and Bluetooth does not seem to pass through to linux VMs (using proxmox) in other words dongles are needed for that functionality.

Bluetooth cracking
GeeekPi nRF52840 MDK USB Dongle w/Case Development Platform used along with wireshark. sniffer worked well but it's a useless exercise

better was to use Bleno to mimic the camera and trap traffic.  the bluetooth characteristics were gathered by gattatacker and confirmed with loght-blue and blehero.

python camera simulator creates following output confirming GPIO3 is command to wake wifi
2025-03-01 16:55:44,294 - INFO - Starting BLE peripheral...
2025-03-01 16:55:44,349 - bluezero.GATT - INFO - GATT application registered
2025-03-01 16:55:44,349 - INFO - GATT application registered
Advertisement registered
2025-03-01 16:56:30,268 - INFO - Sending response: Response from simulated camera
2025-03-01 16:56:30,808 - INFO - Received command: GPIO3 on Service UUID: FFE0, Characteristic UUID: FFE9

C2025-03-01 16:58:46,566 - INFO - Advertising as HTC-12345678

node mimiccamera has same results

the "wild cam" ios app connect results:

[INFO] Connected to client: 6b:c1:72:e2:2a:8d
[READ] Characteristic ffea read.
[WRITE] Characteristic ffe9 written with data: 4750494f33
[ACTION] Received "GPIO3" command on ffe9.
[SEND] Response on ffea: abcd1234
[INFO] Disconnected from client: 6b:c1:72:e2:2a:8d

gatttool -b 12:34:24:09:2E:B4 --characteristics
handle = 0x0002, char properties = 0x02, char value handle = 0x0003, uuid = 00002a00-0000-1000-8000-00805f9b34fb
handle = 0x0004, char properties = 0x02, char value handle = 0x0005, uuid = 00002a01-0000-1000-8000-00805f9b34fb
handle = 0x0006, char properties = 0x02, char value handle = 0x0007, uuid = 00002a04-0000-1000-8000-00805f9b34fb
handle = 0x0009, char properties = 0x20, char value handle = 0x000a, uuid = 00002a05-0000-1000-8000-00805f9b34fb
handle = 0x000d, char properties = 0x08, char value handle = 0x000e, uuid = 5833ff02-9b8b-5191-6142-22a4536ef123
handle = 0x000f, char properties = 0x10, char value handle = 0x0010, uuid = 5833ff03-9b8b-5191-6142-22a4536ef123
handle = 0x0013, char properties = 0x10, char value handle = 0x0014, uuid = 0000fff3-0000-1000-8000-00805f9b34fb
handle = 0x0016, char properties = 0x08, char value handle = 0x0017, uuid = 0000fff4-0000-1000-8000-00805f9b34fb
handle = 0x0018, char properties = 0x0c, char value handle = 0x0019, uuid = 0000ffe9-0000-1000-8000-00805f9b34fb
handle = 0x001a, char properties = 0x12, char value handle = 0x001b, uuid = 0000ffea-0000-1000-8000-00805f9b34fb
handle = 0x001d, char properties = 0x10, char value handle = 0x001e, uuid = 0000ffeb-0000-1000-8000-00805f9b34fb

hex value of "GPIO3" is 47 50 49 4F 33    so 0x4750494F33 ??  or maybe 4750 494F 33   ??

camera Wifi connect:
RD7010PRO-cc641a22295e
12345678

second camera
RD7010PRO-cc641a222a8f,12345678


follow the following instructions to make a "machine in the middle"

https://hackaday.io/project/10338/instructions

or using mitmproxy

https://dinofizzotti.com/blog/2022-04-24-running-a-man-in-the-middle-proxy-on-a-raspberry-pi-4/

or much easier to do the same thing ...

install rasp ap and wireshark/tshark

https://github.com/RaspAP/raspap-webgui/releases/latest

Yes! If you capture packets using:

since we are only interested in http to from the camera which is at 192.168.8.120 ....
sudo tshark -i wlan0 -f "tcp port 80 and host 192.168.8.120" -Y "http" -l | tee http_capture.txt


other possibles below ...
sudo tshark -i wlan0 -f "tcp port 80" -Y "http" -l -w http_capture.pcap -P

You can later extract a human-readable text summary in the format you like using the .pcap file.

Convert .pcap to a Readable HTTP Summary

After capturing, run:

tshark -r http_capture.pcap -Y "http" -T fields -e http.host -e http.request.uri

This will extract and display only the hostnames and requested URIs from the saved .pcap file.

Save the Summary to a Text File

To save it for later:

tshark -r http_capture.pcap -Y "http" -T fields -e http.host -e http.request.uri > http_summary.txt

Alternative: More Detailed Output

If you want verbose details from the .pcap file:

tshark -r http_capture.pcap -Y "http" -V > http_detailed_summary.txt

This gives a Wireshark-style detailed output.

Summary:
✅ Yes, you can capture in .pcap format and later extract a human-readable HTTP summary!
Would you like to filter for specific requests (e.g., only GET or POST)?
