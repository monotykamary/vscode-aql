#/bin/sh
podman run -e ARANGO_NO_AUTH=2 -p 8529:8529 -d --name arangodb arangodb:3.12.0
sleep 20

curl http://localhost:8529/_db/_system/_api/aql-builtin | json_pp > data/aql-functions.json
node ./generateData.js

podman stop arangodb
podman container rm arangodb
podman volume prune -f
