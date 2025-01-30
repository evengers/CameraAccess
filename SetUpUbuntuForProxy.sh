#!/bin/bash

# Update and install required packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y hostapd dnsmasq iptables mitmproxy

# Configure hostapd (Wi-Fi AP)
cat <<EOF | sudo tee /etc/hostapd/hostapd.conf
interface=wlan0
driver=nl80211
ssid=MITM_Proxy
channel=6
hw_mode=g
auth_algs=1
wpa=2
wpa_passphrase=proxywifi
wpa_key_mgmt=WPA-PSK
EOF

# Enable and start hostapd
sudo systemctl enable hostapd
sudo systemctl start hostapd

# Configure dnsmasq (DHCP for AP)
cat <<EOF | sudo tee /etc/dnsmasq.conf
interface=wlan0
dhcp-range=192.168.50.10,192.168.50.100,12h
dhcp-option=3,192.168.50.1
dhcp-option=6,8.8.8.8,8.8.4.4
EOF

# Restart dnsmasq
sudo systemctl restart dnsmasq

# Enable IP forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Route traffic from the Wi-Fi AP to Raspberry Pi Ethernet connection
sudo iptables -t nat -A POSTROUTING -o ens18 -j MASQUERADE

# Redirect HTTP traffic to MITMProxy
sudo iptables -t nat -A PREROUTING -i wlan0 -p tcp --dport 80 -j REDIRECT --to-port 8080

# Save iptables rules
sudo netfilter-persistent save

# Create a MITMProxy systemd service
cat <<EOF | sudo tee /etc/systemd/system/mitmproxy.service
[Unit]
Description=MITMProxy Transparent Mode
After=network.target

[Service]
ExecStart=/usr/bin/mitmproxy --mode transparent --listen-host 192.168.50.1 --listen-port 8080
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

# Enable and start MITMProxy
sudo systemctl daemon-reload
sudo systemctl enable mitmproxy
sudo systemctl start mitmproxy

echo "Setup complete. The Proxmox VM is now running a Wi-Fi AP and capturing HTTP traffic."
