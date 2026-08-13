# Diagnose an rsync connection that uses the wrong SSH port

This note applies to the remote-shell form `user@host:path`. In that form rsync launches SSH, so rsync's `--port` option does not select the SSH port. `--port` belongs to the rsync daemon protocol, such as `rsync://host/module`.

## Expected and observed states

- **Expected:** SSH connects to the target host on port `2722`, then rsync starts on the remote side.
- **Observed example:** the error says `ssh: connect to host ... port 22`, so the custom port never reached SSH.

## Test the transport first

```bash
ssh -vv -p 2722 user@example-host
```

Interpret the failure before changing rsync:

- `Connection refused`: the address responded but no service accepted that port, or a firewall rejected it.
- `Connection timed out`: routing or a firewall silently dropped the connection.
- `Permission denied`: transport works; inspect the SSH user, key, and server authentication policy.
- Successful shell or forced-command response: proceed to rsync.

Use the SSH port through rsync's remote-shell option:

```bash
rsync -a --dry-run --itemize-changes \
  -e 'ssh -p 2722' \
  ./ user@example-host:/srv/backup/040825/
```

The trailing slash on `./` copies the directory contents, including dotfiles considered by rsync; a shell glob such as `./*` omits ordinary hidden entries. Review the dry-run before removing `--dry-run`.

## Persistent SSH configuration

```sshconfig
Host backup-host
    HostName example-host
    User user
    Port 2722
    IdentityFile ~/.ssh/backup_ed25519
```

```bash
rsync -a --dry-run --itemize-changes ./ backup-host:/srv/backup/040825/
```

Completion requires a successful SSH transport test, an rsync exit status of zero, and a destination-side listing or checksum check for the intended file set. A connection succeeding does not prove that every expected file transferred.
