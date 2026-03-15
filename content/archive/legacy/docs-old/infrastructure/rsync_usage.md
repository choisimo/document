# How to Use Rsync with a Custom SSH Port

The error message you're seeing occurs because rsync is attempting to connect to the default SSH port (22) rather than your specified port (2722). The `--port` option is not used correctly in your command, as it doesn't apply to the SSH connection that rsync establishes.

## The Issue with Your Command

Your current command:
```
sudo rsync -avz /mnt/nas/backup/* --port 2722 nodove@30.30.30.3:/mnt/nas/files/백업/040825/
```

This command is trying to use `--port 2722` as an rsync option, but rsync doesn't use this syntax for specifying SSH ports. Instead, rsync is still attempting to connect to the default SSH port (22), resulting in the "Connection refused" error.

## The Correct Syntax

To specify a custom SSH port with rsync, you need to use the `-e` option, which allows you to specify the remote shell command and its parameters. The correct syntax is:

```
sudo rsync -avz -e "ssh -p 2722" /mnt/nas/backup/* nodove@30.30.30.3:/mnt/nas/files/백업/040825/
```

This command tells rsync to use SSH with port 2722 for the connection. The `-e` option stands for "specify the remote shell to use," and in this case, we're telling it to use SSH with a specific port option.

### Understanding the Parameters

- `-a`: Archive mode, which preserves permissions, ownership, timestamps, etc.
- `-v`: Verbose output to show the transfer progress
- `-z`: Compress the data during transfer to speed up the process
- `-e "ssh -p 2722"`: Use SSH as the remote shell with port 2722

## Alternative Methods

If you frequently connect to this server using the same port, you can configure the SSH client to always use this port for a specific host. Add the following to your `~/.ssh/config` file:

```
Host 30.30.30.3
    Port 2722
```

With this configuration, you can simplify your rsync command to:

```
sudo rsync -avz /mnt/nas/backup/* nodove@30.30.30.3:/mnt/nas/files/백업/040825/
```

## Conclusion

The key to using rsync with a non-standard SSH port is to use the `-e` option to specify SSH with the correct port number. This allows rsync to establish a secure connection over your preferred port. By implementing this change, your file synchronization should proceed without connection errors, as long as the destination server is configured to accept SSH connections on port 2722.
