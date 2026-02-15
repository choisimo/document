output "vm_inventory" {
  description = "Map for inventory rendering"
  value = {
    for vm_name, vm in var.vm_definitions : vm_name => {
      role = vm.role
      ip   = vm.ipv4_address
      vmid = vm.vm_id
    }
  }
}

output "ansible_inventory_yaml" {
  description = "Rendered Ansible inventory"
  value = templatefile("${path.module}/templates/ansible-inventory.tftpl", {
    vm_definitions = var.vm_definitions
  })
}

output "service_endpoints" {
  description = "Service endpoint hints"
  value = {
    consul = try(
      "http://${one([for _, vm in var.vm_definitions : vm.ipv4_address if vm.role == "infra_core"])}:8500",
      null
    )
    vault = try(
      "http://${one([for _, vm in var.vm_definitions : vm.ipv4_address if vm.role == "infra_core"])}:8200",
      null
    )
    nginx = try(
      "http://${one([for _, vm in var.vm_definitions : vm.ipv4_address if vm.role == "infra_core"])}:80",
      null
    )
    minio_api = try(
      "http://${one([for _, vm in var.vm_definitions : vm.ipv4_address if vm.role == "infra_minio"])}:9000",
      null
    )
    minio_ui = try(
      "http://${one([for _, vm in var.vm_definitions : vm.ipv4_address if vm.role == "infra_minio"])}:9001",
      null
    )
    headscale = try(
      "http://${one([for _, vm in var.vm_definitions : vm.ipv4_address if vm.role == "infra_headscale"])}:8080",
      null
    )
  }
}
