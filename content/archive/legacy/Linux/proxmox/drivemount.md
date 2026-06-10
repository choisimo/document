## 디스크 정보 확인

```shell
lsblk |awk 'NR==1{print $0" DEVICE-ID(S)"}NR>1{dev=$1;printf $0" ";system("find /dev/disk/by-id -lname \"*"dev"\" -printf \" %p\"");print "";}'|grep -v -E 'part|lvm'
```

## VM 디스크 패스스루

```shell
qmset [vm-no] -[sata-no] /[disk info check no]
```
