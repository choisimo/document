# Understanding Rsync Port Configuration: Why --port=2722 Is Not Working

The terminal output shown in the query displays an rsync connection issue when attempting to use a custom port (2722). Despite specifying this port parameter, the connection attempts are still targeting the default SSH port (22) and failing with "Connection refused" errors. This report explains why the port specification isn't working as expected and how to correctly configure rsync to use a custom SSH port.

## The Core Issue: Misunderstanding Rsync Port Parameters

The primary issue in the command being executed is a misunderstanding of how rsync handles port specifications when using SSH as the transfer protocol. Looking at the terminal output, we can see multiple failed attempts to connect using commands like:

```
sudo rsync -avz ./* nodove@30.30.30.3:/mnt/nas/files/backup/040825 --port=2722
```

These commands consistently result in:

```
ssh: connect to host 30.30.30.3 port 22: Connection refused
rsync: connection unexpectedly closed (0 bytes received so far) [sender]
rsync error: unexplained error (code 255) at io.c(232) [sender=3.2.7]
```

### Why --port Doesn't Work for SSH Connections

The `--port` option in rsync is intended for use with the rsync daemon protocol (when using `rsync://` URLs), not for SSH connections. When rsync is used with an SSH transport (which is the default when specifying a remote location as `user@host:path`), it establishes the connection using SSH's default mechanisms, which means port 22 unless specified otherwise.

## The Correct Approach: Using the -e Option

To specify a custom SSH port for rsync, you need to use the `-e` option to provide an alternate remote shell command that includes the port specification. This instructs rsync about how to establish the SSH connection.

The correct command format should be:

```
rsync -avz -e 'ssh -p 2722' ./* nodove@30.30.30.3:/mnt/nas/files/backup/040825
```

This command tells rsync to use SSH with port 2722 when connecting to the remote server.

## Common Causes of Connection Refused Errors

Even with correct port specification, "Connection refused" errors can occur for several reasons:

1. **SSH service not running** on the remote server at the specified port
2. **Firewall blocking** the connection to the specified port
3. **Incorrect SSH configuration** on the remote server
4. **Network routing issues** between local and remote machines

## Troubleshooting Steps

If connection issues persist after correcting the port specification method, consider these troubleshooting steps:

1. **Verify SSH service status** on the remote server:
   ```
   sudo systemctl status sshd
   ```

2. **Check listening ports** on the remote server:
   ```
   sudo netstat -tuln | grep 2722
   ```

3. **Test direct SSH connection** to verify SSH accessibility:
   ```
   ssh -p 2722 nodove@30.30.30.3
   ```

4. **Check firewall rules** to ensure the port is open:
   ```
   sudo iptables -L -n
   ```

5. **Examine SSH configuration** on the remote server to confirm it's listening on port 2722

## Conclusion

The rsync command in the example fails because the `--port` parameter doesn't affect the SSH connection's port. For rsync transfers over SSH, the correct approach is to use the `-e` option to specify the SSH command with the desired port. This ensures that rsync will connect to the remote server using the specified port rather than defaulting to port 22.
