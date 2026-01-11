## implementation
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'
### configuration
    @Configuration
    public class redisCacheConfig {
    
        @Value("${spring.data.redis.host}")
        private String host;
    
        @Value("${spring.data.redis.port}")
        private int port;
    
        // Redis connection factory
        @Bean
        public RedisConnectionFactory redisConnectionFactory(){
            return new LettuceConnectionFactory(host, port);
        }
    
        @Bean
        public RedisTemplate<?,?> redisTemplate(){
            RedisTemplate<?,?> redisTemplate = new RedisTemplate<>();
    
            redisTemplate.setKeySerializer(new StringRedisSerializer());
            redisTemplate.setValueSerializer(new StringRedisSerializer());
    
            redisTemplate.setConnectionFactory(redisConnectionFactory());
            return redisTemplate;
        }
    }

