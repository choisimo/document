# Using Raspberry Pi or NanoPi NEO3 as a Quorum Device for Proxmox Clusters

> Scope: an existing healthy two-node Proxmox VE cluster with a supported Corosync QDevice/QNetd combination. Record exact Proxmox VE, Corosync, Debian, architecture, and package versions. A QDevice arbitrates quorum; it does not provide spare compute, storage durability, fencing, or a complete HA design.

## 1. Title
Using Raspberry Pi or NanoPi NEO3 as a Quorum Device (QDevice) for Proxmox Cluster

## 2. Device
- Raspberry Pi (any model with Ethernet connectivity)
- NanoPi NEO3 (with its 1Gbps Ethernet port)

## 3. Summary of Method
A compatible Debian host running `corosync-qnetd` can provide external arbitration without running Proxmox VE. In a supported two-node topology it can help one surviving node retain quorum in specific failures. Workload availability still depends on watchdog/fencing, storage, partition direction, and remaining capacity.

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

# Install the client package on every Proxmox node
apt install corosync-qdevice

# Run setup once from one cluster node
pvecm qdevice setup <QNETD_IP>
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

# Install the client package on every Proxmox node
apt install corosync-qdevice

# Run setup once from one cluster node
pvecm qdevice setup <QNETD_IP>
```

## 5. Network Setting Detail
- The Raspberry Pi/NanoPi NEO3 must have a **static IP address** on the same network as the Proxmox cluster nodes.
- Ensure all nodes can connect to each other via UDP ports 5405-5412 for corosync.
- SSH access (TCP port 22) must be enabled from Proxmox nodes to the Pi device.
- It's recommended to place the quorum device on a reliable network segment, as it will be critical for cluster decisions.
- For security reasons, consider creating a dedicated VLAN for cluster communication.

## 6. Detailed Explanation

### Purpose of a Quorum Device
Corosync quorum requires a majority of configured votes. An odd total reduces ties but is not a universal requirement, and a QDevice cannot prevent failures outside its configured fault model.

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

## 7. Support boundary and completion evidence

An unlisted SBC or community image is not Proxmox-supported without an exact vendor source for the deployed version. Completion requires `pvecm status` on every node to show intended expected votes, quorum, and QDevice connectivity, plus clean client/QNetd logs. In a maintenance window test QNetd loss, one-node loss with QNetd reachable, and relevant partitions while verifying fencing. If observed behavior differs, remove the QDevice through `pvecm qdevice remove` and restore prior firewall and SSH policy.
