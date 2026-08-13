# Nginx reverse proxy note

This archived note retains a screenshot of an earlier `proxy_pass` configuration. The image does not identify the Nginx version, complete server block, upstream health, TLS boundary, or headers, so it is context rather than an executable configuration.

![Historical Nginx proxy_pass screenshot](https://github.com/choisimo/cli-commands/assets/150008602/839716a1-dbdd-4a7c-90b1-0f5c12e8a177)

## Minimum configuration contract

Before writing the location block, define:

- public scheme, host, and path accepted by Nginx;
- upstream scheme, address, port, and path semantics;
- whether the original host, client address, and scheme must be forwarded;
- connect, read, and send timeouts;
- request-body limit and WebSocket requirements;
- TLS verification and the trusted CA when the upstream uses HTTPS;
- health endpoint, expected status, and rollback configuration.

An illustrative HTTP upstream looks like this:

```nginx
location /app/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 3s;
    proxy_read_timeout 30s;
}
```

The trailing slash changes URI replacement semantics; choose it from an explicit example request and expected upstream path rather than copying it mechanically.

## Apply and verify

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -i https://<PUBLIC_HOST>/app/<HEALTH_PATH>
```

Keep the previous configuration until the public response, upstream log, forwarded headers, error path, and restart behaviour match the defined contract. A successful `nginx -t` proves syntax only, not end-to-end routing.
