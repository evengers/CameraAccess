
12:34:24:09:28:15 HTC-24092815 Mac address as returns by Lescan

Id shown on app:  24:09:28:15

Uses chanel 1 for wifi
'RD7010PRO-cc641a22295e' ({length = 22, bytes = 0x52443730313050524f2d636336343161323232393565}), bssid=<redacted>, channel=[1 (20MHz)], cc=(null), phy=11b/g/n (0x1C), rssi=-39, rsn=[mcast=aes_ccm, bip=none, ucast={ aes_ccm }, auths={ psk }, mfp=no, caps=0xc], wpa=(null), wapi=no, wep=no, ibss=no, ph=no, swap=no, hs20=no

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


typical connection sequence from camera app log:
[09:01:08][BLEC] Starting Bluetooth scan
[09:01:12][BLEC] Bluetooth connected
[09:01:12][BLEC] Retrieved Bluetooth version: v27 240813#565
[09:01:21][FFEB] RD7010PRO-cc641a22295e/12345678/(null)/1
[09:02:04][HTTP] Starting synchronization with the camera
[09:02:05][HTTP] 565/RD7010PRO_01/20190620/Nov 11 2024, 09:46:36/HUNTCAM
[09:02:05][HTTP] Camera date synchronized successfully
[09:02:05][HTTP] Camera time synchronized successfully
[09:02:05][HTTP] Camera mode synchronized successfully
[09:02:05][HTTP] Camera 3031 synchronized successfully
[09:02:05][HTTP] Camera connected successfully




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

0100011101010000010010010100111100110011  byte array?
DISCONNECT BY WRITING THAT TO UUID 5833FF02-9B8B-5191-6142-22A4536EF123

SEND IT TO FFF4 seems to activate the WIFI ... but unable to join?



Received from FFEA
7632 3720 3234 3038 3133 2335 3635 00   which means    v27 240813#565

RECEIVED FROM FFEB and light turns on
5B53 445D 5244 3730 3130 5052 4F2D 0000    which means   [SD]RD7010PRO-


try this order:)
if connected, disconnect by sending gpio3 to 5833FF02-9B8B-5191-6142-22A4536EF123

connect
set notify on for that uuid
writ to ffeb
set notify on for ffea. and then read 


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


sample log for successful and unsuccessful conectionsnto [08:29:09][SYSV]iPhone14,7/18.4/1.0.8 25010602
[08:29:09][BLEC]开始扫描蓝牙
[08:29:13][BLEC]已经连接蓝牙
[08:29:14][BLEC]已经获取到蓝牙版本:v27 240813#565
[08:29:21][FFEB]RD7010PRO-cc641a22295e/12345678/(null)/1
[08:29:22][WIFI]系统开始搜索直连WiFi
[08:29:29][WIFI]已连接的WiFi信息 = RD7010PRO-cc641a22295e
[08:29:29][WIFI]系统直连成功,延时等待网络稳定
[08:29:34][HTTP]开始同相机同步信息
[08:29:39][HTTP]开始同相机同步信息
[08:29:44][HTTP]开始同相机同步信息
[08:29:44][HTTP]565/RD7010PRO_01/20190620/Nov 11 2024, 09:46:36/HUNTCAM
[08:29:44][HTTP]同步相机日期成功
[08:29:44][HTTP]同步相机时间成功
[08:29:44][HTTP]同步相机模式成功
[08:29:44][HTTP]同步相机3031成功
[08:29:44][HTTP]相机连接成功
[08:38:16][BLEC]开始扫描蓝牙
[08:38:17][BLEC]开始连接蓝牙
[08:38:17][BLEC]开始连接蓝牙
[08:39:16][HTTP]WiFi连接失败/error=1
[08:39:24][BLEC]开始扫描蓝牙
[08:39:28][BLEC]开始连接蓝牙
[08:39:34][BLEC]开始连接蓝牙
[08:43:03][BLEC]开始扫描蓝牙
[08:43:04][BLEC]开始连接蓝牙
[08:43:11][BLEC]已经连接蓝牙
[08:43:12][BLEC]已经获取到蓝牙版本:v27 240813#565
[08:44:03][HTTP]WiFi连接失败/error=1


Here’s the translation:






[08:29:09][SYSV] iPhone14,7/18.4/1.0.8 25010602

[08:29:09][BLEC] Started scanning for Bluetooth

[08:29:13][BLEC] Bluetooth connected

[08:29:14][BLEC] Retrieved Bluetooth version: v27 240813#565

[08:29:21][FFEB] RD7010PRO-cc641a22295e/12345678/(null)/1

[08:29:22][WIFI] System started searching for direct WiFi connection

[08:29:29][WIFI] Connected WiFi info = RD7010PRO-cc641a22295e

[08:29:29][WIFI] System direct connection successful, delaying to allow network stabilization

[08:29:34][HTTP] Starting synchronization with the camera

[08:29:39][HTTP] Starting synchronization with the camera

[08:29:44][HTTP] Starting synchronization with the camera

[08:29:44][HTTP] 565/RD7010PRO_01/20190620/Nov 11 2024, 09:46:36/HUNTCAM

[08:29:44][HTTP] Camera date synchronization successful

[08:29:44][HTTP] Camera time synchronization successful

[08:29:44][HTTP] Camera mode synchronization successful

[08:29:44][HTTP] Camera 3031 synchronization successful

[08:29:44][HTTP] Camera connection successful

[08:38:16][BLEC] Started scanning for Bluetooth

[08:38:17][BLEC] Started connecting to Bluetooth

[08:38:17][BLEC] Started connecting to Bluetooth

[08:39:16][HTTP] WiFi connection failed/error=1

[08:39:24][BLEC] Started scanning for Bluetooth

[08:39:28][BLEC] Started connecting to Bluetooth

[08:39:34][BLEC] Started connecting to Bluetooth

[08:43:03][BLEC] Started scanning for Bluetooth

[08:43:04][BLEC] Started connecting to Bluetooth

[08:43:11][BLEC] Bluetooth connected

[08:43:12][BLEC] Retrieved Bluetooth version: v27 240813#565

[08:44:03][HTTP] WiFi connection failed/error=1




Writes one of these to the 3rd characteristic ffe9

"GETSD"
"GETPD"
"GETBT"
"GPIO2"
"GPIO3"

read from characteristics are ffea, ffeb 


this according to mimicWirhNode.js is the order of events


2-5 Notify enabled for:  0000ffeb-0000-1000-8000-00805f9b34fb
2-5sending mock response:  [SD]RD7010PRO-
2-3value was written to : 0000ffe9-0000-1000-8000-00805f9b34fb
2-3 write (GETSD or GPIO3):  GETSD










