### 영구 마운트 하는 방법

```shell
sudo lsblk
sudo blkid /dev/${drive}
echo "${UUID} /drive ext4 defaults 0 2" | sudo tee -a /etc/fstab
```
