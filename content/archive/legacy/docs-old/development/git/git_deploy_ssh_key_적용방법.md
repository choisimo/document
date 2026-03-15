### 특정 리포지토리에만 접근하도록 설정하는 방법

각 리포지토리에 대해 별도의 SSH 키를 설정하고, `~/.ssh/config` 파일에 각각의 리포지토리에 대한 별칭과 키 파일 경로를 추가합니다. 예를 들어, `nodove_careernote_project_react` 리포지토리에만 접근하기 위한 설정을 추가해 보겠습니다.

1. **특정 리포지토리용 SSH 키 생성 (이미 생성된 경우 생략 가능)**

   ```bash
   ssh-keygen -t ed25519 -C "deploy-key-nodove-careernote" -f ~/.ssh/id_ed25519_nodove_careernote
   ```

2. **GitHub 리포지토리에 공개 키 등록**

   `~/.ssh/id_ed25519_nodove_careernote.pub` 파일의 내용을 GitHub 리포지토리의 **Deploy Key**로 등록합니다.

3. **SSH 구성 파일 수정**

   `~/.ssh/config` 파일을 열어 `github-main-server` 외에 새로운 리포지토리 설정을 추가합니다.

   ```plaintext
   # 기존 설정
   Host github-main-server
       HostName github.com
       User git
       IdentityFile ~/.ssh/main_key

   # 새로운 리포지토리 설정
   Host github-careernote
       HostName github.com
       User git
       IdentityFile ~/.ssh/id_ed25519_nodove_careernote
   ```

   이렇게 설정하면 `github-careernote`라는 별칭을 사용하여 `git clone`, `git pull`, `git push` 명령어를 실행할 때 `~/.ssh/id_ed25519_nodove_careernote` 키가 자동으로 사용됩니다.

4. **Git 명령어에서 특정 리포지토리 호출**

   이제 Git 명령어에서 `Host` 별칭을 사용해 특정 리포지토리에 접근할 수 있습니다.

   ```bash
   git clone git@github-careernote:choisimo/nodove_careernote_project_react.git
   ```

   - `git@github-careernote`는 `~/.ssh/config`에 설정된 `Host github-careernote`에 해당하며, 지정된 SSH 키 파일이 사용됩니다.

이 설정을 통해 `github-careernote`에만 접근할 수 있는 Deploy Key를 설정하여 특정 리포지토리만 접근할 수 있게 됩니다.
