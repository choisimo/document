# Using Raspberry Pi or NanoPi NEO3 as a Quorum Device for Proxmox Clusters

## 1. Title
Using Raspberry Pi or NanoPi NEO3 as a Quorum Device (QDevice) for Proxmox Cluster

## 2. Device
- Raspberry Pi (any model with Ethernet connectivity)
- NanoPi NEO3 (with its 1Gbps Ethernet port)

## 3. Summary of Method
You can connect a Raspberry Pi or NanoPi NEO3 to a Proxmox cluster as a quorum device (QDevice) without installing Proxmox on the device itself. This configuration allows you to achieve High Availability (HA) with only two Proxmox nodes instead of the typically required three nodes. The Pi device runs a minimal Debian-based system with the corosync-qnetd package to act as a quorum server, providing the additional "vote" needed for cluster decisions when a node fails.

## 4. Code
### For Raspberry Pi:
```bash
# On the Raspberry Pi
sudo apt update
sudo apt install corosync-qnetd
sudo nano /etc/ssh/sshd_config
# Set PermitRootLogin yes
sudo systemctl restart ssh
sudo passwd root

# On each Proxmox node
apt install corosync-qdevice
pvecm qdevice setup  -f
```

### For NanoPi NEO3:
```bash
# On the NanoPi NEO3
sudo apt update
sudo apt install corosync-qnetd
sudo nano /etc/ssh/sshd_config
# Set PermitRootLogin yes
sudo systemctl restart ssh
sudo passwd root

# On each Proxmox node
apt install corosync-qdevice
pvecm qdevice setup  -f
```

## 5. Network Setting Detail
- The Raspberry Pi/NanoPi NEO3 must have a **static IP address** on the same network as the Proxmox cluster nodes.
- Ensure all nodes can connect to each other via UDP ports 5405-5412 for corosync.
- SSH access (TCP port 22) must be enabled from Proxmox nodes to the Pi device.
- It's recommended to place the quorum device on a reliable network segment, as it will be critical for cluster decisions.
- For security reasons, consider creating a dedicated VLAN for cluster communication.

## 6. Detailed Explanation

### Purpose of a Quorum Device
In Proxmox clusters, an odd number of votes is required to maintain quorum and prevent "split-brain" scenarios where the cluster divides into independent parts. A quorum device provides an additional vote without requiring a full Proxmox node.

### Setup Process

1. **Prepare the Pi device:**
   - Install a basic Debian distribution on your Raspberry Pi or NanoPi NEO3
   - Configure a static IP address through your router or the device's network configuration
   - Install the corosync-qnetd package which provides quorum device functionality
   - Enable root SSH access (temporarily required for Proxmox to configure the device)
   - Set a secure root password

2. **Configure Proxmox cluster:**
   - First create your Proxmox cluster with at least two nodes
   - Install the corosync-qdevice package on all Proxmox nodes
   - Use the `pvecm qdevice setup` command to integrate the Pi device as a quorum server
   - The Proxmox cluster will automatically copy SSH keys to the quorum device

3. **Verify the configuration:**
   - Run `pvecm status` on any Proxmox node to confirm the quorum device is properly connected
   - Test failover scenarios to ensure the cluster maintains quorum when a node fails

4. **Security considerations:**
   - After setup, consider disabling root SSH access and implementing key-based authentication
   - Place the quorum device on a secure, isolated network
   - Ensure the Pi device receives regular security updates

### Advantages
- Allows achieving HA with only two Proxmox nodes + one inexpensive Pi device
- Much lower cost than adding a third full Proxmox node
- Low power consumption
- Simple setup and maintenance

## 7. Possibility
True. This is a fully supported and documented method for extending Proxmox clusters. The QuorumPi project specifically provides ready-to-deploy images for Raspberry Pi, and the same technique works for NanoPi NEO3 using a standard Debian installation with the required packages.

While NanoPi NEO3 isn't specifically mentioned in Proxmox documentation, it meets all the requirements for a quorum device: it runs Debian-based systems, has reliable network connectivity, and supports the required packages. Its powerful quad-core ARM processor (RK3328) and gigabit Ethernet make it even more suitable for this task than some Raspberry Pi models.
