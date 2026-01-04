## wireguard - vpn DOCKERFILE
```dockerfile
version: "3.3"
services:
  wg-easy:
    environment:
      # ⚠️ Required:
      # Change this to your host's public address
      - WG_HOST=gcp.nodove.com

      #Optional:
      - PASSWORD=password
      - WG_PORT=51820
      - WG_DEFAULT_ADDRESS=10.8.0.x
      - WG_DEFAULT_DNS=1.1.1.1
      - WG_MTU=1420
      - WG_ALLOWED_IPS=192.168.1.0/24, 10.8.0.0/24, 0.0.0.0/0
      
    image: weejewel/wg-easy
    container_name: wg-easy
    volumes:
      - /wg-easy/data:/etc/wireguard
    ports:
      - "51820:51820/udp"
      - "51821:51821/tcp"
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    sysctls:
      - net.ipv4.ip_forward=1
      - net.ipv4.conf.all.src_valid_mark=1
```
## password as hashed password 
```shell
vim .env
password = ${hashed password}
```
