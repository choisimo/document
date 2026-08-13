# 1. main architecture

> **Archived design hypothesis:** This document combines Cloudflare proxying, Tailscale Funnel, Caddy, and an origin service. Those layers create two public-edge and TLS paths unless each responsibility is explicitly constrained. Confirm the installed Tailscale and Caddy versions from local commands and current vendor documentation; the version phrases below are not a support guarantee.

Before implementation, choose which component owns public DNS, TLS termination, user authentication, and origin reachability. Record the allowed request path and prove that alternate paths cannot bypass the chosen policy. Store Cloudflare tokens in a secret provider with the minimum DNS scope.
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
        # Trust the tailnet origin certificate or a configured private CA.
        # Do not disable certificate verification as a permanent fix.
    }
}
```

# 4. Tailscale Funnel 

Funnel makes a service reachable from the public internet. Do not enable it merely to connect two private components. Check the exact command syntax with `tailscale funnel --help`, restrict the exposed service, and define the command that removes the exposure before enabling it.
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

Treat DNS resolution, TLS validation, policy authorization, proxy routing, and origin health as separate gates. Completion requires an allowed external request, a denied unauthorized request, verified TLS, no direct origin bypass, correlated logs across the selected layers, and successful removal of public exposure.
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
