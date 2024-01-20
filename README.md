# Texas Poker Game

This is an online Texas Hold'em game, base on TypeScript,Egg,Node.js,Vue

## Deploy

[Github Action](https://github.com/yujunhui/TexasPokerGame/actions/workflows/build-and-push.yml)

## Docker start

```bash
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml build api --no-cache
```

Build specify service:

```bash
docker-compose -f docker-compose.prod.yml build --no-cache api
docker-compose -f docker-compose.prod.yml build --no-cache nginx
```

## Server

Base on midway.js, TypeScript, socket.io, mysql.

Detail: [server-readme](./server/README.md)

## Client

Base on vue-cli, TypeScript, socket.io.

Detail: [client-readme](./client/README.md)

## Project structure

``` plain
├─client
├─database
│  └─poker.sql
├─docker
└─server
```

## License

The MIT License (MIT)
