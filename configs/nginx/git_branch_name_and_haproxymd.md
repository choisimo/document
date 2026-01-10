
# GitHub 원격 저장소와 로컬 브랜치 이름 불일치 해결 방법

GitHub에서 로컬 브랜치와 원격 브랜치의 이름이 일치하지 않으면 push할 때마다 새로운 브랜치가 생성되는 문제가 발생할 수 있습니다. 이 문제를 해결하고 일관성을 유지하기 위한 여러 방법을 알아보겠습니다.

## 업스트림 브랜치 설정하기

로컬 브랜치와 원격 브랜치를 명시적으로 연결하면 이름이 달라도 올바른 위치로 push할 수 있습니다.

### 기존 브랜치 연결하기

```bash
git branch --set-upstream-to=origin/원격브랜치명 로컬브랜치명
```

예를 들어, 로컬 브랜치 이름이 'feature'이고 원격 브랜치 이름이 'new-feature'인 경우:

```bash
git branch --set-upstream-to=origin/new-feature feature
```

이 명령어를 실행하면 로컬 브랜치 'feature'가 원격 브랜치 'new-feature'를 추적하게 됩니다[^1_8].

## 브랜치 이름 일치시키기

문제의 근본 원인인 이름 불일치를 해결하는 방법입니다.

### 로컬 브랜치 이름 변경하기

```bash
git branch -m 기존브랜치명 바꿀이름
```

원격 브랜치와 동일한 이름으로 변경하여 일관성을 유지할 수 있습니다[^1_10].

## 명시적 Push 방법 사용하기

매번 push할 때 명시적으로 원격 브랜치를 지정할 수 있습니다.

```bash
git push origin 로컬브랜치명:원격브랜치명
```

이 방법은 한 번만 사용하는 경우에 적합하며, 매번 긴 명령어를 입력해야 하는 단점이 있습니다[^1_10].

## Git 설정 변경하기

### 자동 업스트림 설정 활성화 (Git 2.37 이상)

```bash
git config --global push.autoSetupRemote true
```

이 설정을 활성화하면 처음 push할 때 자동으로 upstream 브랜치를 설정해줍니다. 이후부터는 단순히 `git push`만 실행해도 올바른 원격 브랜치로 push됩니다[^1_6].

### push.default 설정 변경하기

```bash
git config --global push.default current
```

이 설정은 로컬 브랜치 이름과 일치하는 원격 브랜치로 push하도록 합니다[^1_20].

## 첫 Push시 업스트림 설정하기

처음 원격 저장소에 push할 때 -u 옵션을 사용하면 이후 push는 간단해집니다.

```bash
git push -u origin 원격브랜치명
```

이 명령어는 현재 로컬 브랜치를 원격 브랜치와 연결하고 push합니다. 이후부터는 간단히 `git push`만 실행하면 됩니다[^1_19].

## branch.autoSetupMerge 설정하기

새 브랜치를 만들 때 자동으로 추적 관계를 설정하도록 구성할 수 있습니다.

```bash
git config --global branch.autoSetupMerge always
```

이 설정을 활성화하면 `git checkout -b` 또는 `git switch -c`로 새 브랜치를 만들 때 자동으로 추적 관계가 설정됩니다[^1_20].

## 결론

원격 브랜치와 로컬 브랜치의 이름 불일치 문제는 위의 방법들을 통해 해결할 수 있습니다. 가장 권장되는 방법은:

1. 브랜치 이름을 일치시키거나
2. 업스트림 브랜치를 명시적으로 설정하거나
3. Git 2.37 이상을 사용 중이라면 `push.autoSetupRemote true` 설정을 활성화하는 것입니다

개인 작업 방식에 따라 가장 적합한 방법을 선택하시기 바랍니다.

<div style="text-align: center">⁂</div>

[^1_1]: https://www.semanticscholar.org/paper/22ddc3bea0d4ee3d2466695a5c8282ae4282e0fa

[^1_2]: https://www.reddit.com/r/git/comments/1j2kpsb/how_to_know_what_remote_upstream_is_set_to/

[^1_3]: https://www.reddit.com/r/git/comments/34dnwh/git_push_without_params_says_everything_uptodate/

[^1_4]: https://www.reddit.com/r/git/comments/aim6wu/i_just_renamed_a_remote_repo_what_do_i_do_in_my/

[^1_5]: https://young-niii.tistory.com/37

[^1_6]: https://countryxide.tistory.com/187

[^1_7]: https://www.semanticscholar.org/paper/eb0ce1415ea8183ee7742a46e55291d1b32dc5ff

[^1_8]: https://stackoverflow.com/questions/520650/make-an-existing-git-branch-track-a-remote-branch

[^1_9]: https://hbase.tistory.com/58

[^1_10]: https://happy-hessut.tistory.com/76

[^1_11]: https://www.semanticscholar.org/paper/c28b7587e12675bc23349d5f95cc7e6afadef6fa

[^1_12]: https://www.semanticscholar.org/paper/2396ef35f24bb1b96c557a2b40dbc2c3a4550ae8

[^1_13]: https://www.semanticscholar.org/paper/7bbb110b2a55d7577fa9f55e8b1bcb0f2d808b29

[^1_14]: https://www.semanticscholar.org/paper/f0b8bde642d42907908e51fb2bbb2c8e96810ee8

[^1_15]: https://www.reddit.com/r/git/comments/cby9ar/how_to_push_to_a_remote_without_changing_the/

[^1_16]: https://www.reddit.com/r/git/comments/mzowp3/a_question_about_pushing_changes_to_a_branch_in_a/

[^1_17]: https://www.reddit.com/r/git/comments/tehcut/will_git_push_update_all_branches_or_only_the/

[^1_18]: https://www.namehero.com/blog/how-to-use-git-to-push-to-a-different-remote-branch/

[^1_19]: https://www.theserverside.com/blog/Coffee-Talk-Java-News-Stories-and-Opinions/git-push-new-branch-remote-github-gitlab-upstream-example

[^1_20]: https://betterstack.com/community/questions/how-to-avoid-doing-set-upstream/

[^1_21]: https://www.semanticscholar.org/paper/20633d5b8cdf53eeaaa6299ff86ad2dd0b2cc01b

[^1_22]: https://www.semanticscholar.org/paper/41fbd91e5f74b475e53d015b0daca907274799a6

[^1_23]: https://www.semanticscholar.org/paper/71aa6f7ddb8781d7581243f6bb5762ddad2fb0e5

[^1_24]: https://www.semanticscholar.org/paper/e6f270937e497ad5117787ab1aecc15cd083a0fb

[^1_25]: https://www.reddit.com/r/git/comments/dh8rbp/noob_how_to_constantly_push_all_changes/

[^1_26]: https://www.reddit.com/r/git/comments/16l01s8/every_time_i_do_git_commit_my_remote_branch/

[^1_27]: https://www.reddit.com/r/git/comments/uln76l/is_it_bad_practice_to_push_a_feature_branch_to/

[^1_28]: https://www.reddit.com/r/ProgrammerTIL/comments/wqrf8f/set_up_git_to_create_upstream_branch_if_it_does/

[^1_29]: https://www.reddit.com/r/git/comments/vjh4pk/git_push_pushed_multiple_branches/

[^1_30]: https://www.reddit.com/r/git/comments/fqfhqk/how_to_change_the_master_branch/

[^1_31]: https://www.reddit.com/r/git/comments/10x3zz4/continue_a_remote_repo_locally_and_push_the_new/

[^1_32]: https://www.reddit.com/r/git/comments/15urmko/how_to_set_the_source_branch_from_checking_out/

[^1_33]: https://www.reddit.com/r/AskProgramming/comments/3vc32x/git_20_pushdefault_are_you_using_matching_or/

[^1_34]: https://www.reddit.com/r/git/comments/akw1qo/how_can_you_renameduplicate_a_branch_while/

[^1_35]: https://www.reddit.com/r/git/comments/rjv6dc/how_do_you_do_it_push_local_changes_to_remote_but/

[^1_36]: https://www.reddit.com/r/learnprogramming/comments/sqoja4/what_is_an_upstream_branch_in_git/

[^1_37]: https://www.reddit.com/r/git/comments/5iiv6q/branching_troubles_very_simple_question/

[^1_38]: https://www.reddit.com/r/git/comments/14ycnbx/is_it_acceptable_to_rename_a_git_branch_i_created/

[^1_39]: https://stackoverflow.com/questions/61115707/whats-the-best-strategy-when-pushing-branches-remotely-when-someone-else-alread

[^1_40]: https://oliverjam.es/articles/git-push-friendlier

[^1_41]: https://codingmax.net/courses/git-commands/section02/lec0004

[^1_42]: https://soft.plusblog.co.kr/40

[^1_43]: https://linuxize.com/post/how-to-rename-local-and-remote-git-branch/

[^1_44]: https://github.com/jesseduffield/lazygit/discussions/3865

[^1_45]: https://chinsun9.github.io/2021/09/17/git-branch-set-upstream-to/

[^1_46]: https://git-scm.com/docs/git-push

[^1_47]: https://www.freecodecamp.org/news/how-to-rename-a-local-or-remote-branch-in-git/

[^1_48]: https://dev.to/waylonwalker/configure-git-to-always-push-to-the-current-branch-3pc4

[^1_49]: https://juseong-tech.tistory.com/42

[^1_50]: https://velog.io/@leejh3224/팁-항상-현재-브랜치로-푸쉬하게끔-설정하기

[^1_51]: https://stackoverflow.com/questions/30590083/git-how-to-rename-a-branch-both-local-and-remote

[^1_52]: https://www.reddit.com/r/MB2Bannerlord/comments/gyy0im/mod_monday/

[^1_53]: https://www.reddit.com/r/aerohive/comments/ubac99/configure_vlans_via_aeorhive_cli/

[^1_54]: https://sdardew-valley.tistory.com/169

[^1_55]: https://gwpaeng.tistory.com/311

[^1_56]: https://hbase.tistory.com/58

[^1_57]: https://stack-queue.tistory.com/148

[^1_58]: https://mylko72.gitbooks.io/git/content/remote/remote_sync.html

[^1_59]: https://velog.io/@beheon/GitHub-Branch-Protection

[^1_60]: https://hbase.tistory.com/11

[^1_61]: https://www.freecodecamp.org/korean/news/git-push-to-remote-branch/

[^1_62]: https://linux.systemv.pe.kr/devops/git-브랜치-목록-동기화/

[^1_63]: https://devye.tistory.com/104

[^1_64]: https://ssocoit.tistory.com/225

[^1_65]: https://dev-choi-myeong-baek.tistory.com/35

[^1_66]: https://www.semanticscholar.org/paper/afc82ad17bcc650e2390bb30cfd2a9f40397952b

[^1_67]: https://www.semanticscholar.org/paper/3eed7a451cd28cd544304e7787872896e4a0106c

[^1_68]: https://www.reddit.com/r/git/comments/14shmh/protip_performing_fastforward_merges_on_a_branch/

[^1_69]: https://www.reddit.com/r/git/comments/423j0t/help_with_fatal_bad_config_file_for_a_git_newbie/

[^1_70]: https://www.reddit.com/r/gitlab/comments/5kqkl0/gitlab_wants_me_to_force_push_to_all_my_repos/

[^1_71]: https://www.reddit.com/r/mac/comments/1b7z7vq/questions_and_confusions_for_mac_beginners/

[^1_72]: https://www.reddit.com/r/github/comments/18my4cn/git_push_fails_with_useless_error_message_when/

[^1_73]: https://www.reddit.com/r/github/comments/9nnpfq/what_is_the_point_of_github_desktop/

[^1_74]: https://www.reddit.com/r/git/comments/tehcut/will_git_push_update_all_branches_or_only_the/

[^1_75]: https://www.reddit.com/r/git/comments/1j2kpsb/how_to_know_what_remote_upstream_is_set_to/

[^1_76]: https://www.reddit.com/r/git/comments/1bdq249/im_so_confused_about_branches_and_getting_and/?tl=de

[^1_77]: https://www.reddit.com/r/git/comments/weiu52/git_237_comes_with_a_new_config_for_pushing_new/

[^1_78]: https://git-scm.com/docs/git-config

[^1_79]: https://git-scm.com/docs/git-branch

[^1_80]: https://gist.github.com/428461/4faa06c49b464545767a9a03e2d12f80a0c7b525

[^1_81]: https://zenn.dev/fruitriin/scraps/d9ae112ddc1f90

[^1_82]: https://rachelslab.tistory.com/88

[^1_83]: https://velog.io/@ansunny1170/git-push-u-없이-자동으로-upstream-설정하기

[^1_84]: https://qiita.com/okomeworld/items/4642b23adc86ee86d13e

[^1_85]: https://donggov.tistory.com/9

[^1_86]: https://git-scm.com/docs/git-branch/2.13.7

[^1_87]: https://velog.io/@bang9dev/Git-autoSetupRemote-설정하기

[^1_88]: https://betterstack.com/community/questions/how-to-avoid-doing-set-upstream/

[^1_89]: https://betterstack.com/community/questions/how-to-rename-a-branch/

[^1_90]: https://www.reddit.com/r/iOSProgramming/comments/1ctue1d/remote_branches_out_of_sync_in_xcode/

[^1_91]: https://www.reddit.com/r/IntelliJIDEA/comments/xzitbq/any_way_to_sync_projects_between_development/

[^1_92]: https://www.reddit.com/r/selfhosted/comments/thtv4s/help_with_gitea_ssh_access_via_nginxproxymanager/

[^1_93]: https://www.reddit.com/r/esp32/comments/l8sun9/esp32_dmx_library/

[^1_94]: https://www.reddit.com/r/rust/comments/r60fzb/m1_users_how_are_you_cross_compiling/

[^1_95]: https://www.reddit.com/r/MB2Bannerlord/comments/gujd3d/mod_monday/

[^1_96]: https://velog.io/@sunohvoiin/Git-로컬-저장소에-원격-브랜치-가져오기-Pull-a-remote-branch-into-local-repository

[^1_97]: https://mukma.tistory.com/136

[^1_98]: https://coding-gym.tistory.com/entry/Git-원격-저장소-브랜치-동기화

[^1_99]: https://kotlinworld.com/292

[^1_100]: https://www.semanticscholar.org/paper/079ba68db78bb3e46ac93d99a18eb016579d20f9

[^1_101]: https://www.semanticscholar.org/paper/02c439e829e31ed1bc246d2d5cf2ea3417711af5

[^1_102]: https://www.semanticscholar.org/paper/2f6ecccbd8ce180ba5a63b5001c025f7baa0edc8

[^1_103]: https://www.semanticscholar.org/paper/5a75363ba60e63f26d6523936c68244d62969465

[^1_104]: https://www.semanticscholar.org/paper/eaf9b2bbde15ebbb69d747bd5162e75d5098cf79

[^1_105]: https://www.semanticscholar.org/paper/d95a5342213db8003d9e764b962594e590d1e30f

[^1_106]: https://www.reddit.com/r/git/comments/1du9s7/took_a_deep_breath_and_set/

[^1_107]: https://www.reddit.com/r/git/comments/1biypzw/branch_changing_is_not_reflecting_changes_in_code/

[^1_108]: https://www.reddit.com/r/NixOS/comments/jg4i92/home_manager_and_git_config_order/

[^1_109]: https://www.reddit.com/r/git/comments/bv8rss/why_is_u_in_git_push_u_need_when_i_push_to_origin/

[^1_110]: https://www.reddit.com/r/git/comments/1hbytmd/git_forgets_the_origin_of_my_local_copy_of_a/

[^1_111]: https://www.reddit.com/r/git/comments/cby9ar/how_to_push_to_a_remote_without_changing_the/

[^1_112]: https://stackoverflow.com/questions/5480069/autosetuprebase-vs-autosetupmerge

[^1_113]: https://stackoverflow.com/questions/5480069/autosetuprebase-vs-autosetupmerge/22147540

[^1_114]: https://stackoverflow.com/questions/23918062/simple-vs-current-push-default-in-git-for-decentralized-workflow

[^1_115]: https://blog.dizy.dev/development/2023/05/30/git-remote-auto-setup/


---

# HAProxy를 이용한 SFTP 서버 아키텍처 구현 가이드

제공된 이미지에 나타난 시스템 아키텍처는 인터넷에서 최종 사용자 알림까지 이어지는 SFTP 서비스 흐름을 보여줍니다. 이러한 구성을 단계별로 구현하는 방법을 상세히 설명하겠습니다.

## 전체 시스템 아키텍처 개요

```
                        +-------------+
                        |   Internet  |
                        +------+------+
                               |
                               v
                        +------+------+
                        | Router(WAN) |
                        +------+------+
                               |
                               v
                        +------+------+
                        |   OPNsense  |
                        +------+------+
                               |
                               v
                        +------+------+
                        |   HAProxy   |
                        +------+------+
                               |
                               v
                      +--------+--------+
                      | Main SFTP Server|
                      +--------+--------+
                               |
                               | Clone
                               v
                      +--------+--------+
                      | Sub SFTP Server |
                      +--------+--------+
                               |
                               v
                      +--------+--------+
                      |Backup SFTP Server|
                      +--------+--------+
                               |
                               | Notification
                               v
                        +------+------+
                        | User Notice  |
                        +-------------+
```


## 1단계: OPNsense 및 HAProxy 설정

### OPNsense 구성

```
+----------------------------------+
|           OPNsense               |
|  +----------------------------+  |
|  |        Firewall Rule       |  |
|  | Allow TCP/22 (SFTP)        |  |
|  +----------------------------+  |
|  +----------------------------+  |
|  |      NAT Configuration     |  |
|  | WAN -&gt; HAProxy SFTP Port   |  |
|  +----------------------------+  |
+----------------------------------+
```


#### 구현 절차:

1. OPNsense 웹 인터페이스에 로그인
2. 방화벽 > 규칙 > WAN 으로 이동
3. SFTP 트래픽을 허용하는 규칙 추가:
```
Action: Pass
Interface: WAN
Protocol: TCP
Source: any
Destination: WAN address
Destination port: 22 (또는 사용자 지정 SFTP 포트)
```

4. NAT 설정 (시스템 > 설정 > NAT):
```
Interface: WAN
Protocol: TCP
Source: any
Destination port: SFTP 포트 (일반적으로 22)
Redirect target IP: HAProxy 서버 IP
Redirect target port: HAProxy 리스닝 포트
```


### HAProxy 구성

```
+----------------------------------+
|           HAProxy                |
|  +----------------------------+  |
|  |    TCP Mode Configuration  |  |
|  | Listener: 0.0.0.0:22       |  |
|  | Backend: SFTP Servers      |  |
|  +----------------------------+  |
|  +----------------------------+  |
|  |    SNI-based Routing      |  |
|  | (선택적 다중 SFTP 서버 라우팅) |  |
|  +----------------------------+  |
+----------------------------------+
```


#### 구현 절차:

1. HAProxy 설치:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install haproxy

# CentOS/RHEL
sudo yum install haproxy
```

2. HAProxy 구성 파일 (/etc/haproxy/haproxy.cfg) 설정:
```
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon
    maxconn 4096

defaults
    log     global
    mode    tcp
    option  tcplog
    timeout connect 5000
    timeout client  50000
    timeout server  50000

frontend sftp_front
    bind 0.0.0.0:22
    mode tcp
    default_backend sftp_servers

backend sftp_servers
    mode tcp
    balance roundrobin
    server main_sftp 192.168.1.100:22 check
```

3. 다중 SFTP 서버 라우팅을 위한 고급 설정 (선택사항):
```
# SSH 연결을 SSL로 래핑하여 SNI 활용
frontend sftp_front
    bind 0.0.0.0:22
    mode tcp
    
    # SSL 트래픽 감지 조건
    tcp-request inspect-delay 5s
    tcp-request content accept if { req.ssl_hello_type 1 }
    
    # 서버명에 따른 백엔드 선택
    use_backend sftp_server1 if { req.ssl_sni -i server1.example.com }
    use_backend sftp_server2 if { req.ssl_sni -i server2.example.com }
    default_backend sftp_servers

backend sftp_server1
    mode tcp
    server server1 192.168.1.101:22 check

backend sftp_server2
    mode tcp
    server server2 192.168.1.102:22 check
```


## 2단계: SFTP 서버 구성

### Main SFTP 서버 설정

```
+----------------------------------+
|        Main SFTP Server          |
|  +----------------------------+  |
|  |    OpenSSH Configuration   |  |
|  | Set up SFTP-only access    |  |
|  | Create dedicated SFTP user |  |
|  +----------------------------+  |
|  +----------------------------+  |
|  |    Directory Structure     |  |
|  | /sftp/uploads (권한 설정)   |  |
|  +----------------------------+  |
+----------------------------------+
```


#### 구현 절차:

1. OpenSSH 설치 및 설정:
```bash
# Ubuntu/Debian
sudo apt-get install openssh-server

# CentOS/RHEL
sudo yum install openssh-server
```

2. SFTP 그룹 및 사용자 생성:
```bash
# SFTP 그룹 생성
sudo groupadd sftp_users

# SFTP 사용자 생성
sudo useradd -m -g sftp_users -s /sbin/nologin sftp_user

# 사용자 비밀번호 설정
sudo passwd sftp_user
```

3. 디렉토리 구조 설정:
```bash
# SFTP 루트 디렉토리 생성
sudo mkdir -p /sftp/uploads

# 소유권 설정
sudo chown root:root /sftp
sudo chown sftp_user:sftp_users /sftp/uploads

# 권한 설정
sudo chmod 755 /sftp
sudo chmod 775 /sftp/uploads
```

4. SSH 데몬 설정 (/etc/ssh/sshd_config):
```
# SFTP 서브시스템 설정
Subsystem sftp internal-sftp

# SFTP 사용자 그룹에 대한 설정
Match Group sftp_users
    ChrootDirectory /sftp
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
```

5. SSH 서비스 재시작:
```bash
sudo systemctl restart sshd
```


## 3단계: 서버 간 복제 구성 (Main → Sub → Backup)

```
+----------------------------------+
|       서버 간 복제 시스템          |
|  +----------------------------+  |
|  |    lsyncd Configuration    |  |
|  | Main -&gt; Sub 실시간 복제     |  |
|  +----------------------------+  |
|  +----------------------------+  |
|  |    rsync Configuration     |  |
|  | Sub -&gt; Backup 백업 복제     |  |
|  +----------------------------+  |
+----------------------------------+
```


### Main → Sub 서버 실시간 복제 구현

1. lsyncd 설치:
```bash
# Ubuntu/Debian
sudo apt-get install lsyncd

# CentOS/RHEL
sudo yum install lsyncd
```

2. lsyncd 설정 파일 (/etc/lsyncd/lsyncd.conf.lua):
```lua
settings {
    logfile = "/var/log/lsyncd.log",
    statusFile = "/var/log/lsyncd-status.log"
}

sync {
    default.rsyncssh,
    source = "/sftp/uploads",
    host = "sub_sftp_server_ip",
    targetdir = "/sftp/uploads",
    rsync = {
        archive = true,
        perms = true,
        owner = true,
        _extra = {"-a"}
    },
    ssh = {
        port = 22
    },
    delay = 5,
    maxProcesses = 4
}
```

3. lsyncd 서비스 시작:
```bash
sudo systemctl enable lsyncd
sudo systemctl start lsyncd
```


### Sub → Backup 서버 정기 백업 구현

1. cron job을 이용한 rsync 설정:
```bash
# crontab -e 실행 후 다음 라인 추가
0 */2 * * * rsync -avz --delete /sftp/uploads/ backup_server_ip:/sftp/backup/ &gt;&gt; /var/log/backup.log 2&gt;&amp;1
```


## 4단계: 파일 업로드 감지 및 알림 시스템

```
+----------------------------------+
|       파일 업로드 감지 시스템       |
|  +----------------------------+  |
|  |    inotify Monitoring     |  |
|  | Upload 이벤트 감지          |  |
|  +----------------------------+  |
|  +----------------------------+  |
|  |    알림 스크립트            |  |
|  | 이메일/Slack 알림 전송      |  |
|  +----------------------------+  |
+----------------------------------+
```


### 구현 절차:

1. inotify-tools 설치:
```bash
# Ubuntu/Debian
sudo apt-get install inotify-tools

# CentOS/RHEL
sudo yum install inotify-tools
```

2. 파일 업로드 감지 및 알림 스크립트 작성 (/usr/local/bin/sftp-notify.sh):
```bash
#!/bin/bash

WATCH_DIR="/sftp/backup"
EMAIL="admin@example.com"
LOG_FILE="/var/log/sftp-notify.log"

# Slack 웹훅 URL (선택사항)
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/your/webhook/url"

inotifywait -m "$WATCH_DIR" -e close_write |
while read path action file; do
    echo "$(date): 파일 $file이 업로드되었습니다." &gt;&gt; "$LOG_FILE"
    
    # 이메일 알림
    echo "새 파일이 SFTP 서버에 업로드되었습니다: $file" | mail -s "SFTP 파일 알림" "$EMAIL"
    
    # Slack 알림 (선택사항)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"새 파일이 SFTP 서버에 업로드되었습니다: $file\"}" \
        "$SLACK_WEBHOOK_URL"
    fi
done
```

3. 스크립트 실행 권한 설정 및 서비스로 등록:
```bash
sudo chmod +x /usr/local/bin/sftp-notify.sh

# 시스템 서비스 생성 (/etc/systemd/system/sftp-notify.service)
cat &lt;&lt; EOF | sudo tee /etc/systemd/system/sftp-notify.service
[Unit]
Description=SFTP Upload Notification Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/sftp-notify.sh
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 서비스 활성화 및 시작
sudo systemctl enable sftp-notify.service
sudo systemctl start sftp-notify.service
```


## 통합 운영 고려사항

1. **보안 강화**:
    - 모든 서버에서 SSH 키 기반 인증 사용
    - 방화벽 규칙으로 IP 접근 제한
    - 정기적인 보안 업데이트 적용
2. **모니터링**:
    - HAProxy 상태 모니터링 설정
    - 서버 간 동기화 상태 확인 스크립트 구현
    - 시스템 리소스 사용량 모니터링
3. **고가용성**:
    - HAProxy 이중화 구성 고려
    - Main SFTP 서버 장애 시 Sub 서버로 자동 전환 메커니즘 구현
4. **성능 최적화**:
    - 대용량 파일 전송을 위한 버퍼 크기 조정
    - 동시 연결 수 제한 설정으로 리소스 보호

이 시스템은 HAProxy를 사용하여 SFTP 트래픽을 효율적으로 관리하고, 다중 서버 복제를 통해 데이터 안정성을 보장하며, 실시간 알림 기능으로 운영 효율성을 높일 수 있는 아키텍처입니다.

<div style="text-align: center">⁂</div>

[^2_1]: https://pplx-res.cloudinary.com/image/private/user_uploads/IhElEmeGgnObAjM/Notes_250429_003147.jpg

[^2_2]: https://www.reddit.com/r/haproxy/comments/1amy5cb/sftp_reverse_proxy/

[^2_3]: https://www.reddit.com/r/linuxadmin/comments/jc1lh7/how_to_setup_sshd_config_to_restrict_sftp_access/

[^2_4]: https://www.reddit.com/r/linuxadmin/comments/tnpk6n/what_is_the_best_open_source_software_to_move/

[^2_5]: https://www.reddit.com/r/CentOS/comments/j77llv/sftp_send_email_when_file_is_uploaded/

[^2_6]: https://www.semanticscholar.org/paper/99baa0190e856ae387d6aabfa050e74c67ea6ad2

[^2_7]: https://www.reddit.com/r/learnpython/comments/2auyvc/realtime_monitoring_of_an_ftp_server_for_new_files/

[^2_8]: https://www.reddit.com/r/OPNsenseFirewall/comments/gwedgk/haproxy_config_for_ssh_and_https/

[^2_9]: https://www.haproxy.com/blog/route-ssh-connections-with-haproxy

[^2_10]: https://www.reddit.com/r/selfhosted/comments/1cnnar6/how_to_reverse_proxy_non_http_traffic/

[^2_11]: https://www.ibm.com/docs/en/tnpm/1.4.5?topic=openssh-configuring-server-linux

[^2_12]: https://serverfault.com/questions/1057798/how-to-forward-new-files-from-an-sftp-server

[^2_13]: https://imyuvii.com/posts/watch-directory-file-creation-slack/

[^2_14]: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9469139/

[^2_15]: https://www.reddit.com/r/selfhosted/comments/14thm4r/haproxy_with_forward_auth_to_authentik/

[^2_16]: https://www.zentyal.com/news/how-to-set-up-an-sftp-server-on-linux/

[^2_17]: https://www.semanticscholar.org/paper/48bc7a950a7d6a5d80f5f00d6ec330ac3a6bdfde

[^2_18]: https://discourse.haproxy.org/t/not-working-in-tcp-mode/10039

[^2_19]: https://www.semanticscholar.org/paper/e31950a453b40d1fd9d6fbdab5971f629200fc41

[^2_20]: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/protocol-support/tcp/

[^2_21]: https://www.lucasrolff.com/ha/replication-using-lsyncd/

[^2_22]: https://www.reddit.com/r/linuxadmin/comments/45x1fm/sftp_reverse_proxying_relaying/

[^2_23]: https://www.reddit.com/r/PFSENSE/comments/w2nftd/ftp_through_haproxy/

[^2_24]: https://www.reddit.com/r/PFSENSE/comments/11ef38t/haproxy_ssl_offloading_backend_server_has_ssl/

[^2_25]: https://www.reddit.com/r/sysadmin/comments/136tdxf/ftp_with_openssh_note_not_sftp/

[^2_26]: https://www.reddit.com/r/linuxadmin/comments/9bvsgh/rsync_weird_behaviours/

[^2_27]: https://www.reddit.com/r/dotnet/comments/18q0ajr/how_to_implement_a_sftp_file_subscriber_or/

[^2_28]: https://www.reddit.com/r/sysadmin/comments/11dgwf0/looking_for_sftp_recommendations/

[^2_29]: https://www.reddit.com/r/linuxquestions/comments/vp7rj/openssh_as_sftp_server_eli5/

[^2_30]: https://www.reddit.com/r/devops/comments/aqvnt1/the_devops_or_just_a_nice_way_to_mirror_two_sftp/

[^2_31]: https://www.reddit.com/r/sysadmin/comments/14k7oox/question_need_help_setting_up_a_trigger_for_task/

[^2_32]: https://www.reddit.com/r/sysadmin/comments/uj53f5/sftp_server/

[^2_33]: https://www.reddit.com/r/sysadmin/comments/mvmpno/sftp_server_on_windows_server_2019_how/

[^2_34]: https://www.reddit.com/r/linuxadmin/comments/3csgd1/set_a_cronjob_to_rsync_a_directory_every_hour_how/

[^2_35]: https://www.reddit.com/r/unRAID/comments/167ys40/notification_if_there_is_a_new_file_on_your_nas/

[^2_36]: https://serverfault.com/questions/753336/sftp-configuration-through-haproxy-loadbalancing

[^2_37]: https://forums.lawrencesystems.com/t/how-to-use-haproxy-for-sftp-mailservers-is-it-possible/17389

[^2_38]: https://discourse.haproxy.org/t/slow-speed-when-using-sftp-client-through-ha-proxy/11471

[^2_39]: https://unix.stackexchange.com/questions/350374/unidirectional-syncing-replicate-large-file-incrementally

[^2_40]: https://www.clariontech.com/blog/all-you-need-to-know-about-inotify

[^2_41]: https://kimfra.com/16b5a8a71222468d93365a874b08b4b8

[^2_42]: https://www.websentra.com/setup-sftp-server-on-ubuntu/

[^2_43]: https://www.ibm.com/docs/en/db2-data-mgr-console/3.1.x?topic=multiplatforms-synchronizing-primary-secondary-nodes

[^2_44]: https://superuser.com/questions/956311/continuously-detect-new-files-with-inotify-tools-within-multiple-directories-r

[^2_45]: https://serverfault.com/questions/748938/must-i-bind-haproxy-to-port-22-to-load-balance-ssh-sftp

[^2_46]: https://sftpcloud.io/learn/sftp/how-to-setup-sftp-server-on-ubuntu-22-04

[^2_47]: https://stackoverflow.com/questions/36486787/remote-path-for-monitoring-changes

[^2_48]: https://stackoverflow.com/questions/6996058/how-can-i-use-inotify-tools-to-have-an-email-sent-to-me-when-a-file-in-a-directo

[^2_49]: https://www.semanticscholar.org/paper/9b355092e7bfd867cd4ab52caabd7ee973f03ffb

[^2_50]: https://www.reddit.com/r/linuxadmin/comments/16rneyz/need_help_as_i_am_facing_problem_with_mp4_file/

[^2_51]: https://www.reddit.com/r/hetzner/comments/1gbpclv/dedicated_server_redundancy/

[^2_52]: https://www.reddit.com/r/sysadmin/comments/1fspofz/searching_for_a_sftp_automation/

[^2_53]: https://www.reddit.com/r/linuxadmin/comments/571uw4/nfs_vs_ssh_as_rsync_transport/

[^2_54]: https://www.reddit.com/r/CentOS/comments/j77llv/sftp_send_email_when_file_is_uploaded/

[^2_55]: https://www.reddit.com/r/linuxadmin/comments/1062ksh/how_to_keep_folder_on_3_nodes_in_sync/

[^2_56]: https://www.reddit.com/r/linux/comments/ipa3r/whats_the_best_backup_program_for_a_server_cli/

[^2_57]: https://www.reddit.com/r/linux/comments/2wqrwo/linux_server_would_a_gui_hurt/

[^2_58]: https://www.reddit.com/r/KeePass/comments/innb3v/trigger_feature_alternative_for_keepassxc/

[^2_59]: https://www.reddit.com/r/letsencrypt/comments/peflae/wildcard_certificate_renewed_pushed_to_sftp_server/

[^2_60]: https://www.reddit.com/r/sysadmin/comments/6st1bf/what_are_you_using_for_large_file_transfers_via/

[^2_61]: https://www.reddit.com/r/Syncthing/comments/y8mpsg/best_method_to_do_a_one_way_upload_and_wipe_path/

[^2_62]: https://www.reddit.com/r/linuxquestions/comments/b4w0kw/whats_the_simplest_way_to_transfer_files_between/

[^2_63]: https://groups.google.com/g/lsyncd/c/lBXmB2GO5O8

[^2_64]: https://blog.naver.com/dugurs/222507810118

[^2_65]: https://ehostidc.co.kr/cscenter/technical.php?ptype=view\&code=technical\&idx=271\&category=

[^2_66]: https://www.unix.com/shell-programming-and-scripting/28705-sftp-not-working-cron.html

[^2_67]: https://serverfault.com/questions/921983/lsyncd-taking-time-to-sync-files

[^2_68]: https://ploz.tistory.com/entry/lsyncd-rsyncd-데이터-실시간-동기화

[^2_69]: https://stackoverflow.com/questions/13719394/sending-mail-from-incrond

[^2_70]: https://serverfault.com/questions/1057798/how-to-forward-new-files-from-an-sftp-server

[^2_71]: https://www.linuxquestions.org/questions/linux-software-2/make-or-edit-and-incrontab-file-4175706540/

[^2_72]: https://capatek-tutorials.co.uk/linux/linux-tigger-commands-tasks-file-system-changes/

[^2_73]: https://ownlinuxnotes.wordpress.com/2011/12/11/steps-to-install-and-configure-incrontab/

[^2_74]: https://www.reddit.com/r/OPNsenseFirewall/comments/mptoiy/haproxy_plugin_cert_change/

[^2_75]: https://www.reddit.com/r/OPNsenseFirewall/comments/tlfoem/reverse_proxy_on_opnsense_firewall/

[^2_76]: https://www.reddit.com/r/OPNsenseFirewall/comments/myarob/haproxy_on_opnsense_https_passthrough/

[^2_77]: https://www.reddit.com/r/selfhosted/comments/14thm4r/haproxy_with_forward_auth_to_authentik/

[^2_78]: https://www.reddit.com/r/opnsense/comments/1agefmj/opnsense_haproxy_behind_nat_help_needed/

[^2_79]: https://www.reddit.com/r/opnsense/comments/wx8wm8/how_can_i_push_acme_certificates_to_truenas_and/

[^2_80]: https://www.reddit.com/r/OPNsenseFirewall/comments/s9bnad/haproxy_ssl_passthrough_some_good_tutorial/

[^2_81]: https://www.reddit.com/r/OPNsenseFirewall/comments/sijhif/haproxy_hsts_port_80_or_443/

[^2_82]: https://www.reddit.com/r/opnsense/comments/1dgn8rc/ha_proxy_no_ssl_offloading_configuration/

[^2_83]: https://www.reddit.com/r/opnsense/comments/11yu1w2/opnsense_haproxy_nextcloud_noob/

[^2_84]: https://www.reddit.com/r/opnsense/comments/1jb8owe/opnsense_haproxy_multiple_domains/

[^2_85]: https://www.reddit.com/r/OPNsenseFirewall/comments/ghykyd/opnsense_and_haproxy/

[^2_86]: https://www.reddit.com/r/OPNsenseFirewall/comments/168k3i9/port_forwarding_required_for_haproxy/

[^2_87]: https://forum.opnsense.org/index.php?topic=17529.0

[^2_88]: https://discourse.haproxy.org/t/haproxy-with-opnsense-and-dmz/4459

[^2_89]: https://serverfault.com/questions/1029930/having-trouble-with-tcp-mode-on-haproxy-running-on-opnsense

[^2_90]: https://forum.domoticz.com/viewtopic.php?t=32457

[^2_91]: https://discourse.haproxy.org/t/haproxy-on-opnsense-asynchronous-routing/10070

[^2_92]: https://docs.opnsense.org/manual/reverse_proxy.html

[^2_93]: https://forum.opnsense.org/index.php?topic=32206.0

[^2_94]: https://forum.opnsense.org/English_Forums/General_Discussion/HAProxy_Questions

[^2_95]: https://github.com/opnsense/plugins/issues/2653

[^2_96]: https://discourse.haproxy.org/t/how-to-haproxy-opnsense-tcp-forward-redirect/2495

[^2_97]: https://help.nextcloud.com/t/nextcloud-behind-haproxy-opnsense-configuration/158291

[^2_98]: https://www.semanticscholar.org/paper/6422cf51b374bcd5560d0b4759cfebe821acdc51

[^2_99]: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8807116/

[^2_100]: https://www.reddit.com/r/linux/comments/q5jr58/stop_carrying_a_linux_laptop_and_just_sync_my/

[^2_101]: https://www.reddit.com/r/linuxadmin/comments/tnpk6n/what_is_the_best_open_source_software_to_move/

[^2_102]: https://www.reddit.com/r/sysadmin/comments/31v9u4/can_i_remotely_monitor_multiple_ftp_folders/

[^2_103]: https://www.reddit.com/r/linuxadmin/comments/b64pig/setup_a_ha_linux_file_server/

[^2_104]: https://docs.rackspace.com/docs/set-up-lsyncd-locally-and-over-ssh-to-sync-directories

[^2_105]: https://github.com/lsyncd/lsyncd

[^2_106]: https://forums.opensuse.org/t/does-sftp-work-when-started-in-cron/133380

[^2_107]: https://soonj.net/relfeed/370493

[^2_108]: https://askubuntu.com/questions/921977/sftp-in-a-cron-job

[^2_109]: https://www.reddit.com/r/opnsense/comments/1aegt0j/acme_automations_sftp_upload_failing_host_cannot/

[^2_110]: https://www.reddit.com/r/OPNsenseFirewall/comments/t1c0xl/how_do_i_serve_a_letsencrypt_certificate_to_all/

[^2_111]: https://www.reddit.com/r/OPNsenseFirewall/comments/makaeu/opnsense_haproxy_and_issues_trying_to_get_haproxy/

[^2_112]: https://www.reddit.com/r/PFSENSE/comments/1alyj1n/reverse_proxy/

[^2_113]: https://github.com/opnsense/plugins/issues/4363

[^2_114]: https://community.nethserver.org/t/opnsense-nethserver-and-certificates/16038/19

[^2_115]: https://blog.holtzweb.com/posts/opnsense-with-haproxy-and-lets-encrypt/

[^2_116]: https://discourse.haproxy.org/t/haproxy-opnsense-and-a-blocked-port-443/6507


---

# Lsyncd를 이용한 다중 파일 서버 간 일관성 유지 구현

Lsyncd(Live Synchronization Daemon)는 여러 리눅스 서버 간에 파일 시스템 변경사항을 실시간으로 동기화하기 위한 효과적인 도구입니다. 이 글에서는 세 대의 파일 서버 간에 데이터 일관성을 유지하기 위한 Lsyncd 설정 방법을 설명하겠습니다.

## Lsyncd의 작동 원리

```
+---------------+       +---------------+       +---------------+
|               |       |               |       |               |
|  서버 1       | ----&gt; |  서버 2       | ----&gt; |  서버 3       |
| (Master)      |       | (Sub)         |       | (Backup)      |
|               |       |               |       |               |
+---------------+       +---------------+       +---------------+
     inotify              lsyncd/rsync           lsyncd/rsync
```

Lsyncd는 inotify를 사용하여 로컬 디렉토리의 파일 변경을 감시하고, 변경이 감지되면 rsync를 통해 원격 서버로 변경사항을 전송합니다[^3_5]. 이를 통해 파일 서버 간 일관성을 거의 실시간으로 유지할 수 있습니다.

## 설치 및 구성 절차

### 1. 각 서버에 Lsyncd 설치

**Ubuntu/Debian 시스템:**

```bash
sudo apt update &amp;&amp; sudo apt install lsyncd -y
sudo mkdir -p /etc/lsyncd /var/log/lsyncd
```

**CentOS/RHEL 시스템:**

```bash
sudo yum -y install lua lua-devel pkgconfig gcc asciidoc
sudo yum install lsyncd
sudo service lsyncd start
sudo chkconfig lsyncd on
sudo mkdir /var/log/lsyncd
```


### 2. SSH 키 기반 인증 설정

마스터 서버(서버 1)에서 SSH 키를 생성합니다:

```bash
ssh-keygen -t rsa
```

생성된 공개 키를 다른 서버들에 복사합니다:

```bash
# 서버 2에 복사
cat ~/.ssh/id_rsa.pub | ssh user@server2 "mkdir -p ~/.ssh &amp;&amp; cat &gt;&gt; ~/.ssh/authorized_keys"

# 서버 3에 복사 (서버 2에서 실행)
ssh-keygen -t rsa  # 서버 2에서 실행
cat ~/.ssh/id_rsa.pub | ssh user@server3 "mkdir -p ~/.ssh &amp;&amp; cat &gt;&gt; ~/.ssh/authorized_keys"
```


### 3. 서버 1 (마스터) 구성

마스터 서버에서 `/etc/lsyncd/lsyncd.conf.lua` 파일을 다음과 같이 설정합니다:

```lua
settings {
    logfile = "/var/log/lsyncd/lsyncd.log",
    statusFile = "/var/log/lsyncd/lsyncd-status.log",
    statusInterval = 30
}

-- 서버 1 -&gt; 서버 2 동기화 설정
sync {
    default.rsyncssh,
    source = "/path/to/sync",
    host = "server2",
    targetdir = "/path/to/sync",
    rsync = {
        archive = true,
        compress = true,
        acls = true,
        verbose = true,
        owner = true,
        group = true,
        perms = true,
        delete = true,
        _extra = {"--omit-dir-times"}
    },
    delay = 5,
    maxProcesses = 4
}
```


### 4. 서버 2 (중간) 구성

서버 2에서도 Lsyncd를 설정하여 서버 3으로 동기화합니다:

```lua
settings {
    logfile = "/var/log/lsyncd/lsyncd.log",
    statusFile = "/var/log/lsyncd/lsyncd-status.log",
    statusInterval = 30
}

-- 서버 2 -&gt; 서버 3 동기화 설정
sync {
    default.rsyncssh,
    source = "/path/to/sync",
    host = "server3",
    targetdir = "/path/to/sync",
    rsync = {
        archive = true,
        compress = true,
        acls = true,
        verbose = true,
        owner = true,
        group = true,
        perms = true,
        delete = true,
        _extra = {"--omit-dir-times"}
    },
    delay = 15,  -- 의도적으로 서버 1보다 지연시간을 길게 설정
    maxProcesses = 4
}
```


### 5. Lsyncd 서비스 시작 및 자동 시작 설정

```bash
# 서비스 시작
sudo systemctl start lsyncd

# 자동 시작 설정
sudo systemctl enable lsyncd
```


## 고급 설정 및 최적화

### 1. 동기화 루프 방지

서버 간 동기화 루프를 방지하기 위해, 단방향 동기화 체인을 구성해야 합니다[^3_4]. `서버 1 → 서버 2 → 서버 3` 방식으로 일관된 방향성을 유지하세요.

### 2. 전송 지연 설정

파일 변경이 빈번한 경우, 지연 설정을 조정하여 불필요한 동기화를 방지할 수 있습니다[^3_3]:

```lua
delay = 45,  -- 45초 동안 변경사항 수집 후 동기화
```


### 3. 대용량 파일 시스템 고려사항

대량의 파일(수백만 개)을 처리할 경우, 리눅스 inotify 한계를 늘려야 할 수 있습니다[^3_3]:

```bash
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```


### 4. 동기화 제외 패턴 설정

특정 파일이나 디렉토리를 동기화에서 제외하려면:

```lua
sync {
    -- 기존 설정...
    exclude = { "*.tmp", "*.log", ".git", "tmp/" },
}
```


## 모니터링 및 유지 관리

### 1. 로그 모니터링

동기화 상태를 실시간으로 확인:

```bash
tail -f /var/log/lsyncd/lsyncd.log
```


### 2. 동기화 테스트

마스터 서버에서 테스트 파일을 생성하고 다른 서버에서 확인:

```bash
# 서버 1에서 실행
touch /path/to/sync/test_file.txt

# 서버 2와 3에서 확인
ls -la /path/to/sync/test_file.txt
```


### 3. 문제 해결 명령어

동기화 상태와 처리 중인 작업 확인:

```bash
cat /var/log/lsyncd/lsyncd-status.log
```


## 성능 및 안정성 고려사항

1. **리소스 사용량**: Lsyncd는 많은 파일을 감시할 때 메모리 사용량이 증가할 수 있으므로, 서버 리소스를 모니터링하세요[^3_6].
2. **네트워크 대역폭**: 대용량 파일을 동기화할 때 네트워크 대역폭이 충분한지 확인하세요. 최소 100Mbit 네트워크가 권장되며, 대규모 스토리지의 경우 1Gbit 이상이 필요합니다[^3_5].
3. **지연 시간**: Lsyncd는 기본적으로 약 1초의 최소 지연 시간이 있습니다[^3_3]. 이는 대부분의 사용 사례에 충분하지만, 밀리초 단위의 즉각적인 동기화가 필요하다면 다른 솔루션을 고려해야 할 수 있습니다.
4. **백업 전략**: Lsyncd만으로는 완전한 백업 솔루션이 될 수 없습니다. 정기적인 스냅샷이나 백업도 함께 구현하세요.

이와 같은 구성을 통해 세 서버 간의 파일 일관성을 효과적으로 유지할 수 있으며, 서버 장애 시에도 데이터 가용성을 보장할 수 있습니다.

<div style="text-align: center">⁂</div>

[^3_1]: https://pplx-res.cloudinary.com/image/private/user_uploads/IhElEmeGgnObAjM/Notes_250429_003147.jpg

[^3_2]: https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_a301bfc1-3e41-4427-b2b9-6024be87a26f/905f3702-f426-4546-aaeb-57ad4160e173/progit-Manual_for_git.pdf

[^3_3]: https://www.reddit.com/r/linuxadmin/comments/xmhado/one_way_sync_lsyncd/

[^3_4]: https://www.resilio.com/blog/lsyncd-for-near-real-time-sync

[^3_5]: http://kb.ictbanking.net/article.php?id=438

[^3_6]: https://www.reddit.com/r/linuxquestions/comments/o1dmiq/keeping_a_hybrid_cloud_apache_ha_cluster_content/

[^3_7]: https://benholmen.com/blog/setup-lsyncd/

[^3_8]: https://xikebattu.wordpress.com/2017/10/06/lsyncd-live-file-syncronization-across-multiple-linux-servers/

[^3_9]: https://www.semanticscholar.org/paper/8516f4bf7583c7e1de5b8e9fb3b3f395baba577f

[^3_10]: https://arxiv.org/abs/2409.01092

[^3_11]: https://www.semanticscholar.org/paper/64c69e8fdc82eab94ca4334048155eb90141e179

[^3_12]: https://www.semanticscholar.org/paper/9187b8fa2656ae535ea5bb5432667682637cd63e

[^3_13]: https://www.reddit.com/r/linuxadmin/comments/aohuiv/how_to_sync_directories_between_two_or_more/

[^3_14]: https://www.reddit.com/r/Zettelkasten/comments/ik86mf/how_to_sync_a_zettelkasten_across_multiple/

[^3_15]: https://www.reddit.com/r/linuxadmin/comments/4do596/cross_data_center_real_time_file_replication/

[^3_16]: https://www.reddit.com/r/linuxadmin/comments/b64pig/setup_a_ha_linux_file_server/

[^3_17]: https://www.reddit.com/r/aws/comments/7vt5x4/tool_to_compare_and_keep_two_instances_in_sync/

[^3_18]: https://www.reddit.com/r/sysadmin/comments/1hq2rh9/looking_for_best_way_to_mirror_data_to_another/

[^3_19]: https://www.reddit.com/r/homelab/comments/lom4s6/synchronizing_files_between_two_locations/

[^3_20]: https://www.reddit.com/r/selfhosted/comments/ick01c/what_is_the_best_software_to_sync_two_or_more/

[^3_21]: https://www.reddit.com/r/DataHoarder/comments/1b7f77w/need_some_realtime_file_mirroring_advice_please/

[^3_22]: https://www.reddit.com/r/selfhosted/comments/1hqqk7a/software_to_keep_two_folders_in_realtime_sync/

[^3_23]: https://www.reddit.com/r/linuxquestions/comments/jxofv0/whats_the_best_way_to_synchronise_folders_between/

[^3_24]: https://www.reddit.com/r/aws/comments/7jahot/servers_under_load_balancer_how_to_keep_files_in/

[^3_25]: https://www.reddit.com/r/linux/comments/dwrgo/automatic_sync_to_linux_server_dropbox_style/

[^3_26]: https://www.reddit.com/r/homelab/comments/qclsw4/homelab_help_on_decide_backup_architecture/

[^3_27]: https://github.com/axkibe/lsyncd/issues/376

[^3_28]: https://stackoverflow.com/questions/58541559/linux-syncing-mulitple-folders-on-multiple-servers-with-lsyncd

[^3_29]: https://stackoverflow.com/questions/29478658/how-does-lsyncd-handle-one-of-multiple-destination-servers-being-down

[^3_30]: https://first2host.co.uk/blog/how-to-install-lsyncd-sync-data-between-servers/

[^3_31]: https://unix.stackexchange.com/questions/658449/lsyncd-syncing-multiple-client-to-same-directory-breaks-sync

[^3_32]: https://docs.rackspace.com/docs/set-up-lsyncd-locally-and-over-ssh-to-sync-directories

[^3_33]: https://github.com/axkibe/lsyncd/issues/394

[^3_34]: https://serverfault.com/questions/742246/synchronize-files-to-webserver-by-lsyncd

[^3_35]: https://lsyncd.github.io/lsyncd/manual/config/layer4/

[^3_36]: https://github.com/axkibe/lsyncd/issues/303

[^3_37]: https://github.com/lsyncd/lsyncd/issues/686

[^3_38]: https://autoize.com/migrate-large-volumes-of-data-with-lsyncd-in-real-time/

[^3_39]: https://accuweb.cloud/resource/articles/how-to-install-and-use-file-synchronization-add-on

[^3_40]: https://www.semanticscholar.org/paper/da236bc8044cf62d55eecccaedbcc198f1883436

[^3_41]: https://www.semanticscholar.org/paper/b889a47b024ba9d4215f676308f1dc484dbfe4d5

[^3_42]: https://www.semanticscholar.org/paper/197c14010eb84fc97ee19df1c6b13ec63df7d53d

[^3_43]: https://www.semanticscholar.org/paper/03e2bf23b9b3e2f62d52b3001aec9b88702a88cf

[^3_44]: https://arxiv.org/abs/1610.06309

[^3_45]: https://www.semanticscholar.org/paper/fc8cc76a2eb2d7e6604aade0c9063970cce26bd7

[^3_46]: https://www.reddit.com/r/linuxadmin/comments/k5zmhd/how_well_do_rsynclsyncd_scale_in_real_time/

[^3_47]: https://www.reddit.com/r/linux4noobs/comments/opqf9n/how_to_sync_files_automatically_in_real_time/

[^3_48]: https://www.reddit.com/r/linuxadmin/comments/ion2ku/efficiently_rsync_multiple_clients_which_are/

[^3_49]: https://www.reddit.com/r/sysadmin/comments/1dxh5qy/better_way_to_setup_high_availability_lamp_stack/

[^3_50]: https://askubuntu.com/questions/804493/how-do-i-sync-multiple-source-folders-with-lsyncd

[^3_51]: https://groups.google.com/g/lsyncd/c/VjtRbn16ut8


---

# HAProxy를 사용한 다중 파일 서버 간 일관성 유지 구현

HAProxy를 사용하여 여러 파일 서버 간에 파일 쓰기를 동기화하는 아키텍처를 구축하려면 두 가지 핵심 기능이 필요합니다: (1) 클라이언트 요청을 적절히 분배하는 로드 밸런싱과 (2) 서버 간 파일 일관성을 유지하는 실시간 동기화입니다. 아래에 구현 방법을 상세히 설명합니다.

## 아키텍처 개요

```
                    +-----------+
                    |  Client   |
                    +-----+-----+
                          |
                          v
                    +-----+-----+
                    |  HAProxy  |
                    +-----+-----+
                          |
        +----------------+----------------+
        |                |                |
+-------+------+ +-------+------+ +-------+------+
| File Server 1 | | File Server 2 | | File Server 3 |
+-------+------+ +-------+------+ +-------+------+
        |                |                |
        +--------+-------+--------+------+
                 |                |
          +------+------+  +------+------+
          |   lsyncd    |  |  Database   |
          +-------------+  +-------------+
```


## 1. HAProxy 설정 (TCP 로드 밸런싱)

HAProxy를 TCP 모드로 구성하여 SFTP/FTP 트래픽을 파일 서버로 분산합니다.

### HAProxy 기본 설정

```
global
    log /dev/log local0
    log /dev/log local1 notice
    maxconn 4096
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    tcp
    option  tcplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000

frontend sftp_frontend
    bind *:22
    mode tcp
    default_backend sftp_servers

backend sftp_servers
    mode tcp
    balance roundrobin
    option tcp-check
    # 세션 고정(sticky sessions)을 위한 설정
    stick-table type ip size 200k expire 30m
    stick on src
    server sftp1 192.168.1.1:22 check
    server sftp2 192.168.1.2:22 check
    server sftp3 192.168.1.3:22 check
```

이 설정의 핵심 요소:

- `mode tcp`: 파일 전송 프로토콜(SFTP/FTP)은 TCP 레벨에서 처리[^4_3]
- `stick on src`: 클라이언트 IP 기반 세션 고정으로 동일 클라이언트는 항상 같은 서버로 연결되도록 함[^4_2]
- `option tcp-check`: 서버 상태 점검으로 가용성 확인[^4_6]


## 2. lsyncd를 사용한 실시간 파일 동기화

lsyncd는 inotify를 사용하여 파일 시스템 변경을 감지하고 rsync를 통해 다른 서버로 전파합니다. 2-노드 시스템에서는 특히 효과적입니다[^4_2].

### 각 파일 서버에 lsyncd 설치

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install lsyncd

# CentOS/RHEL
sudo yum install lsyncd
```


### lsyncd 설정 (서버 1 예시)

```lua
-- /etc/lsyncd/lsyncd.conf.lua
settings {
    logfile = "/var/log/lsyncd/lsyncd.log",
    statusFile = "/var/log/lsyncd/lsyncd-status.log",
    statusInterval = 10
}

-- 서버 1에서 서버 2로 동기화
sync {
    default.rsyncssh,
    source = "/path/to/data",
    host = "192.168.1.2",
    targetdir = "/path/to/data",
    rsync = {
        archive = true,
        compress = true,
        _extra = {"--omit-dir-times"}
    },
    ssh = {
        identityFile = "/root/.ssh/id_rsa"
    },
    delay = 5, -- 5초 지연
    maxProcesses = 4,
    -- 변경이 많은 경우 아래 옵션 활성화
    -- init = false,
    -- initdone = false
}

-- 서버 1에서 서버 3으로 동기화
sync {
    default.rsyncssh,
    source = "/path/to/data",
    host = "192.168.1.3",
    targetdir = "/path/to/data",
    -- 위와 동일한 rsync, ssh 설정
    delay = 5,
    maxProcesses = 4
}
```

각 파일 서버에 유사한 설정을 적용하여 다른 모든 서버로 변경 사항을 전파합니다.

## 3. SSH 키 인증 설정

lsyncd가 비밀번호 없이 서버 간 동기화할 수 있도록 SSH 키 인증을 설정합니다:

```bash
# 각 서버에서 SSH 키 생성
ssh-keygen -t rsa

# 공개 키를 다른 서버에 복사
ssh-copy-id user@192.168.1.2
ssh-copy-id user@192.168.1.3
```


## 4. 서버 상태 모니터링 및 건강 점검

HAProxy가 상태 확인을 통해 서버 가용성을 모니터링하도록 설정합니다:

```
backend sftp_servers
    mode tcp
    # 기존 설정과 함께
    option tcp-check
    tcp-check connect
    tcp-check expect string SSH-2.0
```


## 고급 구현 방안

### 1. 메타데이터 데이터베이스 접근법

대규모 시스템의 경우, 파일 메타데이터를 MySQL과 같은 데이터베이스에 저장하는 방법을 고려할 수 있습니다[^4_5]:

```
+----------------+       +----------------+       +----------------+
| 파일 서버 1     |       | 파일 서버 2     |       | 파일 서버 3     |
+----------------+       +----------------+       +----------------+
         |                      |                       |
         +----------------------+-----------------------+
                                |
                     +----------+-----------+
                     | MySQL 복제 클러스터   |
                     | (파일 메타데이터)    |
                     +--------------------+
```

이 방식에서는:

1. 파일 업로드 시 메타데이터가 데이터베이스에 기록됨
2. 데이터베이스 복제를 통해 모든 서버가 최신 메타데이터를 공유
3. 실제 파일은 lsyncd를 통해 동기화

### 2. 쓰기 전용 서버와 읽기 서버 분리

MySQL 구성과 유사하게, 쓰기 전용 마스터 서버와 읽기 전용 슬레이브 서버를 구분할 수 있습니다[^4_4][^4_7][^4_8]:

```
frontend write_frontend
    bind *:2222
    mode tcp
    default_backend write_servers

frontend read_frontend
    bind *:2221
    mode tcp
    default_backend read_servers

backend write_servers
    mode tcp
    server master 192.168.1.1:22 check

backend read_servers
    mode tcp
    balance roundrobin
    server slave1 192.168.1.2:22 check
    server slave2 192.168.1.3:22 check
```


## 성능 최적화 및 주의사항

1. **지연 시간 조정**: 파일 변경이 빈번한 경우, lsyncd의 지연 시간을 조정하여 불필요한 동기화를 줄임
2. **대역폭 고려**: 대용량 파일 전송 시 네트워크 대역폭 제한 설정
3. **세션 고정**: 파일 업로드 중 서버 전환을 방지하기 위해 HAProxy의 세션 고정 기능을 활용[^4_2]
4. **EFS 대신 사용**: 이 방식은 AWS EFS보다 비용 효율적이고 성능이 우수함[^4_2]

## 결론

HAProxy와 lsyncd를 조합하면 효율적이고 확장 가능한 다중 파일 서버 환경을 구축할 수 있습니다. HAProxy는 클라이언트 요청을 분산하고, lsyncd는 실시간으로 파일 일관성을 유지합니다. 이 설정은 높은 가용성과 확장성을 제공하며, AWS EFS와 같은 관리형 서비스보다 비용 효율적인 대안이 될 수 있습니다.

<div style="text-align: center">⁂</div>

[^4_1]: https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_a301bfc1-3e41-4427-b2b9-6024be87a26f/905f3702-f426-4546-aaeb-57ad4160e173/progit-Manual_for_git.pdf

[^4_2]: https://www.reddit.com/r/aws/comments/7jahot/servers_under_load_balancer_how_to_keep_files_in/

[^4_3]: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/protocol-support/tcp/

[^4_4]: https://stackoverflow.com/questions/28089708/haproxy-for-mysql-master-slave-replication

[^4_5]: https://www.reddit.com/r/zfs/comments/tzczwf/how_should_we_be_architecting_4x_or_more_ha_file/

[^4_6]: https://www.linode.com/docs/guides/getting-started-with-haproxy-tcp-load-balancing-and-health-checks/

[^4_7]: https://www.digitalocean.com/community/tutorials/how-to-use-haproxy-to-set-up-mysql-load-balancing-3

[^4_8]: https://severalnines.com/blog/high-availability-read-write-splitting-php-mysqlnd-mysql-replication-and-haproxy/

[^4_9]: https://www.semanticscholar.org/paper/2c1f3946e68ba90ee5cda53152689e05fde7b376

[^4_10]: https://www.semanticscholar.org/paper/d2985ccb7b63b33d265d9867c4ad90df357a6e6b

[^4_11]: https://www.semanticscholar.org/paper/81ee5cc8d9595347eda44f9a002c03c703915857

[^4_12]: https://www.semanticscholar.org/paper/fed0e56561d3f2607e537b3681d10eac6b42d939

[^4_13]: https://www.reddit.com/r/linux/comments/2iyh18/use_haproxy_to_distribute_readwrite_mysql_access/

[^4_14]: https://www.reddit.com/r/linuxquestions/comments/t8pkj2/replicated_memcache/

[^4_15]: https://www.reddit.com/r/selfhosted/comments/vh7lym/wireguard_tunnel_from_haproxy_on_vps_to_nginx_on/

[^4_16]: https://www.reddit.com/r/linuxadmin/comments/1k0qo34/possible_haproxy_bug_traffic_being_errantly/

[^4_17]: https://www.reddit.com/r/hetzner/comments/1gbpclv/dedicated_server_redundancy/

[^4_18]: https://www.reddit.com/r/PFSENSE/comments/twlvvd/haproxy_with_multiple_traefik_backend_servers/

[^4_19]: https://www.reddit.com/r/linuxadmin/comments/75ba9j/redissentinel_haproxy_for_failover_redis_reports/

[^4_20]: https://www.reddit.com/r/sysadmin/comments/5skxuh/sysadmins_how_can_we_have_2_active_nodes_with_all/

[^4_21]: https://www.reddit.com/r/haproxy/comments/13s3rub/routing_ssh_connections_with_haproxy/

[^4_22]: https://www.reddit.com/r/PFSENSE/comments/kqb0mb/configuring_haproxy_for_internal_services_proxy/

[^4_23]: https://www.reddit.com/r/linuxadmin/comments/35tayw/mysql_failover_clustering/

[^4_24]: https://www.reddit.com/r/kubernetes/comments/1gh7lxm/using_haproxy_as_a_external_load_balancer/

[^4_25]: https://www.reddit.com/r/mysql/comments/1ehf13x/comprehensive_ha_mysql_guide/

[^4_26]: https://www.reddit.com/r/selfhosted/comments/1hncrli/why_dont_we_see_more_love_for_haproxy/

[^4_27]: https://stackoverflow.com/questions/35987865/how-to-share-haproxy-configurations-between-two-servers

[^4_28]: https://www.alexwilliams.ca/p/2009-08-10-using-haproxy-for-mysql-failover-and-redundancy/index.html

[^4_29]: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/

[^4_30]: https://serverfault.com/questions/577923/haproxy-mysql-write-failover

[^4_31]: https://www.haproxy.com/documentation/haproxy-configuration-manual/2-6r1/management/

[^4_32]: https://serverfault.com/questions/405862/haproxy-pass-original-remote-ip-in-tcp-mode

[^4_33]: https://discourse.haproxy.org/t/postgresql-haproxy-patroni-1-haproxy-endpoint-to-listen-to-read-and-write-is-it-possible/5516

[^4_34]: https://docs.haproxy.org/2.6/configuration.html

[^4_35]: https://discourse.haproxy.org/t/haproxy-reusing-wrong-backend-when-using-tcp-mode/6384

[^4_36]: https://www.percona.com/blog/how-to-use-group-replication-with-haproxy/

[^4_37]: https://autoize.com/master-master-mysql-replication-using-haproxy/

[^4_38]: https://discourse.haproxy.org/t/not-working-in-tcp-mode/10039

[^4_39]: https://www.haproxy.com/blog/reviewing-every-new-feature-in-haproxy-3-1

[^4_40]: https://stackoverflow.com/questions/68003320/how-can-i-configure-haproxy-to-use-all-servers-in-a-backend-if-none-are-up

[^4_41]: https://www.semanticscholar.org/paper/f963e0c4a9d36a0373f334761ccc7e2cc535336c

[^4_42]: https://www.semanticscholar.org/paper/4c2982e27ff9735e5d1a0e42faf27a39bbe4d44e

[^4_43]: https://www.semanticscholar.org/paper/dc699e3554596aed61e994de10ed615ba859031e

[^4_44]: https://www.semanticscholar.org/paper/13ebbf34a9e716327c48b95d396fae98b3b17c05

[^4_45]: https://www.semanticscholar.org/paper/b023ad8c7538ff21c53809dfc099bf0a32946108

[^4_46]: https://www.semanticscholar.org/paper/edbd0aa0a6aece5ded955a6b6cf96c5e023ac899

[^4_47]: https://www.reddit.com/r/sysadmin/comments/1dxh5qy/better_way_to_setup_high_availability_lamp_stack/

[^4_48]: https://www.reddit.com/r/haproxy/comments/1b92lt0/terminate_some_traffic_and_proxy_pass_the_rest_is/

[^4_49]: https://www.reddit.com/r/mysql/comments/eah9re/mysql_high_availability/

[^4_50]: https://www.reddit.com/r/sysadmin/comments/g075u2/im_building_a_high_availability_and_scalable_web/

[^4_51]: https://severalnines.com/blog/how-create-single-endpoint-your-postgresql-replication-setup-using-haproxy/

