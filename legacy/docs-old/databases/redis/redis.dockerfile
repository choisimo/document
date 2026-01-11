FROM redis:latest

COPY redis.conf /usr/local/etc/redis/redis.conf

CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]


# docker run -v /myredis/conf:/usr/local/etc/redis -- name myredis redis redis-server /usr/local/etc/redis/redis.conf
# redis.conf 파일은 미리 만들어 두어야 함 
# docker build -t redis-image redis.dockerfile . 로 빌드 후
# docker run --name redis1 -d redis-image 로 실행하기
