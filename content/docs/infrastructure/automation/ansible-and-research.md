---
title: 저장소 Ansible과 연구 자동화 실행 경계
description: 실제 playbook 진입점과 연구 스크립트의 변경 범위, 검증 단계, 복구 전제를 구분합니다.
---

# 저장소 Ansible과 연구 자동화 실행 경계

이 저장소에는 일반 Ansible 설정과 별도의 Terraform·Ansible 연구 템플릿이 있다. 파일이 존재한다는 것은 배포가 완료됐다는 뜻이 아니다. 실제 inventory, 변수, 실행 이력은 공개 문서에 복사하지 않는다.

## 일반 Ansible 진입점

`infra/ansible/playbooks/site.yml`은 `webservers.yml`, `dbservers.yml`, `infrastructures.yml`을 가져온다. 각 playbook이 `common`, `nginx`, `database`, `docker`, `fileserver` 등의 역할을 선택한다. 루트의 `infra/ansible/site.yml`을 가정하지 않는다.

`infra/ansible/ansible.cfg`에는 상대 inventory·roles 경로, 권한 상승 설정과 호스트 키 검사 비활성 설정이 있다. README의 예시 트리를 실행 목록으로 사용하지 말고 실제 config를 읽는다. 대상 호스트 신뢰를 확인할 때에는 검증한 known-hosts와 명시적 inventory를 사용한다.

다음은 **검토용 명령 형태**다. `<REVIEWED_INVENTORY>`는 권한과 공개 범위를 확인한 별도 파일로 바꾼다. 출력에도 주소·변수가 포함될 수 있으므로 공개 로그로 저장하지 않는다.

```bash
cd infra/ansible
ANSIBLE_HOST_KEY_CHECKING=True ansible-inventory -i '<REVIEWED_INVENTORY>' --graph
ANSIBLE_HOST_KEY_CHECKING=True ansible-playbook -i '<REVIEWED_INVENTORY>' playbooks/site.yml --syntax-check
```

구문 검사 후에만 제한된 실험 대상에서 check mode·diff를 검토한다. check mode도 모든 module의 실행이나 외부 부작용을 예측하지는 못하며 diff에는 민감한 값이 나올 수 있다. 실제 적용 전에는 콘솔 복구 경로, 기존 설정, 데이터 백업, 중단 담당자를 정한다.

## 연구 파이프라인의 별도 계약

`content/research/proxmox-rocky10-platform/`은 운영 검증 전 연구 자료다. 여기의 일반적인 자동화 단계만 공개 문서로 복구하며, 호스트 배치·계정·주소·운영 변수는 옮기지 않는다.

| 소스 | 코드에서 확인한 동작 | 실행 전 확인 |
| --- | --- | --- |
| `scripts/run_terraform.sh` | init, fmt, validate 뒤 **apply** 실행 | plan 전용 wrapper가 아님. state·변수·provider·이미지 확인 |
| `scripts/generate_inventory.sh` | Terraform output을 inventory 파일에 덮어씀 | 기존 inventory 보존, 출력 검토 |
| `scripts/run_ansible_site.sh` | collection 설치 후 site playbook 실행 | 의존 버전과 선택 inventory 확인 |
| `scripts/full_pipeline.sh` | 위 단계와 비밀 초기화 단계를 순차 실행 | 일부 성공 후 실패할 수 있음. 일괄 재실행 금지 |
| `scripts/deploy_project.sh` | 프로젝트 식별자를 받아 배포 playbook 호출 | 자격증명의 명령 인자 노출과 대상 프로젝트 확인 |

연구의 `terraform/main.tf`는 이미지·템플릿·VM 자원을 선언하고 `outputs.tf`는 inventory 정보를 만든다. 이 output은 관측된 서비스 건강 상태가 아니다. `project_deploy/tasks/main.yml`은 외부 설정 조회, 저장소 checkout, `.env` 생성, Compose pull·up을 수행한다. `.env` 생성에 `no_log`가 있어도 모든 이전 단계와 프로세스 인자가 보호된다고 결론 내리지 않는다.

## 장애와 복구

실패한 단계, 이미 생성된 자원, state의 실제 내용을 구분한다. Terraform state를 과거 사본으로 단순 교체하거나 pipeline 전체를 다시 실행하기 전에 실제 자원과 비교한다. 애플리케이션은 이전 이미지·설정과 호환되는 데이터 복원 절차가 필요하다.

완료 기록에는 적용한 revision, 선택 대상, plan 또는 diff, 변경 결과, 서비스의 대표 요청, 재시작 후 데이터 보존, 복구 시험을 남긴다. 이 페이지를 작성하면서 인프라 적용이나 외부 연결 시험은 수행하지 않았다.

근거: `infra/ansible/ansible.cfg`, `infra/ansible/playbooks/*.yml`; 연구 경로의 `README.md`, `RESEARCH_SOURCES.md`, 위 스크립트 및 Terraform 파일, `ansible/roles/project_deploy/tasks/main.yml`. 기초 문법은 [Ansible 학습 가이드](../../k8s/ansible/01-installation-setup.md).
