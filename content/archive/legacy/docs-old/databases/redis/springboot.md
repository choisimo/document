# Spring Boot connection to Redis

This example shows the boundary between application configuration and a standalone Redis server. Confirm the Spring Boot and Spring Data Redis versions before adopting property names or serializer defaults.

## Dependency

```groovy
implementation 'org.springframework.boot:spring-boot-starter-data-redis'
```

Use the dependency version managed by the selected Spring Boot release unless the project has a tested override.

## Configuration

```java
@Configuration
public class RedisConfig {

    @Bean
    RedisConnectionFactory redisConnectionFactory(RedisProperties properties) {
        RedisStandaloneConfiguration server = new RedisStandaloneConfiguration();
        server.setHostName(properties.getHost());
        server.setPort(properties.getPort());
        if (properties.getUsername() != null) {
            server.setUsername(properties.getUsername());
        }
        if (properties.getPassword() != null) {
            server.setPassword(RedisPassword.of(properties.getPassword()));
        }
        return new LettuceConnectionFactory(server);
    }

    @Bean
    RedisTemplate<String, String> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        StringRedisSerializer strings = new StringRedisSerializer();
        template.setKeySerializer(strings);
        template.setValueSerializer(strings);
        template.setHashKeySerializer(strings);
        template.setHashValueSerializer(strings);
        template.setConnectionFactory(connectionFactory);
        return template;
    }
}
```

The string serializer is suitable only when the value contract is text. For JSON or binary values, define a versioned serialization format and migration policy rather than changing serializers in place.

## Runtime evidence

1. Start the application with host, port, ACL username, password source, and TLS mode supplied by the target environment.
2. Confirm that startup does not print credentials.
3. Write a key with a test-specific prefix and read the same value back.
4. Test an authentication failure separately from a network failure.
5. Delete the test key and record the application and Redis versions used.

A bean being created proves only local configuration construction; the round-trip read is the completion evidence for connectivity.
