#!/bin/bash

CONTAINER_NAME="dzp-api"
RESTART_THRESHOLD=3
CPU_THRESHOLD=95

count=0
while true
do
  cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" $CONTAINER_NAME | cut -d'%' -f1)
  cpu_usage=${cpu_usage%.*}

  if [ $cpu_usage -gt $CPU_THRESHOLD ]; then
    ((count++))
    echo "CPU usage for $CONTAINER_NAME is above the threshold: $cpu_usage%"

    if [ $count -eq $RESTART_THRESHOLD ]; then
      echo "Restarting $CONTAINER_NAME..."
      docker restart $CONTAINER_NAME
      count=0  # 重置计数器
    fi
  else
    count=0  # CPU 使用率低于阈值时，重置计数器
  fi

  sleep 5
done