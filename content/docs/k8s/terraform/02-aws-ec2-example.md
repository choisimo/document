# Terraform AWS EC2 실습

## 비용·권한·정리 경계

- 이 실습은 실제 AWS 비용과 quota를 사용합니다. 별도 sandbox 계정, 예산 알림, owner/expiry 태그와 실행 종료 시각을 먼저 정합니다.
- 장기 access key를 코드·`tfvars`·셸 기록에 저장하지 말고 SSO 또는 단기 role 자격 증명과 최소 권한을 사용합니다.
- provider와 module 버전, 원격 state 암호화·잠금, AMI와 region을 고정합니다. 예제 기본값이 현재 Free Tier임을 가정하지 않습니다.
- 완료 기준은 plan 승인, 제한된 source IP의 SSH/HTTP, 인스턴스 초기화 로그, `destroy` 후 EC2·EBS·EIP·VPC와 비용 잔여 확인입니다.

## 📖 개요

실제 클라우드 리소스를 Terraform으로 프로비저닝하는 실습입니다. AWS EC2 인스턴스, VPC, Security Group을 생성합니다.

## 🎯 학습 목표

- AWS Provider 설정
- VPC 및 네트워크 리소스 생성
- EC2 인스턴스 배포
- SSH 접속 및 관리

## 🔐 사전 준비

### AWS 계정 설정

1. **AWS CLI 설치**
```bash
# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 설치 확인
aws --version
```

2. **AWS 자격증명 설정**
```bash
aws configure
```

입력 정보:
```
AWS Access Key ID: YOUR_ACCESS_KEY
AWS Secret Access Key: YOUR_SECRET_KEY
Default region name: ap-northeast-2  # 서울 리전
Default output format: json
```

## 📝 프로젝트 구조

```
02-aws-ec2/
├── main.tf           # 주요 리소스
├── variables.tf      # 변수 정의
├── outputs.tf        # 출력 값
├── terraform.tfvars  # 변수 값
└── userdata.sh       # 인스턴스 초기화 스크립트
```

## 🏗️ 실습: 웹 서버 배포

### Step 1: variables.tf 작성

```hcl
variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "instance_type" {
  description = "EC2 인스턴스 타입"
  type        = string
  default     = "t2.micro"  # 예시일 뿐이며 계정·리전의 현재 가격과 지원 여부 확인
}

variable "instance_name" {
  description = "EC2 인스턴스 이름"
  type        = string
  default     = "terraform-web-server"
}

variable "allowed_ssh_ips" {
  description = "SSH 접속 허용 IP (CIDR)"
  type        = list(string)
  default     = []  # terraform.tfvars에서 승인된 클라이언트 공인 IP /32만 지정
}

variable "key_name" {
  description = "SSH 키 페어 이름"
  type        = string
}
```

### Step 2: main.tf 작성

```hcl
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. VPC 생성
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "terraform-vpc"
  }
}

# 2. 인터넷 게이트웨이
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "terraform-igw"
  }
}

# 3. 서브넷 (Public)
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "terraform-public-subnet"
  }
}

# 4. 라우팅 테이블
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "terraform-public-rt"
  }
}

# 5. 라우팅 테이블 연결
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# 6. Security Group
resource "aws_security_group" "web" {
  name        = "terraform-web-sg"
  description = "Security group for web server"
  vpc_id      = aws_vpc.main.id

  # SSH 접속 허용
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_ips
  }

  # HTTP 허용
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # 모든 아웃바운드 허용
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "terraform-web-sg"
  }
}

# 7. 최신 Ubuntu AMI 조회 (데이터 소스)
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 8. EC2 인스턴스
resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]

  # User Data: 인스턴스 시작 시 실행될 스크립트
  user_data = <<-EOF
              #!/bin/bash
              apt-get update
              apt-get install -y nginx
              echo "<h1>Hello from Terraform!</h1>" > /var/www/html/index.html
              systemctl start nginx
              systemctl enable nginx
              EOF

  tags = {
    Name = var.instance_name
  }
}
```

### Step 3: outputs.tf 작성

```hcl
output "instance_id" {
  description = "EC2 인스턴스 ID"
  value       = aws_instance.web.id
}

output "instance_public_ip" {
  description = "EC2 인스턴스 공인 IP"
  value       = aws_instance.web.public_ip
}

output "instance_public_dns" {
  description = "EC2 인스턴스 공인 DNS"
  value       = aws_instance.web.public_dns
}

output "web_url" {
  description = "웹 서버 URL"
  value       = "http://${aws_instance.web.public_ip}"
}

output "ssh_command" {
  description = "SSH 접속 명령어"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ubuntu@${aws_instance.web.public_ip}"
}
```

### Step 4: terraform.tfvars 작성

```hcl
aws_region     = "ap-northeast-2"
instance_type  = "t2.micro"
instance_name  = "my-web-server"
key_name       = "my-key-pair"  # AWS에 미리 생성된 키 페어 이름
```

## 🚀 배포 실행

### 1. SSH 키 페어 생성 (AWS Console에서)

AWS Console → EC2 → Key Pairs → Create key pair
- Name: my-key-pair
- Type: RSA
- Format: .pem
- 다운로드 후 `~/.ssh/` 디렉토리에 저장

```bash
chmod 400 ~/.ssh/my-key-pair.pem
```

### 2. Terraform 실행

```bash
# 초기화
terraform init

# 계획 확인
terraform plan

# 적용
terraform apply
```

### 3. 출력 확인

```bash
terraform output

# 출력 예시:
# instance_id = "i-0abcd1234efgh5678"
# instance_public_ip = "3.35.123.45"
# web_url = "http://3.35.123.45"
# ssh_command = "ssh -i ~/.ssh/my-key-pair.pem ubuntu@3.35.123.45"
```

### 4. 웹 서버 접속 확인

```bash
# 브라우저에서 접속
curl http://$(terraform output -raw instance_public_ip)

# 또는 브라우저에서 직접 IP 입력
```

### 5. SSH 접속

```bash
ssh -i ~/.ssh/my-key-pair.pem ubuntu@$(terraform output -raw instance_public_ip)
```

## 🔍 리소스 간 종속성

Terraform은 자동으로 리소스 간 종속성을 파악합니다:

```
VPC → Internet Gateway → Subnet
                       ↓
Security Group ← EC2 Instance → Route Table
```

명시적 종속성이 필요한 경우:
```hcl
resource "aws_instance" "web" {
  # ...
  depends_on = [aws_internet_gateway.main]
}
```

## 💡 고급 패턴

### 1. 여러 인스턴스 생성 (count)

```hcl
resource "aws_instance" "web_servers" {
  count = 3

  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  # ...

  tags = {
    Name = "web-server-${count.index}"
  }
}

output "all_instance_ips" {
  value = aws_instance.web_servers[*].public_ip
}
```

### 2. 조건부 리소스 생성

```hcl
variable "create_instance" {
  type    = bool
  default = true
}

resource "aws_instance" "web" {
  count = var.create_instance ? 1 : 0
  # ...
}
```

### 3. 동적 블록 (Security Group 규칙)

```hcl
variable "ingress_ports" {
  type    = list(number)
  default = [22, 80, 443]
}

resource "aws_security_group" "web" {
  name   = "dynamic-sg"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.ingress_ports
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}
```

## 🔄 인프라 업데이트

### 인스턴스 타입 변경

```hcl
# terraform.tfvars
instance_type = "t3.small"
```

```bash
terraform plan   # 변경 사항 확인
terraform apply  # 적용 (인스턴스 재시작 필요)
```

### 태그 추가

```hcl
resource "aws_instance" "web" {
  # ...
  tags = {
    Name        = var.instance_name
    Environment = "development"
    ManagedBy   = "terraform"
  }
}
```

## 🧹 리소스 정리

**중요**: AWS는 실행 시간에 따라 과금되므로 테스트 후 반드시 삭제하세요!

```bash
terraform destroy
```

특정 리소스만 삭제:
```bash
terraform destroy -target=aws_instance.web
```

## 💰 비용 최적화 팁

1. **프리티어 활용**: t2.micro 인스턴스는 월 750시간 무료
2. **불필요한 리소스 즉시 삭제**: `terraform destroy`
3. **비용 알림 설정**: AWS Budgets 활용
4. **리전 선택**: 서울(ap-northeast-2)이 도쿄보다 저렴

## 🐛 트러블슈팅

### 문제 1: "Error launching source instance: InvalidKeyPair.NotFound"
**원인**: 지정한 키 페어가 AWS에 없음
**해결**: AWS Console에서 키 페어 생성 후 이름 확인

### 문제 2: "Error creating VPC: VpcLimitExceeded"
**원인**: VPC 개수 제한 초과
**해결**: 사용하지 않는 VPC 삭제

### 문제 3: SSH 접속 시 "Connection refused"
**원인**: Security Group 규칙 미설정 또는 잘못된 IP
**해결**: 
```bash
# 현재 공인 IP 확인
curl ifconfig.me

# Security Group에서 해당 IP 허용 확인
```

### 문제 4: "UnauthorizedOperation"
**원인**: IAM 권한 부족
**해결**: IAM 사용자에게 EC2FullAccess 권한 부여

## 📚 다음 단계

- [상태 관리와 모듈화](03-state-management.md)
- [변수와 출력](04-variables-outputs.md)

## 🔗 참고 자료

- [AWS Provider 문서](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [EC2 인스턴스 타입](https://aws.amazon.com/ec2/instance-types/)
- [AWS 프리티어](https://aws.amazon.com/free/)
