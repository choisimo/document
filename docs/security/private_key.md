      # puttygen 을 이용한 인증키 발급 방법
      
      sudo apt-get install ssh
      sudo apt-get install ssh-openserver 
      
      1. key 발급 후 public 키를 ~/.ssh/authorized_keys 폴더에 넣는다.
         (authorized_keys2 등으로 여러개 파일 생성 가능)
      
      2. chmod 700 (.ssh)
         chmod 600 (lower DIR)
      
      3. private key를 putty ssh -> auth 에 등록 
      
      4. /etc/ssh/sshd_config 에서 
         PasswordAuthentication 찾아서 no 로 변경 (기존 yes)
         => 기존 id + password 방식 authentication 불가 
      
      
      
      5. 여러 사용자 일 경우
          각 사용자 별로 ~/.ssh 에 authorized_keys 만들어서 public key 등록
          /home/${user}/.ssh/authorized_keys
      
      
      chown -R ${user} ${group} ${DIR}
      chmod -R 775 ${DIR}
      
      
      // private - public key 방식으로 로그인 변경 후 파일 전송하는 방법
      
      scp -i /path/to/private_key ${file to send} user@server_ip:remote_directory/
      scp -P ${remote_server_port} -i /path/to/private_key ${file_to_send} ${remote_server_username}@${remote_server (ip | domain)}:${remote_server_directory}
      
      openssh 로 전송할 경우 private-key 포맷을 변경해주어야 한다.
      
      puttygen 을 열고, Load an existing private key file Load 후
      상단 Conversions 를 누르고 키를 변환할 수 있도록 한다.
