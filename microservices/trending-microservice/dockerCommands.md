docker-compose logs --no-log-prefix kafka > kafka_logs.txt

docker ps

docker-compose up --build

docker exec -it trending-microservice_kafka_1 kafka-topics --create --topic video-events --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1

docker exec -it trending-microservice_kafka_1 kafka-topics --create --topic subscription-events --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1

docker build -t trendingmicroservices:version1 .

docker run -p 8000:4000 -d <image-name>:<tag>
docker run -p 4000:4000 trendingmicroservices:version1

docker-compose restart postgres

docker stop $(docker ps -a -q);
docker rm $(docker ps -a -q);

sudo systemctl restart docker.socket docker.service

docker exec -it trending-microservice_kafka_1 bash
cd /etc/kafka
echo "auto.create.topics.enable=true" >> server.properties

sudo systemctl restart docker.socket docker.service
sudo docker image rm -f $(sudo docker image ls -q)

sudo snap list

sudo snap remove docker --purge
sudo aa-remove-unknown