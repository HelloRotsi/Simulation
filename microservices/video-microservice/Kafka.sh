su -l kafka
mkdir ~/kafka && cd ~/kafka

cd kafka

sudo systemctl start kafka
sudo systemctl status kafka
sudo systemctl enable zookeeper
sudo systemctl enable kafka
/home/kafka/kafka/bin/kafka-topics.sh --create --topic video-events --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
/home/kafka/kafka/bin/kafka-topics.sh --create --topic subscription-events --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
/home/kafka/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092

kafka-topics --create --bootstrap-server localhost:9092 --replication-factor 1 --partitions 1 --topic video-events

