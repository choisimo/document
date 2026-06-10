# Terraform 기본 설정

이 문서는 Terraform을 처음 실행할 때 필요한 프로젝트 구조, provider 초기화, plan/apply/destroy 흐름, state 관리 원칙을 정리한다. 목표는 “HCL 파일을 쓰면 인프라가 생긴다”가 아니라 “Terraform이 state와 provider API를 기준으로 변경 계획을 계산한다”는 점을 이해하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

인프라를 콘솔에서 수동으로 만들면 누가 무엇을 바꿨는지 추적하기 어렵다. 같은 환경을 다시 만들기도 어렵고, 실수로 삭제하거나 열어둔 보안 규칙을 발견하기도 어렵다.

Terraform은 원하는 상태를 코드로 선언하고, 실제 상태와 비교한 실행 계획을 만든다. 이 장점은 state를 안전하게 관리하고 `plan`을 검토할 때만 유지된다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 Terraform 설치, `local_file` 예제, `init`, `plan`, `apply`, `destroy` 흐름을 소개한다. 보완해야 할 점은 다음과 같다.

- 특정 과거 Terraform binary 버전을 고정해 설치한다.
- state 파일의 민감도와 협업 위험을 충분히 강조하지 않는다.
- provider version pinning과 lock file의 의미가 약하다.
- `local_file` 예제의 한계가 드러나지 않는다.
- 다음 단계 링크가 repository에 없는 문서를 가리킨다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 작업을 안전하게 수행하는 것이다.

- Terraform project의 기본 파일을 구성한다.
- provider를 명시하고 version 범위를 고정한다.
- `terraform init`, `fmt`, `validate`, `plan`, `apply`, `destroy` 흐름을 실행한다.
- state가 무엇을 추적하는지 확인한다.
- 민감 값과 state 파일을 Git에 넣지 않는다.
- cloud 실습 전 비용과 삭제 절차를 확인한다.

## 4. 시스템 번역 (Data Flow)

Terraform 실행 흐름은 다음과 같다.

```text
HCL configuration
  -> terraform init downloads providers
  -> terraform validate checks syntax and provider schema
  -> terraform plan compares config, state, and real objects
  -> terraform apply calls provider APIs
  -> terraform state records resource bindings
  -> future plan detects drift or config changes
```

Terraform은 “현재 파일만” 보고 판단하지 않는다. configuration, state, provider가 읽은 실제 remote object를 함께 비교한다.

## 5. 핵심 구성요소 (Building Blocks)

Provider는 AWS, local file, Kubernetes 같은 외부 API와 통신하는 plugin이다. `required_providers`에서 source와 version constraint를 선언한다.

Resource는 Terraform이 생성, 수정, 삭제할 대상이다. 예를 들어 `local_file`은 local filesystem에 파일을 만든다.

Data source는 기존 대상의 정보를 읽는다. Terraform이 소유하지 않는 값을 참조할 때 사용한다.

Variable은 입력 계약이다. type, default, validation을 붙일수록 실수 가능성이 줄어든다.

Output은 apply 후 외부에 보여줄 값이다. 민감 값은 `sensitive = true`로 표시해도 state에는 남을 수 있다.

State는 Terraform resource address와 실제 object ID를 연결하는 운영 자산이다. local state는 간단하지만 협업과 보안에 약하다.

Lock file은 `.terraform.lock.hcl`이며 provider checksum과 선택된 version을 기록한다. 재현 가능한 실행에 필요하다.

## 6. 상태 전이 (State Transition)

프로젝트는 다음 상태로 진행한다.

```text
empty directory
  -> HCL files written
  -> terraform init
  -> terraform fmt
  -> terraform validate
  -> terraform plan
  -> terraform apply
  -> state updated
  -> terraform destroy
```

변경이 생기면 같은 흐름을 반복한다.

```text
config changed
  -> plan reviewed
  -> apply approved
  -> state refreshed
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- `terraform plan`을 보지 않고 `apply`하지 않는다.
- `terraform.tfstate`, `terraform.tfstate.backup`, `*.tfvars`의 민감 값은 Git에 넣지 않는다.
- provider version constraint를 둔다.
- `.terraform.lock.hcl`은 팀에서 같은 provider build를 쓰기 위해 보관한다.
- state 파일을 직접 편집하지 않는다.
- 같은 state에 대해 동시에 apply하지 않는다.
- `terraform destroy`는 관리 중인 모든 리소스를 삭제할 수 있으므로 대상과 workspace를 확인한다.
- `-target`은 복구나 예외 상황에서만 제한적으로 사용한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

빈 디렉터리에 다음 파일을 둔다.

```text
terraform-local-lab/
  main.tf
  variables.tf
  outputs.tf
  .gitignore
```

`.gitignore`는 local state와 provider cache를 제외한다.

```gitignore
.terraform/
*.tfstate
*.tfstate.*
*.tfvars
```

`main.tf`는 provider와 local file resource를 선언한다.

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

resource "local_file" "hello" {
  filename = "${path.module}/out/hello.txt"
  content  = var.message
}
```

`variables.tf`는 입력 값을 정의한다.

```hcl
variable "message" {
  description = "Content written by Terraform"
  type        = string
  default     = "Hello, Terraform"
}
```

`outputs.tf`는 결과를 노출한다.

```hcl
output "file_path" {
  description = "Generated file path"
  value       = local_file.hello.filename
}
```

실행 순서는 다음과 같다.

```bash
terraform init
terraform fmt -check
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
terraform state list
terraform show
```

생성된 파일을 확인한다.

```bash
cat out/hello.txt
terraform output file_path
```

정리한다.

```bash
terraform destroy
```

입력 값을 바꾸고 싶으면 command line variable을 사용한다.

```bash
terraform plan -var='message=Changed by plan' -out=tfplan
terraform apply tfplan
```

## 9. 실패 사례 (What could go wrong?)

`terraform init`이 실패하면 provider registry 접근, proxy, version constraint 충돌을 확인한다.

`terraform validate`는 구문과 schema를 확인하지만 cloud 권한이나 quota를 완전히 검증하지 않는다. 실제 변경 위험은 `plan`과 provider API 응답에서 드러난다.

State를 잃어버리면 Terraform이 이미 존재하는 리소스를 모를 수 있다. cloud 리소스에서는 중복 생성이나 import 작업이 필요해질 수 있다.

Local state를 여러 사람이 공유 파일처럼 쓰면 동시 apply로 손상될 수 있다. 협업 환경에서는 locking이 있는 remote backend를 사용한다.

`local_file`은 새 machine에서 파일이 없으면 다시 만들 계획을 낼 수 있다. local filesystem resource는 학습에는 좋지만 협업 인프라 모델로는 한계가 있다.

민감 값을 output으로 노출하거나 tfvars에 평문 저장하면 state와 shell history에 남을 수 있다.

## 10. 뇌 확장하기 (Evolution & Variants)

단일 사용자 실습은 local state로 충분하다. 팀 협업에서는 HCP Terraform, S3 backend, Consul backend처럼 state locking과 접근 제어가 있는 backend를 검토한다.

Module은 반복되는 인프라 구성을 재사용하기 위한 단위다. 처음부터 module을 과하게 나누기보다 resource 계약이 안정된 뒤 분리하는 편이 좋다.

Workspace는 같은 configuration으로 여러 state를 다룰 수 있지만, 환경 분리의 전부는 아니다. production과 development는 계정, backend, 권한 경계를 함께 설계해야 한다.

공식 문서는 설치 방법과 CLI 동작을 계속 갱신한다.

- Terraform CLI 설치: <https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli>
- Terraform state: <https://developer.hashicorp.com/terraform/language/state>
- `local_file` resource: <https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] `terraform version`이 실행된다.
- [ ] `required_providers`에 source와 version constraint가 있다.
- [ ] `.terraform.lock.hcl`의 역할을 이해한다.
- [ ] `terraform init`, `fmt`, `validate`, `plan`, `apply`를 순서대로 실행했다.
- [ ] state가 어떤 resource address를 추적하는지 확인했다.
- [ ] state와 tfvars 민감 값을 Git에 넣지 않는다.
- [ ] `destroy`가 삭제할 대상을 확인했다.
- [ ] 다음 cloud 실습 전 비용과 권한 경계를 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Terraform은 HCL 파일을 provider API와 state에 대조해 변경 계획을 계산하는 도구다. 안전한 사용의 핵심은 provider pinning, plan 검토, state 보호, apply 후 정리 절차다.
