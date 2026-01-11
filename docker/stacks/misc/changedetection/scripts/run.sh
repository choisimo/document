# https://github.com/dgtlmoon/changedetection.io

docker run -d --restart always -p 5000:5000 -v /workspace/docker/changedetection/datastore:/datastore --name changedetection.io dgtlmoon/changedetection.io
