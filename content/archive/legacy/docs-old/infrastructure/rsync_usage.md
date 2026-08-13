# Rsync over a non-default SSH port

Use this procedure when the source and destination are already identified and SSH listens on a known non-default port. The example values are placeholders.

## Preview

```bash
rsync -a --dry-run --itemize-changes \
  -e 'ssh -p <SSH_PORT>' \
  /mnt/nas/backup/ \
  <USER>@<HOST>:/mnt/nas/files/backup/040825/
```

- `-a` preserves the archive-mode attributes that rsync can represent at the destination.
- `--dry-run` computes changes without writing them.
- `--itemize-changes` exposes what rsync intends to create, update, or delete.
- `-e` supplies the SSH command and port.
- The source trailing slash means “copy this directory's contents.”

Add `-z` only after measuring whether compression helps; it can waste CPU on already compressed media. Do not add `--delete` until the destination scope and a recoverable backup are confirmed.

## Execute and record the result

After reviewing the preview, remove only `--dry-run`:

```bash
rsync -a --itemize-changes \
  -e 'ssh -p <SSH_PORT>' \
  /mnt/nas/backup/ \
  <USER>@<HOST>:/mnt/nas/files/backup/040825/
status=$?
printf 'rsync_exit=%s\n' "$status"
```

An exit status of zero is transfer evidence, not destination-content evidence. Check the destination file count, expected sentinel files, ownership, and checksums required by the backup policy.

For repeated use, put `HostName`, `User`, `Port`, and `IdentityFile` under a named host in `~/.ssh/config`; then use that host alias in rsync. Test the alias with `ssh -G <ALIAS>` and a direct connection before running the transfer.
