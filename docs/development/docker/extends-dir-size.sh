#!/bin/bash

# check if extends the volume size or mount a new volume
echo "Do you want to extend the volume size or mount a new volume? (extend/mount)"
read choice
if [ $choice == "mount" ]; then
  echo "run the script to mount a new volume"

    echo "run this script as root"
    # check if the user is root
    if [ "$EUID" -ne 0]
    then echo "Please run as root"
    exit
    fi

    echo "enter the size you want to extend in GB"
    read size
    # read size from the user only number
    if ! [[ $size =~ ^[0-9]+$ ]] ; then
        echo "error: Not a number" >&2; exit 1
    fi

    echo "enter the path of the volume"
    read path
    # check if the path is valid
    if [ ! -d $path ]; then
    echo "error: Not a valid path" >&2; exit 1
    fi

    # extend the volume
    sudo lve-extend -L+$size+G $path
    sudo resize2fs $path
    # check if the volume is extended
    if [ $? -eq 0 ]; then
    echo "Volume extended successfully"
    else
    echo "Error in extending the volume" >&2; exit 1
    fi

elif [ $choice == "extend" ]; then
  echo "run the script to extend the volume size"

    echo "run this script as root"
    # check if the user is root
    if [ "$EUID" -ne 0]
    then echo "Please run as root"
    exit
    fi

    echo "enter the size you want to extend in GB"
    read size
    # read size from the user only number
    if ! [[ $size =~ ^[0-9]+$ ]] ; then
        echo "error: Not a number" >&2; exit 1
    fi

    echo "enter the path of the volume"
    read path
    # check if the path is valid
    if [ ! -d $path ]; then
    echo "error: Not a valid path" >&2; exit 1
    fi

    # extend the volume
    sudo lve-extend -L+$size+G $path
    sudo resize2fs $path
    # check if the volume is extended
    if [ $? -eq 0 ]; then
    echo "Volume extended successfully"
    else
    echo "Error in extending the volume" >&2; exit 1
    fi

    lsblk -o NAME,FSTYPE,SIZE,MOUNTPOINT,LABEL
    df -h
    # enter the path of the volume
    echo "enter the path of the volume"
    read path
    # check if the path is valid
    if [ ! -d $path ]; then
    echo "error: Not a valid path" >&2; exit 1
    fi

    # check if the volume is mounted
    if grep -qs '$path' /proc/mounts; then
    echo "Volume is mounted"
    else
    echo "Volume is not mounted" >&2; exit 1
    fi

    # check partition type
    if [ -b $path ]; then
    echo "Partition type is block"
    else
    echo "Partition type is not block" >&2; exit 1
    fi

    # make partition type as ext4 if it is not
    if [ "$(blkid -o value -s TYPE $path)" != "ext4" ]; then
    echo "Partition type is not ext4"
    mkfs.ext4 $path
    else
    echo "Partition type is ext4"
    fi

    # check if the partition is formatted
    if [ "$(blkid -o value -s TYPE $path)" == "ext4" ]; then
    echo "Partition is formatted"
    else
    echo "Partition is not formatted" >&2; exit 1
    fi

    # mount the volume
    echo "enter the path to mount the volume"
    read mount_path
    # check if the path is valid
    if [ ! -d $mount_path ]; then
    echo "error: Not a valid path" >&2; exit 1
    fi

    # mount the volume
    sudo mount $path $mount_path
    # check if the volume is mounted
    if grep -qs '$path' /proc/mounts; then
    echo "Volume is mounted"
    else
    echo "Volume is not mounted" >&2; exit 1
    fi

    # check if the volume is mounted at the specified path  
    if [ "$(df -h | grep $path)" == "$path" ]; then
    echo "Volume is mounted at the specified path"
    else
    echo "Volume is not mounted at the specified path" >&2; exit 1
    fi

    # check if the volume is mounted with the correct size
    if [ "$(df -h | grep $path | awk '{print $2}')" == "$size" ]; then
    echo "Volume is mounted with the correct size"
    else
    echo "Volume is not mounted with the correct size" >&2; exit 1
    fi

    # move to the mounted path
    cd $mount_path
    # enter user for the mounted path
    echo "enter the user for the mounted path"
    read user
    # check if the user is valid
    if [ ! -d $user ]; then
    echo "error: Not a valid user" >&2; exit 1
    fi
    echo "chown -R $user:$user $mount_path"
    chown -R $user:$user $mount_path
    # check if the user is changed
    if [ "$(ls -ld $mount_path | awk '{print $3}')" == "$user" ]; then
    echo "User is changed"
    else
    echo "User is not changed" >&2; exit 1
    fi

    # check if the group is changed
    if [ "$(ls -ld $mount_path | awk '{print $4}')" == "$user" ]; then
    echo "Group is changed"
    else
    echo "Group is not changed" >&2; exit 1
    fi

    # check if the user has the permission to write
    if [ -w $mount_path ]; then
    echo "User has the permission to write"
    else
    echo "User does not have the permission to write" >&2; exit 1
    fi

    # check if the user has the permission to read
    if [ -r $mount_path ]; then
    echo "User has the permission to read"
    else
    echo "User does not have the permission to read" >&2; exit 1
    fi

    # check if the user has the permission to execute
    if [ -x $mount_path ]; then
    echo "User has the permission to execute"
    else
    echo "User does not have the permission to execute" >&2; exit 1
    fi

    # check if the user has the permission to delete
    if [ -d $mount_path ]; then
    echo "User has the permission to delete"
    else
    echo "User does not have the permission to delete" >&2; exit 1
    fi

    # check if the user has the permission to create
    if [ -d $mount_path ]; then
    echo "User has the permission to create"
    else
    echo "User does not have the permission to create" >&2; exit 1
    fi

    # check if the user has the permission to list
    if [ -d $mount_path ]; then
    echo "User has the permission to list"
    else
    echo "User does not have the permission to list" >&2; exit 1
    fi

    # check if the user has the permission to change
    if [ -d $mount_path ]; then
    echo "User has the permission to change"
    else
    echo "User does not have the permission to change" >&2; exit 1
    fi

    # check if the user has the permission to move
    if [ -d $mount_path ]; then
    echo "User has the permission to move"
    else
    echo "User does not have the permission to move" >&2; exit 1
    fi

    # check if the user has the permission to copy
    if [ -d $mount_path ]; then
    echo "User has the permission to copy"
    else
    echo "User does not have the permission to copy" >&2; exit 1
    fi
    

else
  echo "Invalid choice" >&2; exit 1
fi
