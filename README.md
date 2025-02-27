Device 12:34:24:09:2E:B4 Name: HTC-24092EB4 (west)

Device         24:09:28:15        HTC-24092815 (east startscalso with 12:34?)


Trigkey KEY-N100 Mini PC, Intel Alder Lake N100 (4C/4T, Up to 3.4Hz) 16G DDR4 500G SSD Mini Computer, Intel N100 Mini PC Support Dual Display 2*HDMI/Dual 1000MB/S Ethernet/WiFi-5/BT5.0
runs proxmox NOTE: WIFI adapter does work as wifi client but  not work as AP bridge and Bluetooth does not seem to pass through to linux VMs (using proxmox) in other words dongles are needed for that functionality.

Bluetooth cracking
GeeekPi nRF52840 MDK USB Dongle w/Case Development Platform used along with wireshark. sniffer worked well but it's a useless exercise

better was to use Bleno to mimic the camera and trap traffic.  the bluetooth characteristics were gathered by gattatacker and confirmed with loght-blue and blehero.


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
