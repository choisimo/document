#!/bin/bash

sleep 5
docker exec -it mongodb mongosh \
  -u 'admin-user' \
  -p 'admin-password' \
   --authenticationDatabase 'admin' \
   --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'mongodb:27017'}]})"

