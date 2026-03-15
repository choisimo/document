resource "proxmox_virtual_environment_download_file" "rocky10_cloud_image" {
  content_type        = "import"
  datastore_id        = var.file_datastore
  node_name           = var.proxmox_node_name
  url                 = var.rocky_image_url
  file_name           = var.rocky_image_file_name
  overwrite           = true
  overwrite_unmanaged = true
}

resource "proxmox_virtual_environment_vm" "rocky10_template" {
  name        = var.template_name
  description = "Rocky 10 cloud-init template managed by Terraform"
  tags        = ["terraform", "rocky10", "template"]

  node_name = var.proxmox_node_name
  vm_id     = var.template_vm_id
  template  = true
  started   = false

  agent {
    enabled = true
  }

  cpu {
    cores = 2
    type  = "x86-64-v2-AES"
  }

  memory {
    dedicated = 2048
  }

  disk {
    datastore_id = var.vm_datastore
    import_from  = proxmox_virtual_environment_download_file.rocky10_cloud_image.id
    interface    = "scsi0"
    size         = var.template_disk_size_gb
    discard      = "on"
    ssd          = true
    iothread     = true
  }

  initialization {
    datastore_id = var.cloudinit_datastore
    interface    = "ide2"

    dns {
      servers = var.dns_servers
      domain  = var.dns_domain
    }

    ip_config {
      ipv4 {
        address = "dhcp"
      }
    }

    user_account {
      username = var.vm_default_user
      keys     = var.vm_authorized_keys
      password = var.vm_default_password
    }
  }

  network_device {
    bridge  = var.network_bridge
    model   = "virtio"
    vlan_id = var.network_vlan_id
  }

  operating_system {
    type = "l26"
  }

  serial_device {}

  boot_order = ["scsi0"]

  cdrom {
    file_id = "none"
  }
}

resource "proxmox_virtual_environment_vm" "nodes" {
  for_each = var.vm_definitions

  name        = each.key
  description = "${each.value.role} managed by Terraform"
  tags        = concat(["terraform", "rocky10", each.value.role], each.value.tags)

  node_name = var.proxmox_node_name
  vm_id     = each.value.vm_id
  on_boot   = true
  started   = true

  clone {
    vm_id   = proxmox_virtual_environment_vm.rocky10_template.id
    full    = true
    retries = 3
  }

  agent {
    enabled = true

    wait_for_ip {
      ipv4 = true
    }
  }

  cpu {
    cores = each.value.cpu_cores
    type  = "x86-64-v2-AES"
  }

  memory {
    dedicated = each.value.memory_mb
  }

  disk {
    datastore_id = var.vm_datastore
    interface    = "scsi0"
    size         = each.value.disk_gb
    discard      = "on"
    ssd          = true
    iothread     = true
  }

  initialization {
    datastore_id = var.cloudinit_datastore
    interface    = "ide2"

    dns {
      servers = var.dns_servers
      domain  = var.dns_domain
    }

    ip_config {
      ipv4 {
        address = "${each.value.ipv4_address}/${var.ipv4_cidr}"
        gateway = var.ipv4_gateway
      }
    }

    user_account {
      username = var.vm_default_user
      keys     = var.vm_authorized_keys
      password = var.vm_default_password
    }
  }

  network_device {
    bridge  = var.network_bridge
    model   = "virtio"
    vlan_id = var.network_vlan_id
  }

  operating_system {
    type = "l26"
  }

  serial_device {}

  boot_order = ["scsi0"]

  cdrom {
    file_id = "none"
  }

  depends_on = [proxmox_virtual_environment_vm.rocky10_template]
}
