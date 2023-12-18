'use strict';
import BaseSocketController from '../../../lib/baseSocketController';
import { IRoomInfo, ISit } from '../../../interface/IGameRoom';
import { EGameStatus, PokerGame } from '../../core/PokerGame';
import { IPlayer } from '../../core/Player';
import { ILinkNode, Link } from '../../../utils/Link';
import { IGame } from '../../../interface/IGame';
import { ICommandRecord } from '../../../interface/ICommandRecord';
import { IPlayerDTO } from '../../../interface/IPlayer';
import { Online, OnlineAction, P2PAction } from '../../../utils/constant';
import { EggLogger } from 'egg';

class GameController extends BaseSocketController {
  private async getSitDownPlayer(roomInfo: IRoomInfo): Promise<IPlayer[]> {
    let sitDownPlayer: IPlayer[] = [];
    // first game sitLink is null
    if (roomInfo.sitLink) {
      let currNode: ILinkNode<IPlayer> | null = roomInfo.sitLink;
      const currPlayer = currNode.node;
      sitDownPlayer.push(currNode.node);
      while (currNode && currPlayer.userId !== currNode.next?.node.userId) {
        const next: ILinkNode<IPlayer> | null = currNode.next;
        if (next) {
          sitDownPlayer.push(next.node);
        }
        currNode = next;
      }
    } else {
      sitDownPlayer = roomInfo.sit
        .filter((s) => s.player && s.player.counter > 0)
        .map((sit) => sit.player) as IPlayer[];
      if (sitDownPlayer.length < 2) {
        throw 'player not enough';
      }
      roomInfo.sitLink = new Link<IPlayer>(sitDownPlayer).link;
    }
    if (sitDownPlayer.length < 2) {
      throw 'player not enough';
    }
    return sitDownPlayer;
  }

  private async sendHandCard(roomInfo: IRoomInfo) {
    const playerRecordService = await this.app.applicationContext.getAsync('PlayerRecordService');
    for (const p of roomInfo.players) {
      const player = roomInfo.game?.allPlayer.find((player) => player.userId === p.userId);
      const msg = this.ctx.helper.parseMsg(
        P2PAction.HandCard,
        {
          handCard: player?.getHandCard(),
        },
        { client: p.socketId },
      );
      this.nsp.emit(p.socketId, msg);
      if (player) {
        const playerRecord: IPlayerDTO = {
          roomNumber: this.roomNumber,
          gameId: roomInfo.gameId || 0,
          userId: player.userId || '',
          buyIn: p.buyIn,
          counter: p.counter,
          handCard: player.getHandCard().join(',') || '',
        };
        const playerId = await playerRecordService.add(playerRecord);
        player.playerId = playerId.insertId;
        const cardsLogger = this.app.getLogger('cardsLogger') as EggLogger;
        cardsLogger.info(`room:${this.roomNumber} ${player.nickName} cards: `, player.getFormattedHandCard());
      }
    }
  }

  /**
   * Play game
   */
  async playGame() {
    try {
      const roomInfo = await this.getRoomInfo();
      const gameService = await this.app.applicationContext.getAsync('GameService');
      const PlayerService = await this.app.applicationContext.getAsync('PlayerRecordService');
      const sitDownPlayer = await this.getSitDownPlayer(roomInfo);
      console.log('roomConfig-------------------', roomInfo.config);
      if (!roomInfo.game) {
        roomInfo.game = null;
        roomInfo.game = new PokerGame({
          users: sitDownPlayer,
          isShort: roomInfo.config.isShort,
          smallBlind: roomInfo.config.smallBlind,
          actionRoundComplete: async () => {
            let slidePots: number[] = [];
            if (roomInfo.game) {
              console.log('come in', roomInfo.game.status);
              if (roomInfo.game.status < 6 && roomInfo.game.playerSize > 1) {
                // roomInfo.game.sendCard();
                // roomInfo.game.startActionRound();
                // has allin，deal slide pot
                if (roomInfo.game.allInPlayers.length > 0) {
                  slidePots = roomInfo.game.slidePots;
                }
                this.adapter(Online, OnlineAction.ActionComplete, {
                  slidePots,
                  actionEndTime: roomInfo.game.actionEndTime,
                  commonCard: roomInfo.game.commonCard,
                });
              }
            }
          },
          gameOverCallBack: async () => {
            if (roomInfo.game) {
              // game over
              roomInfo.game.allPlayer.forEach((gamePlayer) => {
                console.log('player =================== game over', gamePlayer);
                const player = roomInfo.players.find((p: IPlayer) => p.userId === gamePlayer.userId);
                const sit = roomInfo.sit.find((s: ISit) => s.player?.userId === gamePlayer.userId);
                if (player && sit) {
                  player.counter = gamePlayer.counter;
                  player.voluntaryActionCountAtPreFlop = gamePlayer.voluntaryActionCountAtPreFlop;
                  player.totalActionCountAtPreFlop = gamePlayer.totalActionCountAtPreFlop;
                  player.vpip = gamePlayer.vpip;
                  player.actionCommand = '';
                  player.actionSize = 0;
                  player.type = '';
                  sit.player!.counter = gamePlayer.counter;
                  sit.player!.voluntaryActionCountAtPreFlop = gamePlayer.voluntaryActionCountAtPreFlop;
                  sit.player!.totalActionCountAtPreFlop = gamePlayer.totalActionCountAtPreFlop;
                  sit.player!.vpip = gamePlayer.vpip;
                  sit.player!.actionCommand = '';
                  sit.player!.actionSize = 0;
                  sit.player!.type = '';
                }
              });
              console.log('allPlayer =================== game over', roomInfo.game.allPlayer);
              if (roomInfo.game.status === EGameStatus.GAME_OVER) {
                let winner: any = [
                  [
                    {
                      ...roomInfo.game.winner[0][0],
                      handCard: [],
                    },
                  ],
                ];
                let allPlayers = winner[0];
                // only player, other fold
                if (roomInfo.game.getPlayers().length !== 1) {
                  winner = roomInfo.game.winner;
                  allPlayers = roomInfo.game.getPlayers();
                }
                this.adapter(Online, OnlineAction.GameOver, {
                  winner,
                  allPlayers,
                  commonCard: roomInfo.game.commonCard,
                });
                // new game
                setTimeout(() => {
                  this.reStart();
                }, 7000);
              }
            }
            // update game info
            const gameRecord: IGame = {
              id: roomInfo.gameId,
              pot: roomInfo.game?.pot || 0,
              commonCard: roomInfo.game?.commonCard.join(',') || '',
              winners: JSON.stringify(roomInfo.game?.winner).replace(' ', ''),
              status: roomInfo.game?.gameOverType || 0,
            };
            const result = await gameService.update(gameRecord);
            if (!result.succeed) {
              throw 'update game error';
            }

            // update player counter
            if (roomInfo.game) {
              for await (const p of roomInfo.game.allPlayer) {
                const uPlayer = {
                  playerId: p.playerId,
                  counter: p.counter,
                  userId: p.userId,
                  gameId: roomInfo.gameId || 0,
                };
                PlayerService.update(uPlayer);
              }
            }
            this.saveFullRecordAndClean(this.roomNumber);
          },
          autoActionCallBack: async (command, userId) => {
            // fold change status: -1
            if (command === 'fold') {
              roomInfo.players.forEach((p) => {
                if (p.userId === userId) {
                  p.status = -1;
                }
              });
              console.log('roomInfo', roomInfo.players);
              roomInfo.sit.forEach((s: ISit) => {
                if (s.player && s.player.userId === userId) {
                  delete s.player;
                }
              });
            }
            this.updateFullRecord(command);
            this.updateGameInfo();
            console.log('auto Action');
          },
        });
        roomInfo.game.play();
        // roomInfo.game.startActionRound();
        console.log('hand card', roomInfo.game.allPlayer);
        // update counter, pot, status
        this.updateGameInfo();
        // add game record
        const gameRecord: IGame = {
          roomNumber: this.roomNumber,
          pot: 0,
          commonCard: '',
          status: 0,
        };
        const result = await gameService.add(gameRecord);
        if (result.succeed) {
          roomInfo.gameId = result.id;
        } else {
          throw 'game add error';
        }
        await this.sendHandCard(roomInfo);
        // add game BB SB action record
        const BB = roomInfo.game.BBPlayer;
        const SB = roomInfo.game.SBPlayer;
        const BBCommandRecord: ICommandRecord = {
          roomNumber: this.roomNumber,
          userId: BB.userId,
          type: BB.type,
          gameStatus: 0,
          pot: roomInfo.config.smallBlind * 3,
          commonCard: '',
          command: `bb:${roomInfo.config.smallBlind * 2}`,
          gameId: result.id,
          counter: BB.counter,
        };
        const SBCommandRecord: ICommandRecord = {
          roomNumber: this.roomNumber,
          userId: SB.userId,
          type: SB.type,
          gameStatus: 0,
          pot: roomInfo.config.smallBlind,
          commonCard: '',
          command: `sb:${roomInfo.config.smallBlind}`,
          gameId: result.id,
          counter: SB.counter,
        };
        const commandRecordService = await this.app.applicationContext.getAsync('CommandRecordService');
        const sbRecordResult = await commandRecordService.add(SBCommandRecord);
        const bbRecordResult = await commandRecordService.add(BBCommandRecord);
        console.log(bbRecordResult, sbRecordResult);
        if (!sbRecordResult.succeed || !bbRecordResult.succeed) {
          throw 'command add error';
        }
      } else {
        throw 'game already paling';
      }
    } catch (error) {
      this.app.logger.error(error);
    }
  }

  async reStart() {
    try {
      const roomInfo = this.getRoomInfo();
      const dealer = roomInfo.game?.allPlayer.filter((gamePlayer) => {
        return !!roomInfo.sit.find(
          (s) =>
            s.player?.userId === gamePlayer.userId &&
            s.player.counter > 0 &&
            s.player?.userId !== roomInfo.sitLink?.node.userId,
        );
      })[0];
      console.log('dealer -------', dealer);
      roomInfo.game = null;
      // init player status
      roomInfo.players.forEach((p) => {
        p.status = 0;
      });
      console.log('sit =======', roomInfo.sit);
      console.log('roomInfo =======', roomInfo);
      roomInfo.sit.forEach((s: ISit) => {
        if (s.player) {
          const player = roomInfo.players.find((p) => p.userId === s.player?.userId);
          if (player) {
            // calculate re buy in
            s.player.counter = player.counter;
            s.player.counter += Number(player.reBuy);
            s.player.voluntaryActionCountAtPreFlop = player.voluntaryActionCountAtPreFlop;
            s.player.totalActionCountAtPreFlop = player.totalActionCountAtPreFlop;
            s.player.vpip = player.vpip;
            console.log('cal reBuy ===============================', s.player, player.reBuy);
            player.reBuy = 0;
            s.player.reBuy = 0;
            // init player delay count
            player.delayCount = 3;
          }
        }
      });

      // clear counter not enough player
      roomInfo.sit.forEach((s: ISit) => {
        if (s.player && s.player.counter === 0) {
          delete s.player;
        }
      });

      const players = roomInfo.sit.filter((s) => s.player && s.player.counter > 0).map((s) => s.player) || [];
      let link: ILinkNode<IPlayer> | null = new Link<IPlayer>(players as IPlayer[]).link;
      if (players.length >= 2) {
        // init sit link
        console.log(players, 'players===========');
        while (link?.node.userId !== dealer?.userId) {
          link = link?.next || null;
        }
        roomInfo.sitLink = link;
        console.log('dealer ===================', dealer, link);
        // new game
        this.adapter(Online, OnlineAction.NewGame, {});
        await this.playGame();
      } else {
        roomInfo.sitLink = null;
        console.log('come in only one player');
        // player not enough
        this.adapter(Online, OnlineAction.Pause, {
          players: roomInfo.players,
          sitList: roomInfo.sit,
        });
      }
    } catch (e) {
      console.log(e + 'restart ex');
    }
  }

  async buyIn() {
    try {
      const userInfo: IPlayer = await this.getUserInfo();
      const roomInfo: IRoomInfo = await this.getRoomInfo();
      const { payload } = this.ctx.args[0] || {};
      const { buyInSize } = payload;
      // find current player
      const player = roomInfo.players.find((p: IPlayer) => p.userId === userInfo.userId);
      console.log(userInfo, 'userInfo------', player);
      const isGaming = !!roomInfo.game;
      if (player) {
        if (roomInfo.game) {
          const inTheGame = roomInfo.game.allPlayer.find((p) => p.userId === userInfo.userId);
          // player in the game, can't buy in
          if (inTheGame) {
            player.reBuy += Number(buyInSize);
            player.buyIn += Number(buyInSize);
            console.log('come in');
          } else {
            player.buyIn += Number(buyInSize);
            player.counter += Number(buyInSize);
          }
          console.log('user in the game------', player);
        } else {
          console.log('user not in the game------', player);
          player.buyIn += Number(buyInSize);
          player.counter += Number(buyInSize);
        }
      } else {
        const player: IPlayer = {
          ...userInfo,
          counter: Number(buyInSize),
          buyIn: Number(buyInSize),
        };
        roomInfo.players.push(player);
      }
      this.sendGameInfoToSpectators();
      console.log(player, 'buy in player', roomInfo.players);
      if (!isGaming) {
        this.adapter(Online, OnlineAction.Players, {
          players: roomInfo.players,
        });
        console.log('ont in the game', player);
      }
    } catch (e) {
      console.log(e);
    }
  }

  async handCard() {
    try {
      const userInfo: IPlayer = await this.getUserInfo();
      const roomInfo: IRoomInfo = await this.getRoomInfo();
      const player = roomInfo.players.find((p: IPlayer) => p.nickName === userInfo.nickName);
      console.log(userInfo, 'userInfo------');
      if (player && roomInfo.game) {
        const gamePlayer = roomInfo.game.allPlayer.find((p) => player.socketId === p.socketId);
        if (gamePlayer) {
          const msg = this.ctx.helper.parseMsg(
            P2PAction.HandCard,
            {
              handCard: gamePlayer.getHandCard(),
            },
            { client: player.socketId },
          );
          console.log(msg, 'game msg---------');
          this.nsp.emit(player.socketId, msg);
        }
      } else {
        throw 'game over';
      }
    } catch (e) {
      console.log(e);
    }
  }

  sitDown() {
    try {
      const { payload } = this.message;
      const sitList = payload.sitList;
      const roomInfo = this.getRoomInfo();
      console.log('sitList=============', sitList);
      console.log('roomInfo=============', roomInfo);
      roomInfo.sit = sitList;
      this.adapter(Online, OnlineAction.SitList, {
        sitList,
      });
      this.sendGameInfoToSpectators();
    } catch (e) {
      console.log(e);
    }
  }

  async standUp() {
    try {
      console.log('stand up');
      const userInfo: IPlayer = await this.getUserInfo();
      const roomInfo = await this.getRoomInfo();
      roomInfo.sit.forEach((s: ISit) => {
        if (s.player && s.player.userId === userInfo.userId) {
          delete s.player;
        }
      });
      this.updateGameInfo();
    } catch (e) {
      console.log(e);
    }
  }

  async delayTime() {
    try {
      const { payload } = this.message;
      const userInfo: IPlayer = await this.getUserInfo();
      const roomInfo = await this.getRoomInfo();
      console.log('delayTime: ', payload.command);
      console.log('delayTime: ', roomInfo.game && roomInfo.game.currPlayer.node, userInfo);
      if (roomInfo.game && roomInfo.game.currPlayer.node.userId === userInfo.userId) {
        roomInfo.game.delayActionTime();
        console.log('delayTime: ', roomInfo.game && roomInfo.game.currPlayer.node, userInfo);
        this.adapter(Online, OnlineAction.DelayTime, {
          actionEndTime: roomInfo.game.actionEndTime,
        });
      }
      this.sendGameInfoToSpectators();
    } catch (e) {
      console.log(e);
    }
  }

  async action() {
    try {
      const { payload } = this.message;
      const userInfo = await this.getUserInfo();
      const roomInfo = this.getRoomInfo();
      console.log('action: ', payload.command);
      console.log('action: ', roomInfo.game && roomInfo.game.currPlayer.node, userInfo);
      this.adapter(Online, OnlineAction.LatestAction, {
        latestAction: payload.command,
        userId: userInfo.userId,
        nickName: userInfo.nickName,
      });
      if (roomInfo.game && roomInfo.game.currPlayer.node.userId === userInfo.userId) {
        const currPlayer = roomInfo.game.currPlayer.node;
        const commonCard = roomInfo.game.commonCard;
        let status = 0;
        if (commonCard.length === 3) {
          status = EGameStatus.GAME_FLOP;
        }
        if (commonCard.length === 4) {
          status = EGameStatus.GAME_TURN;
        }
        if (commonCard.length === 5) {
          status = EGameStatus.GAME_RIVER;
        }
        if (commonCard.length === 6) {
          status = EGameStatus.GAME_SHOWDOWN;
        }
        const commandRecord: ICommandRecord = {
          roomNumber: this.roomNumber,
          userId: userInfo.userId,
          type: currPlayer.type,
          gameStatus: status,
          pot: 0,
          commonCard: roomInfo.game?.commonCard.join(',') || '',
          command: payload.command,
          gameId: roomInfo.gameId || 0,
          counter: currPlayer.counter,
        };
        roomInfo.game.currPlayer.node.updateVPIP(payload.command.split(':')[0], commonCard.length);
        this.updateFullRecord(payload.command);
        roomInfo.game.action(payload.command);
        // NOTICE 需要注意 currPlayer 在这里(action)后会改变了
        const commandArr = payload.command.split(':');
        const command = commandArr[0];
        // fold change status: -1
        if (command === 'fold') {
          roomInfo.players.forEach((p) => {
            if (p.userId === userInfo.userId) {
              p.status = -1;
            }
          });
        }
        console.log('fold ===============', roomInfo.players, roomInfo.game.allPlayer);
        // todo notice next player action
        this.updateGameInfo();
        console.log('curr player', roomInfo.game.currPlayer.node);
        // add game record
        commandRecord.pot = roomInfo.game?.pot || 0;
        commandRecord.counter = currPlayer.counter;
        const commandRecordService = await this.app.applicationContext.getAsync('CommandRecordService');
        await commandRecordService.add(commandRecord);
      } else {
        throw 'action flow incorrect';
      }
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = GameController;
