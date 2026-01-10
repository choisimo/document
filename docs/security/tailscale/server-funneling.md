# 1. main architecture
#### network route
```text
[client] → (HTTPS) [custom-domain] → [Cloudflare] → [Tailscale Funnel] → [Caddy] → [local-service]
```

# 2. Pre-Require
-   Tailscale (over **v1.66**) [tailscale-vpn](https://tailscale.com/)
-   Caddy (over **v2.8**) [caddy-docker](https://hub.docker.com/_/caddy)
-   custom domain [CF dashboard](https://dash.cloudflare.com/)

# 3. Caddyfile Setting
```shell
# Global options
{
    # Tailscale plugin (Optional)
    order tailscale before reverse_proxy
}

# Cloudflare DNS-01 certificate
(yourdomain_tls) {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
        resolvers 1.1.1.1
    }
}

# service proxy
service1.yourdomain.com {
    import yourdomain_tls
    reverse_proxy https://your-tailnet-host.ts.net:8443 {
        header_up Host {http.request.host}
        transport http {
            tls_insecure_skip_verify
        }
    }
}
```

# 4. Tailscale Funnel 
```bash
sudo tailscale funnel --set-ports=8443
sudo tailscale funnel 8443 on

tailscale funnel status --json | jq
```

# 5. DNS setting 

| **type** |     **name**     |     **value**    | **TTL** | **proxy** |
|:--------:|:----------------:|:----------------:|:-------:|:---------:|
|     A    |  domainname.com  |       IPv4       |   Auto  |  for DNS  |
|   CNAME  | *.domainname.com | tail-host.ts.net |   Auto  |    none   |

# 6. tailscale node ACL 

#### official-DOCS [tailscale ACL-syntax](https://tailscale.com/kb/1337/acl-syntax)
```json
{
    "nodeAttrs": [
        {
            "target": ["tag:caddy"],
            "attr": ["funnel"]
        }
    ],
    "ssh": {
        "action": "check",
        "src": ["autogroup:members"],
        "dst": ["tag:caddy"]
    }
}
```

# 7. Trouble-shooting
```bash
# check CNAME
dig +short yourdomain.com @1.1.1.1

# TLS cert authentication
openssl s_client -connect yourdomain.com:8443 -servername yourdomain.com

# logging
journalctl -u caddy -f | grep -E 'tailscale|ERROR'

# if stateful filtering error : upgrade or use command below
tailscale up --stateful-filtering=false
```
