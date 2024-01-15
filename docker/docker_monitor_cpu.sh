#!/bin/bash

# 检测Docker的CPU使用率阈值
cpu_threshold=95

# 获取所有正在运行的Docker容器ID
container_ids=$(docker ps -q)

# 遍历每个容器ID，并检测其CPU使用率
for container_id in $container_ids; do
    container_name=$(docker inspect --format '{{.Name}}' $container_id | sed 's|/||')
    container_cpu=$(docker stats --no-stream --format "{{.Name}} {{.CPUPerc}}" $container_id | awk '{print $2}' | awk -F'%' '{print $1}')

    # 检查容器的CPU使用率是否超过阈值
    if (( $(echo "$container_cpu > $cpu_threshold" | bc -l) )); then
        echo "Container $container_name CPU usage is above the threshold. Restarting container..."
        docker restart $container_id
    fi
done
