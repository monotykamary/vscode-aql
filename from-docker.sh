#/bin/sh
sudo docker run -e ARANGO_NO_AUTH=1 -p 8529:8529 -d --name arangodb arangodb
sleep 10

curl http://localhost:8529/_db/_system/_api/aql-builtin | json_pp > data/aql-functions.json
node ./generateData.js

sudo docker stop arangodb
sudo docker container prune -f
sudo docker volume prune -f
