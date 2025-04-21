#/bin/sh
docker run -e ARANGO_NO_AUTH=2 -p 8529:8529 -d --name arangodb arangodb:3.12.4
sleep 60

curl http://localhost:8529/_db/_system/_api/aql-builtin | json_pp > data/aql-functions.json
node ./generateData.js

docker stop arangodb
docker container rm arangodb
docker volume prune -f
