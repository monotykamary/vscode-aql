#/bin/sh
sudo docker run -e ARANGO_NO_AUTH=2 -p 8529:8529 -d --name arangodb arangodb:3.9.1
sleep 20

curl http://localhost:8529/_db/_system/_api/aql-builtin | json_pp > data/aql-functions.json
node ./generateData.js

sudo docker stop arangodb
sudo docker container rm arangodb
sudo docker volume prune -f
