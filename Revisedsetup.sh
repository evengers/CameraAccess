#!/bin/bash

echo "Starting setup..."

# Update and install required packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y hostapd dnsmasq iptables iptables-persistent mitmproxy

echo "Resetting previous configurations..."

# Unmask and restart hostapd (fixes masked service issue)
sudo systemctl unmask hostapd
sudo systemctl stop hostapd
sudo systemctl disable hostapd

# Stop and reset dnsmasq
sudo systemctl stop dnsmasq
sudo rm -f /etc/dnsmasq.conf  # Remove old configuration

# Flush iptables rules to avoid conflicts
sudo iptables -F
sudo iptables -t nat -F
sudo iptables -X
sudo netfilter-persistent save

# Stop systemd-resolved to prevent DNS conflicts
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved

echo "Identifying wireless interface..."

# Identify the wireless interface dynamically
WLAN_IF=$(ls /sys/class/net | grep -E '^wlan|^wl')
if [ -z "$WLAN_IF" ]; then
    echo "Error: No wireless interface found."
    exit 1
fi

echo "Configuring hostapd (Wi-Fi AP)..."

# Configure hostapd
cat <<EOF | sudo tee /etc/hostapd/hostapd.conf
interface=$WLAN_IF
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
sudo systemctl restart hostapd

echo "Configuring dnsmasq (DHCP server)..."

# Configure dnsmasq
cat <<EOF | sudo tee /etc/dnsmasq.conf
interface=$WLAN_IF
dhcp-range=192.168.50.10,192.168.50.100,12h
dhcp-option=3,192.168.50.1
dhcp-option=6,8.8.8.8,8.8.4.4
EOF

# Restart dnsmasq
sudo systemctl enable dnsmasq
sudo systemctl restart dnsmasq

echo "Enabling IP forwarding..."

# Enable IP forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Find the correct Ethernet interface dynamically (works even if it's not ens18)
ETH_IF=$(ip route | grep default | awk '{print $5}')
if [ -z "$ETH_IF" ]; then
    echo "Error: Could not determine Ethernet interface."
    exit 1
fi

echo "Configuring iptables for NAT and traffic redirection..."

# Route traffic from Wi-Fi AP to Ethernet connection
sudo iptables -t nat -A POSTROUTING -o $ETH_IF -j MASQUERADE

# Redirect HTTP traffic to MITMProxy
sudo iptables -t nat -A PREROUTING -i $WLAN_IF -p tcp --dport 80 -j REDIRECT --to-port 8080

# Save iptables rules
sudo netfilter-persistent save

echo "Creating and starting MITMProxy systemd service..."

# Create MITMProxy systemd service
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
