# Terraform AWS EC2 실습

이 문서는 Terraform으로 AWS VPC, public subnet, security group, EC2 web server를 만드는 최소 실습을 정리한다. 실제 AWS 리소스를 생성하므로 권한, 비용, SSH 노출 범위, 삭제 절차를 먼저 확인해야 한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

로컬 `local_file` 실습은 Terraform workflow를 익히기에는 충분하지만, cloud provider에서 생기는 권한, quota, 네트워크, 과금 문제를 보여주지 않는다. EC2 하나를 만들더라도 VPC, subnet, route, security group, key pair, AMI, user data가 함께 맞아야 한다.

수동 콘솔로 리소스를 만들면 정리 누락과 설정 drift가 생기기 쉽다. Terraform 실습은 작은 리소스라도 plan, apply, verify, destroy 흐름을 끝까지 반복하는 데 의미가 있다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 VPC, internet gateway, subnet, route table, security group, Ubuntu AMI, EC2, output을 한 번에 구성한다. 보완해야 할 점은 다음과 같다.

- SSH 허용 기본값이 `0.0.0.0/0`로 열려 있다.
- AWS provider 구성이 오래된 5.x 예제에 머문다.
- security group inline rule과 별도 rule resource의 차이를 설명하지 않는다.
- AMI 자동 조회가 instance replacement를 유발할 수 있다는 점이 약하다.
- 비용과 `destroy` 확인 절차가 문서 후반에만 나온다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태를 검증하는 것이다.

- AWS credential이 Terraform에서 사용할 수 있다.
- Terraform AWS provider가 명시된 version 범위로 초기화된다.
- VPC, public subnet, internet route가 생성된다.
- SSH는 내 공인 IP CIDR에서만 허용된다.
- HTTP는 실습 확인을 위해 public access를 허용한다.
- EC2가 user data로 Nginx를 설치하고 응답한다.
- 실습 후 `terraform destroy`로 비용 리소스를 제거한다.

## 4. 시스템 번역 (Data Flow)

실행 흐름은 다음과 같다.

```text
Terraform HCL
  -> AWS provider reads credentials
  -> plan builds resource graph
  -> VPC and network resources created
  -> security group rules created
  -> EC2 instance launched with user data
  -> output exposes URL and SSH command
  -> destroy removes managed resources
```

EC2 instance만 단독으로 존재하지 않는다. 인터넷에서 접근하려면 public subnet, route table, internet gateway, public IP, security group ingress가 모두 맞아야 한다.

## 5. 핵심 구성요소 (Building Blocks)

AWS provider는 AWS API와 통신한다. 2026년 현재 Terraform Registry의 AWS provider 최신 major는 6.x 계열이므로 예제는 `~> 6.0` 범위를 사용한다.

VPC는 네트워크 경계다. 이 실습은 `10.0.0.0/16` 하나만 사용한다.

Public subnet은 internet gateway로 가는 기본 route가 있고 instance에 public IP를 부여한다.

Security group은 instance 방화벽 역할을 한다. 최신 AWS provider 문서는 `aws_vpc_security_group_ingress_rule`, `aws_vpc_security_group_egress_rule`을 별도 리소스로 관리하는 방식을 권장한다.

AMI data source는 조건에 맞는 최신 image를 조회한다. 편하지만 새 AMI가 나오면 다음 plan에서 instance 교체가 제안될 수 있다.

User data는 instance 첫 부팅 때 실행되는 bootstrap script다. 실패 여부는 cloud-init log와 web 응답으로 확인한다.

State는 AWS resource ID와 Terraform address를 연결한다. EC2 public IP, security group ID, VPC ID 같은 값이 state에 남는다.

## 6. 상태 전이 (State Transition)

실습 상태는 다음과 같이 진행한다.

```text
AWS credentials ready
  -> key pair ready
  -> terraform init
  -> terraform plan
  -> terraform apply
  -> EC2 running
  -> HTTP verified
  -> optional SSH verified
  -> terraform destroy
```

장애가 발생하면 아래 순서로 좁힌다.

```text
apply failed
  -> credential and IAM check
  -> quota and region check
  -> VPC or subnet dependency check
  -> security group rule check
  -> instance system log and cloud-init check
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- AWS access key와 secret key를 문서나 Git에 쓰지 않는다.
- SSH ingress를 `0.0.0.0/0`로 열지 않는다.
- `terraform plan`에서 생성, 교체, 삭제 대상을 확인한 뒤 apply한다.
- 실습 계정, region, key pair 이름을 apply 전에 확인한다.
- 실습 후 반드시 `terraform destroy`를 실행하거나 리소스 생존 이유를 기록한다.
- State 파일을 public 저장소에 올리지 않는다.
- Security group inline rule과 별도 rule resource를 섞지 않는다.
- AMI 자동 조회를 production release pinning 대체물로 사용하지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

AWS CLI credential이 동작하는지 먼저 확인한다.

```bash
aws sts get-caller-identity
aws configure get region
```

SSH key pair는 AWS에 미리 있어야 한다. 새 실습용 key pair를 CLI로 만들려면 다음처럼 생성한다.

```bash
aws ec2 create-key-pair --key-name tf-web-lab --query 'KeyMaterial' --output text > ~/.ssh/tf-web-lab.pem
chmod 400 ~/.ssh/tf-web-lab.pem
```

`variables.tf`를 작성한다.

```hcl
variable "aws_region" {
  description = "AWS region for the lab"
  type        = string
  default     = "ap-northeast-2"
}

variable "project" {
  description = "Name prefix for lab resources"
  type        = string
  default     = "tf-web-lab"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Existing AWS EC2 key pair name"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "Single trusted CIDR allowed to reach SSH"
  type        = string

  validation {
    condition     = can(cidrhost(var.allowed_ssh_cidr, 0))
    error_message = "allowed_ssh_cidr must be a valid CIDR, for example 203.0.113.10/32."
  }
}
```

`main.tf`를 작성한다.

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
      Purpose   = "lab"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project}-igw"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project}-public-a"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project}-public-rt"
  }
}

resource "aws_route" "internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "web" {
  name        = "${var.project}-web-sg"
  description = "Web lab security group"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${var.project}-web-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "ssh" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = var.allowed_ssh_cidr
  from_port         = 22
  ip_protocol       = "tcp"
  to_port           = 22
  description       = "SSH from trusted operator IP"
}

resource "aws_vpc_security_group_ingress_rule" "http" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  ip_protocol       = "tcp"
  to_port           = 80
  description       = "HTTP for lab verification"
}

resource "aws_vpc_security_group_egress_rule" "all_ipv4" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Outbound internet access for package installation"
}

resource "aws_instance" "web" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  key_name                    = var.key_name
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.web.id]
  associate_public_ip_address = true
  user_data_replace_on_change = true

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    encrypted   = true
    volume_size = 8
    volume_type = "gp3"
  }

  user_data = <<-EOT
#!/bin/bash
set -eux
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx
printf '%s\n' 'Hello from Terraform EC2 lab' > /var/www/html/index.html
systemctl enable --now nginx
EOT

  tags = {
    Name = "${var.project}-web"
  }

  depends_on = [aws_route_table_association.public]
}
```

`outputs.tf`를 작성한다.

```hcl
output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.web.id
}

output "public_ip" {
  description = "EC2 public IPv4 address"
  value       = aws_instance.web.public_ip
}

output "web_url" {
  description = "HTTP endpoint"
  value       = "http://${aws_instance.web.public_ip}"
}

output "ssh_command" {
  description = "Example SSH command"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ubuntu@${aws_instance.web.public_ip}"
}
```

내 공인 IP만 SSH에 허용하도록 `terraform.tfvars`를 만든다.

```bash
MY_IP="$(curl -4 https://checkip.amazonaws.com | tr -d '\n')"
cat > terraform.tfvars <<EOF
aws_region       = "ap-northeast-2"
project          = "tf-web-lab"
instance_type    = "t3.micro"
key_name         = "tf-web-lab"
allowed_ssh_cidr = "${MY_IP}/32"
EOF
```

실행한다.

```bash
terraform init
terraform fmt -check
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

응답을 확인한다.

```bash
terraform output web_url
curl "$(terraform output -raw web_url)"
ssh -i ~/.ssh/tf-web-lab.pem ubuntu@"$(terraform output -raw public_ip)"
```

실습을 끝내면 삭제한다.

```bash
terraform destroy
```

## 9. 실패 사례 (What could go wrong?)

`UnauthorizedOperation`은 IAM 권한이 부족하다는 뜻이다. EC2, VPC, security group, route table, key pair, AMI 조회 권한을 확인한다.

`InvalidKeyPair.NotFound`는 `key_name`이 해당 region에 없을 때 발생한다. Key pair는 region별 리소스다.

SSH timeout은 security group CIDR, public IP 부여, route table, local 방화벽, key file 권한을 순서대로 확인한다.

HTTP가 열리지 않으면 user data 실패를 의심한다. SSH 접속 후 `/var/log/cloud-init-output.log`, `systemctl status nginx`를 확인한다.

`VpcLimitExceeded`나 subnet quota 오류는 실습 region에 이미 리소스가 많다는 뜻이다. 쓰지 않는 VPC를 정리하거나 quota를 확인한다.

AMI data source가 새 image를 선택하면 다음 plan에서 instance 교체가 나타날 수 있다. production에서는 AMI ID를 release artifact로 pin하거나 별도 image pipeline을 둔다.

`terraform destroy`를 잊으면 instance, EBS volume, public IPv4, data transfer 등 비용이 계속 발생할 수 있다.

## 10. 뇌 확장하기 (Evolution & Variants)

이 예제는 단일 public EC2 web server다. 운영 구조로 확장하려면 private subnet, load balancer, autoscaling group, managed certificate, log collection, patching, backup, SSM Session Manager를 검토한다.

보안그룹 규칙은 inline block 대신 별도 `aws_vpc_security_group_ingress_rule`과 `aws_vpc_security_group_egress_rule`로 관리했다. AWS provider 문서는 이 방식을 현재 권장하고, 두 방식을 섞으면 rule 충돌과 반복 diff가 생길 수 있다고 설명한다.

Terraform state에는 민감한 운영 정보가 남을 수 있다. 협업과 production에서는 locking, encryption, access control이 있는 remote backend가 필요하다.

- AWS provider 문서: <https://registry.terraform.io/providers/hashicorp/aws/latest/docs>
- EC2 instance resource: <https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance>
- VPC security group ingress rule: <https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] AWS CLI credential과 region이 올바르다.
- [ ] Key pair가 실습 region에 존재한다.
- [ ] SSH CIDR이 내 공인 IP `/32`로 제한되어 있다.
- [ ] `terraform init`, `fmt`, `validate`, `plan`을 통과했다.
- [ ] Plan에서 생성되는 리소스와 비용 경계를 확인했다.
- [ ] HTTP 응답과 필요 시 SSH 접속을 확인했다.
- [ ] user data 실패 시 cloud-init log 위치를 알고 있다.
- [ ] 실습 후 `terraform destroy`를 실행했다.
- [ ] AWS 콘솔에서 남은 VPC, EC2, EBS, public IP 리소스를 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Terraform EC2 실습의 핵심은 instance 하나가 아니라 credential, network, security group, AMI, user data, state, destroy가 하나의 변경 계약으로 묶인다는 점이다. Cloud 실습은 apply보다 cleanup을 먼저 설계해야 한다.
