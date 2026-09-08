# Redis container configuration and connection boundary

This archived example runs one Redis instance from an explicit configuration file. Replace paths, image digest, credentials, and allowed networks for the target environment.

## Prepare the configuration

Create `/srv/workspace/redis/redis.conf` with at least the intended listener, protected-mode, persistence, and authentication settings. Do not store a real password in this document or pass it directly on a shared command line.

```conf
bind 0.0.0.0
protected-mode yes
appendonly yes
aclfile /run/secrets/redis-users.acl
```

Binding to `0.0.0.0` is only appropriate when the Docker publish address and host firewall restrict clients. For host-local access, publish to `127.0.0.1` as shown below.

```bash
docker run -d \
  --restart unless-stopped \
  --name redis \
  -p 127.0.0.1:6379:6379 \
  -e TZ=Asia/Seoul \
  -v /srv/workspace/redis/redis.conf:/usr/local/etc/redis/redis.conf:ro \
  -v /srv/workspace/redis/users.acl:/run/secrets/redis-users.acl:ro \
  -v redis_data:/data \
  redis:7.0.2 redis-server /usr/local/etc/redis/redis.conf
```

Pinning only a tag does not make the artifact immutable. Record the resolved image digest when reproducibility is required.

## Verify the running state

```bash
docker ps --filter name=redis
docker logs --tail 50 redis
docker exec redis redis-cli --user app --askpass PING
docker restart redis
docker exec redis redis-cli --user app --askpass GET persistence-check
```

Use an application-specific ACL user rather than the default user. Completion requires authenticated connectivity from the allowed client, rejection from a denied network, and data availability after a container restart when persistence is required.

## Spring connection factory example

```java
@Bean
RedisConnectionFactory redisConnectionFactory(RedisProperties properties) {
    RedisStandaloneConfiguration server = new RedisStandaloneConfiguration();
    server.setHostName(properties.getHost());
    server.setPort(properties.getPort());
    server.setUsername(properties.getUsername());
    server.setPassword(RedisPassword.of(properties.getPassword()));
    return new LettuceConnectionFactory(server);
}
```

Property names and TLS options depend on the Spring Boot version. Keep credentials outside source control and confirm the effective connection settings at application startup without logging the secret.
