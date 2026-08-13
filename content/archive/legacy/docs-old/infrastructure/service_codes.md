# systemd units for a Spring Boot backend and static frontend

These archived units assume a dedicated host and fixed paths. Replace every placeholder after confirming the artifact names, runtime users, ports, and rollback artifact. Do not run an application as a personal login account in production unless that ownership decision is explicit.

## Backend unit

`/etc/systemd/system/backend.service`:

```ini
[Unit]
Description=Spring Boot backend
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=backend
Group=backend
WorkingDirectory=/server/backend
EnvironmentFile=-/etc/backend/backend.env
ExecStart=/usr/bin/java -jar /server/backend/app.jar
Restart=on-failure
RestartSec=5s
TimeoutStopSec=30s
SuccessExitStatus=143
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

## Frontend unit

Use a supported static-file server. The binary and build path below are explicit placeholders, not discovered defaults.

```ini
[Unit]
Description=Static frontend
After=network-online.target

[Service]
Type=simple
User=frontend
Group=frontend
WorkingDirectory=/server/frontend
ExecStart=/usr/bin/caddy file-server --root /server/frontend/dist --listen :3000
Restart=on-failure
RestartSec=5s
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

## Apply with a rollback path

```bash
sudo systemd-analyze verify /etc/systemd/system/backend.service
sudo systemd-analyze verify /etc/systemd/system/frontend.service
sudo systemctl daemon-reload
sudo systemctl enable --now backend.service frontend.service
sudo systemctl status backend.service frontend.service
sudo journalctl -u backend.service -u frontend.service -n 100 --no-pager
```

Keep the previous unit files and application artifacts until both services restart successfully and their HTTP readiness checks return the expected status and content. If either check fails, restore the previous artifact and unit, reload systemd, and record the first failing log line.
