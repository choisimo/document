# Redis network binding note

Redis commonly starts with loopback-only access in distribution packages, but the effective value depends on the image, package, version, and loaded configuration file. Do not infer exposure from a sample default.

## Check the effective boundary

```bash
redis-cli CONFIG GET bind
redis-cli CONFIG GET protected-mode
ss -ltnp | grep ':6379'
```

- `127.0.0.1` or `::1` limits the listener to the local host.
- `0.0.0.0` or `::` can expose the listener on multiple interfaces; firewall, authentication, and TLS must then be evaluated separately.
- A container port is not reachable from outside merely because Redis listens in the container. Docker publish rules and host firewall rules also determine reachability.

## Completion criteria

Use a client from an explicitly allowed network and one from a denied network. The allowed client must authenticate and complete a `PING`; the denied client must fail before Redis command execution. Record the Redis version, config path, listener addresses, publish rules, and firewall rule used for the check.

The historical screenshot below is supporting context only and does not prove the current runtime configuration.

![Historical Redis binding screenshot](https://github.com/choisimo/cli-commands/assets/150008602/f35bad6b-b5de-491c-ad06-be68ff236817)
