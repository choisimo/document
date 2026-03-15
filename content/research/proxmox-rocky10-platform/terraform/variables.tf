variable "proxmox_endpoint" {
  description = "Proxmox API endpoint, e.g. https://pve.example.com:8006"
  type        = string
}

variable "proxmox_api_token" {
  description = "Proxmox API token, e.g. terraform@pve!automation=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  type        = string
  sensitive   = true
}

variable "proxmox_insecure" {
  description = "Allow insecure TLS for self-signed Proxmox certificates"
  type        = bool
  default     = true
}

variable "proxmox_node_name" {
  description = "Target Proxmox node name"
  type        = string
}

variable "vm_datastore" {
  description = "Datastore for VM disks"
  type        = string
  default     = "local-lvm"
}

variable "file_datastore" {
  description = "Datastore for downloaded cloud image files"
  type        = string
  default     = "local"
}

variable "cloudinit_datastore" {
  description = "Datastore for cloud-init disk"
  type        = string
  default     = "local-lvm"
}

variable "rocky_image_url" {
  description = "Rocky Linux 10 GenericCloud qcow2 URL"
  type        = string
  default     = "https://dl.rockylinux.org/pub/rocky/10/images/x86_64/Rocky-10-GenericCloud-Base.latest.x86_64.qcow2"
}

variable "rocky_image_file_name" {
  description = "Imported file name in Proxmox datastore"
  type        = string
  default     = "rocky10-genericcloud-base.qcow2"
}

variable "template_name" {
  description = "Base template name"
  type        = string
  default     = "rocky10-template"
}

variable "template_vm_id" {
  description = "Base template VM ID"
  type        = number
  default     = 9000
}

variable "template_disk_size_gb" {
  description = "Base template disk size"
  type        = number
  default     = 20
}

variable "network_bridge" {
  description = "Proxmox bridge to attach NIC"
  type        = string
  default     = "vmbr0"
}

variable "network_vlan_id" {
  description = "Optional VLAN ID"
  type        = number
  default     = null
}

variable "ipv4_cidr" {
  description = "IPv4 CIDR prefix length"
  type        = number
  default     = 24
}

variable "ipv4_gateway" {
  description = "IPv4 gateway"
  type        = string
}

variable "dns_servers" {
  description = "DNS servers"
  type        = list(string)
  default     = ["1.1.1.1", "8.8.8.8"]
}

variable "dns_domain" {
  description = "DNS search domain"
  type        = string
  default     = "lab.local"
}

variable "vm_default_user" {
  description = "Default cloud-init user"
  type        = string
  default     = "nodove"
}

variable "vm_default_password" {
  description = "Optional cloud-init password for the default user"
  type        = string
  default     = null
  sensitive   = true
}

variable "vm_authorized_keys" {
  description = "SSH public keys applied via cloud-init"
  type        = list(string)
}

variable "vm_definitions" {
  description = "Per-VM configuration map for 8 instances"
  type = map(object({
    vm_id        = number
    role         = string
    ipv4_address = string
    cpu_cores    = number
    memory_mb    = number
    disk_gb      = number
    tags         = list(string)
  }))

  validation {
    condition = alltrue([
      for vm in values(var.vm_definitions) :
      contains(["infra_core", "infra_minio", "infra_headscale", "app"], vm.role)
    ])
    error_message = "vm_definitions[*].role must be one of: infra_core, infra_minio, infra_headscale, app."
  }
}
