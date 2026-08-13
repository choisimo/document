# Proxmox Disk Passthrough

> Pass physical disks directly to Proxmox VMs

---

## Scope, Ownership, and Verification

- **Scope:** Pin the Proxmox VE, QEMU and guest versions, host storage stack, disk transport, controller type, firmware, and the exact stable device identity. This guide covers block-device attachment, not every form of PCI or controller passthrough.
- **Ownership assumptions:** A disk assigned for guest writes must not also be mounted or written by the host or another guest. Define backup ownership, SMART monitoring, cache and discard policy, and behavior when the device disappears.
- **Facts and inference:** `by-id` links, QEMU configuration and guest-visible identifiers are evidence; performance or compatibility rankings require the target filesystem and workload.
- **Failure and completion:** Test wrong-device selection, reboot renumbering, I/O error, guest crash, host migration, backup exclusion and rollback. Completion requires matched serials, exclusive ownership, intact data after reboot, and a documented detach or recovery path.

---

## Overview

Raw block-device attachment lets a VM access a host disk through the configured QEMU controller without a Proxmox-managed virtual volume; QEMU, host block and device layers still participate. Useful for:

- NAS/storage VMs
- Database servers requiring direct disk access
- Hardware RAID controllers

---

## Prerequisites

- Proxmox VE installed
- Physical disk(s) to passthrough
- VM already created

---

## Step-by-Step Guide

### 1. Identify Disk by ID

```bash
# List disks with persistent device IDs
lsblk | awk 'NR==1{print $0" DEVICE-ID(S)"}NR>1{dev=$1;printf $0" ";system("find /dev/disk/by-id -lname \"*"dev"\" -printf \" %p\"");print "";}' | grep -v -E 'part|lvm'
```

**Example output:**
```
NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS DEVICE-ID(S)
sda      8:0    0 931.5G  0 disk              /dev/disk/by-id/ata-WDC_WD10EZEX-00WN4A0_WD-WMC4T0123456
sdb      8:16   0   1.8T  0 disk              /dev/disk/by-id/ata-ST2000DM008-2FR102_ZFL12345
```

> **Important:** Prefer a verified unique persistent identifier such as `/dev/disk/by-id/` in persistent VM configuration. Do not rely on `/dev/sdX`, which can change after reboot; multipath and duplicate identifiers require their own stable mapping.

### 2. Passthrough to VM

```bash
# Syntax
qm set <vm-id> -<interface><number> /dev/disk/by-id/<disk-id>

# Examples
qm set 100 -sata0 /dev/disk/by-id/ata-WDC_WD10EZEX-00WN4A0_WD-WMC4T0123456
qm set 100 -scsi1 /dev/disk/by-id/ata-ST2000DM008-2FR102_ZFL12345
qm set 100 -virtio2 /dev/disk/by-id/nvme-Samsung_SSD_970_EVO_Plus_S4EVNX0N123456
```

### 3. Verify Configuration

```bash
# Check VM config
qm config 100 | grep -E "sata|scsi|virtio"
```

---

## Interface Types

| Interface | Use Case | Performance |
|-----------|----------|-------------|
| `virtio` | Linux guests with matching drivers | Often low overhead; benchmark against virtio-scsi when SCSI features, discard, queues or migration matter |
| `scsi` | General purpose | Good |
| `sata` | Compatibility | Moderate |
| `ide` | Legacy systems | Slowest |

---

## Advanced Options

### Add with Serial Number

```bash
qm set 100 -sata0 /dev/disk/by-id/ata-WDC_WD10EZEX,serial=WD-WMC4T0123456
```

### Multiple Disks (for RAID)

```bash
# Pass multiple disks for software RAID in VM
qm set 100 -sata0 /dev/disk/by-id/ata-disk1
qm set 100 -sata1 /dev/disk/by-id/ata-disk2
qm set 100 -sata2 /dev/disk/by-id/ata-disk3
```

### Remove Passthrough

```bash
qm set 100 -delete sata0
```

---

## GUI Method

1. Select VM → **Hardware**
2. **Add** → **Hard Disk**
3. Select **Use existing disk**
4. Enter path: `/dev/disk/by-id/ata-...`

---

## Troubleshooting

### Disk Not Visible in VM

```bash
# Check disk permissions
ls -la /dev/disk/by-id/ata-*

# Ensure no other process is using the disk
lsof /dev/sdX
```

### Performance Issues

- Use `virtio` interface when possible
- Enable `discard` for SSDs
- Check disk queue settings

---

## Related Documentation

- [Proxmox Cluster Setup](../../infrastructure/proxmox/cluster.md)
- [VM Migration](migration.md)
