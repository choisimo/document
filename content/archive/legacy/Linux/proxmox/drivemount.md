## disk info check
```shell
lsblk |awk 'NR==1{print $0" DEVICE-ID(S)"}NR>1{dev=$1;printf $0" ";system("find /dev/disk/by-id -lname \"*"dev"\" -printf \" %p\"");print "";}'|grep -v -E 'part|lvm'
```
## passthrough disk
```shell
qmset [vm-no] -[sata-no] /[disk info check no]
```

## 적용 전 확인과 완료 기준

장치명은 재부팅이나 연결 순서에 따라 달라질 수 있으므로 `/dev/sdX`를 그대로 사용하지 말고 `lsblk -f`와 `blkid`로 파일시스템과 UUID를 확인합니다. 포맷 명령은 기존 데이터를 삭제하므로 대상 장치와 백업 상태를 별도로 확인합니다. 마운트 작업은 `findmnt <마운트 지점>`이 예상 장치와 옵션을 표시하고, 재부팅 후에도 같은 결과가 유지될 때 완료된 것으로 봅니다.
