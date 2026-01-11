    $ docker run \
    -d \
    --restart=always \
    --name=redis \
    -p 6379:6379 \
    -e TZ=Asia/Seoul \
    -v /srv/workspace/redis/redis.conf:/etc/redis/redis.conf \
    -v redis_data:/data \
    redis:7.0.2 redis-server /etc/redis/redis.conf
    
## binding redis.conf file
    $ docker pull redis
#### docker run 
    sudo mkdir -p /your/local/binding/redis
    $ docker run -d --name redis_test -p 6379:6379 \
    -v /your/local/binding/redis/redis.conf:/usr/local/etc/redis/redis.conf \
    redis redis-server --requirepass "custom password"
    $ docker exec -it redis-test bash
    $ apt-get update && apt-get install vim
    $ vim /usr/local/etc/redis/redis.conf
    $ bind 0.0.0.0
    $ exit
    $ docker restart redis-test
    
## springboot REDIS
```
@Bean
    public RedisConnectionFactory redisConnectionFactory(){
        RedisStandaloneConfiguration redisStandaloneConfiguration = new         
       RedisStandaloneConfiguration();
        redisStandaloneConfiguration.setHostName(host);
        redisStandaloneConfiguration.setPort(port);
        redisStandaloneConfiguration.setPassword(password);
        return new LettuceConnectionFactory(redisStandaloneConfiguration);
    }


    @Bean
    public RedisTemplate<?, ?> redisTemplate() {
        RedisTemplate<?, ?> redisTemplate = new RedisTemplate<>();
        redisTemplate.setKeySerializer(new StringRedisSerializer());
        redisTemplate.setValueSerializer(new StringRedisSerializer());
        redisTemplate.setConnectionFactory(redisConnectionFactory());
        return redisTemplate;
    }
```
