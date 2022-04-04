#!/bin/sh
podman run --name iztiarDB \
    -v /home/pierre/data/eclipse/iztiar-core/db:/etc/mongo \
    -v /var/lib/iztiar/db:/data/db \
    -p 24017:27017 \
    -e MONGO_INITDB_ROOT_USERNAME_FILE=/etc/mongo/root.username \
    -e MONGO_INITDB_ROOT_PASSWORD_FILE=/etc/mongo/root.passwd \
    -d mongo:latest \
    --config /etc/mongo/mongod.yml
