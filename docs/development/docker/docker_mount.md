## docker volume create
    $ docker volume create ${volume_name}
    $ docker volume ls
    $ docker volume inspect
    
## docker volume mount
    $ docker run -v ${volume_name}:/{docker_exec_dir} \ 
    --name ${docker_container} ${docker_image} touch /{docker_exec_dir}/test.txt
#### 
    // volume_name : mount 할 volume
    // docker_exec_dir : 컨테이너 내에서 volume을 mount 할 directory
    // docker_container : 생성될 컨테이너 이름 지정
    // docker_image : 사용할 도커 이미지 

## docker volume remove
    $ docker rm -f ${{docker_container}
    $ docker volume rm ${volume_name}
### remove volumes does not have any mount
    $ docker volume prune

## bind mount (mount direct to host's file system)
    $ docker run -v ${directory}:/${docker_exec_dir} -it --name ${docker_container} /bin/bash

### so what's the difference between using volume && binding file-system
    if making the volume, It's location directory may be "/var/lib/docker/volume/~",
    the effects of using volume is that It becomes easier to 
    1. migration or backup
    2. can manage with docker cli or docker api
    3. works well either windwos or linux OS    
    4. can share safely between containers
    
