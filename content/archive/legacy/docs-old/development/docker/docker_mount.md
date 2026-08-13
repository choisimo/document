# Docker 볼륨과 바인드 마운트

## 변수와 삭제 조건

`${volume_name}`, `${docker_exec_dir}`, `${docker_container}`, `${docker_image}`, `${directory}`를 실제 값으로 치환한 뒤 실행한다. 볼륨 삭제는 컨테이너 연결이 해제되고 필요한 데이터의 백업·복원 가능성이 확인된 경우에만 수행한다. `docker volume prune`은 특정 볼륨이 아니라 현재 어떤 컨테이너에도 연결되지 않은 볼륨 집합을 대상으로 하므로, 삭제 목록을 확인하지 않은 상태에서는 실행하지 않는다.

## docker volume create
    $ docker volume create ${volume_name}
    $ docker volume ls
    $ docker volume inspect ${volume_name}
    
## docker volume mount
    $ docker run -v ${volume_name}:/${docker_exec_dir} \ 
    --name ${docker_container} ${docker_image} touch /{docker_exec_dir}/test.txt
#### 
    // volume_name : mount 할 volume
    // docker_exec_dir : 컨테이너 내에서 volume을 mount 할 directory
    // docker_container : 생성될 컨테이너 이름 지정
    // docker_image : 사용할 도커 이미지 

## docker volume remove
    $ docker rm -f ${docker_container}
    $ docker volume rm ${volume_name}
### remove volumes does not have any mount
    $ docker volume prune

## bind mount (mount direct to host's file system)
    $ docker run -v ${directory}:/${docker_exec_dir} -it --name ${docker_container} ${docker_image} /bin/bash

### so what's the difference between using volume && binding file-system
    if making the volume, It's location directory may be "/var/lib/docker/volume/~",
    the effects of using volume is that It becomes easier to 
    1. migration or backup
    2. can manage with docker cli or docker api
    3. works well either windwos or linux OS    
    4. can share safely between containers
    
