#!/bin/bash

CONTAINER_NAME="dzp-api"
CPU_THRESHOLD=95
RESTART_THRESHOLD=3
INTERVAL=5

count=0
echo "---Start monitor ${CONTAINER_NAME} CPU usage(interval: ${INTERVAL}s, cpu threshold: ${CPU_THRESHOLD}%, restart count threshold: ${RESTART_THRESHOLD})"
while true
do
  cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" $CONTAINER_NAME | cut -d'%' -f1)
  cpu_usage=${cpu_usage%.*}

  if [ $cpu_usage -gt $CPU_THRESHOLD ]; then
    ((count++))
    echo "---CPU usage for $CONTAINER_NAME is above the threshold: $cpu_usage%, hits: ${count}/${RESTART_THRESHOLD}"

    if [ $count -eq $RESTART_THRESHOLD ]; then
      echo "!!!Restarting $CONTAINER_NAME..."
      docker restart $CONTAINER_NAME
      count=0  # 重置计数器
    fi
  else
    count=0  # CPU 使用率低于阈值时，重置计数器
  fi

  sleep ${INTERVAL}
done