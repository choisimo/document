# Nginx custom 50x error pages

This example replaces responses with status `500`, `502`, `503`, or `504` after Nginx has selected an error page. The files must exist under the alias directory with names such as `500.html` and `502.html`.

```nginx
error_page 500 502 503 504 /_errors/$status.html;

location ^~ /_errors/ {
    internal;
    alias /var/www/html/error_html/50x/;
}
```

`internal` prevents clients from requesting the error assets as ordinary public paths. With `alias`, the request `/ _errors/502.html` conceptually maps to `/var/www/html/error_html/50x/502.html` after removing the space shown here only for explanation; the actual location is `/_errors/`.

For errors returned by a proxied upstream, enable interception in the location that owns `proxy_pass`:

```nginx
location /api/ {
    proxy_pass http://backend;
    proxy_intercept_errors on;
}
```

Do not enable interception if the application response body must reach the client unchanged. Apply the change only after `nginx -t` succeeds. Verify one locally generated error and one upstream error, including status, body, content type, and absence of an external redirect.
