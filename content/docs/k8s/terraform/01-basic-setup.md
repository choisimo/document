# Terraform 기본 설정

## 실습 범위와 상태 계약

- 이 문서는 로컬 파일 provider로 Terraform workflow를 익히는 범위입니다. 클라우드 계정·조직의 운영 IaC 정책은 별도입니다.
- Terraform CLI와 provider 버전을 제약 파일과 lock file로 고정하고 배포 파일의 checksum을 확인합니다.
- state에는 리소스 식별자와 민감 값이 포함될 수 있습니다. 저장 위치, 암호화, 잠금, 접근 권한과 백업 소유자를 정합니다.
- 적용 완료는 `apply` 종료가 아니라 state와 실제 대상 일치, 산출물 확인, 재계획 시 예상치 못한 diff 부재와 destroy/rollback 결과입니다.

## 📖 개요

Terraform은 HashiCorp Configuration Language(HCL)을 사용하여 인프라를 코드로 정의하는 IaC 도구입니다.

## 🎯 학습 목표

- Terraform 설치 및 기본 구조 이해
- 첫 번째 리소스 생성
- Terraform 워크플로우 (init, plan, apply, destroy) 실습

## 📦 설치

### Linux/macOS
```bash
# 예제 고정 버전: 프로젝트 요구 버전과 checksum을 별도로 확인
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# 설치 확인
terraform --version
```

### Windows (Chocolatey)
```powershell
choco install terraform
```

## 🏗️ 기본 구조

Terraform 프로젝트의 기본 구조:

```
project/
├── main.tf          # 주요 리소스 정의
├── variables.tf     # 변수 선언
├── outputs.tf       # 출력 값 정의
├── terraform.tfvars # 변수 값 설정
└── .terraform/      # 플러그인 및 상태 (자동 생성)
```

## 📝 첫 번째 예제: 로컬 파일 생성

### Step 1: main.tf 작성

`examples/01-local-file/main.tf` 파일 생성:

```hcl
# Terraform 버전 및 프로바이더 설정
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

# 로컬 파일 리소스 생성
resource "local_file" "hello" {
  filename = "${path.module}/hello.txt"
  content  = "Hello, Terraform!"
}

# 여러 파일 생성 (count 사용)
resource "local_file" "multiple" {
  count    = 3
  filename = "${path.module}/file-${count.index}.txt"
  content  = "This is file number ${count.index}"
}
```

### Step 2: Terraform 초기화

```bash
cd examples/01-local-file
terraform init
```

**출력 예시:**
```
Initializing the backend...
Initializing provider plugins...
- Finding hashicorp/local versions matching "~> 2.0"...
- Installing hashicorp/local v2.4.0...

Terraform has been successfully initialized!
```

### Step 3: 실행 계획 확인

```bash
terraform plan
```

**출력 분석:**
```
Terraform will perform the following actions:

  # local_file.hello will be created
  + resource "local_file" "hello" {
      + content              = "Hello, Terraform!"
      + filename             = "./hello.txt"
      + id                   = (known after apply)
    }

  # local_file.multiple[0] will be created
  ...

Plan: 4 to add, 0 to change, 0 to destroy.
```

### Step 4: 리소스 생성

```bash
terraform apply
```

프롬프트에 `yes` 입력하면 파일이 생성됩니다.

### Step 5: 상태 확인

```bash
# 생성된 리소스 확인
terraform show

# 특정 리소스 상세 정보
terraform state list
terraform state show local_file.hello
```

### Step 6: 리소스 삭제

```bash
terraform destroy
```

## 🔍 핵심 개념

### 1. Provider (프로바이더)

Terraform이 인프라와 상호작용하는 플러그인입니다.

```hcl
# AWS 프로바이더 예시
provider "aws" {
  region = "us-east-1"
}

# Azure 프로바이더 예시
provider "azurerm" {
  features {}
}
```

### 2. Resource (리소스)

생성하고 관리할 인프라 구성 요소입니다.

```hcl
resource "리소스타입" "리소스이름" {
  # 설정 인자들
  argument1 = "value1"
  argument2 = "value2"
}
```

### 3. Data Source (데이터 소스)

기존 리소스의 정보를 읽어옵니다.

```hcl
data "local_file" "existing" {
  filename = "/path/to/existing/file.txt"
}

output "file_content" {
  value = data.local_file.existing.content
}
```

## 🔄 Terraform 워크플로우

```
1. Write (작성)
   ↓
2. terraform init (초기화)
   ↓
3. terraform plan (계획)
   ↓
4. terraform apply (적용)
   ↓
5. terraform destroy (삭제)
```

### 각 단계 설명

| 명령어 | 설명 | 언제 사용? |
|--------|------|------------|
| `terraform init` | 프로바이더 다운로드, 백엔드 초기화 | 프로젝트 시작 시, 프로바이더 추가 시 |
| `terraform plan` | 변경 사항 미리보기 (실제 변경 X) | 적용 전 검증 |
| `terraform apply` | 실제 리소스 생성/수정/삭제 | 인프라 변경 시 |
| `terraform destroy` | 선택한 구성·state가 관리하는 삭제 가능 리소스 계획 | 대상 state와 보존 리소스를 확인한 테스트 환경 정리 시 |
| `terraform fmt` | 코드 포맷팅 | 코드 정리 |
| `terraform validate` | 구문 검증 | 오류 체크 |

## 💡 실습 과제

### 과제 1: 디렉토리 구조 생성

다음 구조의 디렉토리를 생성하는 Terraform 코드를 작성하세요:

```
output/
├── logs/
│   ├── app.log
│   └── error.log
└── data/
    └── config.json
```

**힌트:**
```hcl
resource "local_file" "app_log" {
  filename = "${path.module}/output/logs/app.log"
  content  = "Application started at ${timestamp()}"
}
```

### 과제 2: 변수 사용하기

파일 내용을 변수로 받아 생성하는 코드를 작성하세요.

```hcl
variable "file_content" {
  description = "Content of the file"
  type        = string
  default     = "Default content"
}

resource "local_file" "dynamic" {
  filename = "${path.module}/dynamic.txt"
  content  = var.file_content
}
```

실행:
```bash
terraform apply -var="file_content=Custom message"
```

## 🐛 트러블슈팅

### 문제 1: "terraform: command not found"
**해결:** PATH에 terraform 바이너리 추가
```bash
echo 'export PATH=$PATH:/usr/local/bin' >> ~/.bashrc
source ~/.bashrc
```

### 문제 2: Provider initialization failed
**해결:** 인터넷 연결 확인 후 다시 init
```bash
rm -rf .terraform
terraform init
```

### 문제 3: State lock 에러
**해결:** 잠금 파일 제거 (주의: 다른 프로세스가 실행 중이 아닐 때만)
```bash
terraform force-unlock <LOCK_ID>
```

## 📚 다음 단계

- [AWS EC2 실습 예제](02-aws-ec2-example.md)
- [상태 관리와 모듈화](03-state-management.md)

## 🔗 참고 자료

- [Terraform 공식 문서](https://developer.hashicorp.com/terraform/docs)
- [Terraform Registry](https://registry.terraform.io/)
- [HCL 문법 가이드](https://developer.hashicorp.com/terraform/language/syntax)
