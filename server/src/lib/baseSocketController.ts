import { Controller } from 'egg';
import { IGameRoom, IRoomInfo } from '../interface/IGameRoom';
import { IPlayer } from '../app/core/Player';
import { Action, AdapterType, Online, OnlineAction, Spectate, SpectateAction } from '../utils/constant';
import * as FR from '../service/fullRecord';

export default class BaseSocketController extends Controller {
  public app = this.ctx.app as any;
  public nsp = this.app.io.of('/socket');
  public gameRooms = this.nsp.gameRooms;
  public socket = this.ctx.socket as any;
  public query = this.socket.handshake.query;
  public roomNumber = this.query.room;
  public jwt: any = this.app.jwt;
  public message = this.ctx.args[0] || {};

  protected async getUserInfo() {
    const { token } = this.query;
    const user: IPlayer = this.jwt.verify(token) && this.jwt.verify(token).user;
    return user;
  }

  protected getRoomInfo(): IRoomInfo {
    const { room } = this.query;
    const roomInfo = this.gameRooms.find((gr: IGameRoom) => gr.number === room);
    return roomInfo.roomInfo;
  }

  protected adapter(type: AdapterType, actionName: Action, data: any) {
    this.nsp.adapter.clients([this.roomNumber], (err: any, clients: any) => {
      this.nsp.to(this.roomNumber).emit(type, {
        clients,
        action: actionName,
        target: 'participator',
        data,
      });
    });
  }

  /**
   * 记录操作
   * @param action 如 check, raise:10
   * @returns
   */
  protected updateFullRecord(action: string) {
    const roomInfo = this.getRoomInfo();
    if (FR.fullRecord.players.length === 0) {
      roomInfo.sit.map((sit) => {
        const userId = sit.player?.userId;
        const player = roomInfo.game?.allPlayer.find((p) => p.userId === userId);
        const mirrorPlayer = roomInfo.players.find((p) => p.userId === userId);
        if (!userId || !player || !mirrorPlayer) return;

        FR.fullRecord.players.push({
          userId,
          nickName: player.nickName,
          position: String(player.position), // to fix
          handCard: player.getFormattedHandCard(false),
          buyIn: mirrorPlayer?.buyIn,
          counter: player?.counter,
        });
      });
    }

    if (!roomInfo.game) return;
    const [command, size] = action.split(':');
    FR.fullRecord.actions.push({
      userId: roomInfo.game.currPlayer.node.userId,
      commonCard: [...roomInfo.game.commonCard],
      time: new Date().toISOString(),
      command,
      size: size ? Number(size) : undefined,
    });
  }

  protected saveFullRecordAndClean(roomNumber: string) {
    FR.saveFullRecordAndClean(this.app.getLogger('fullRecordLogger'), { roomNumber });
  }

  protected updateGameInfo() {
    const roomInfo = this.getRoomInfo();
    console.log(roomInfo, 'roomInfo ===============================');
    if (
      (roomInfo.game && roomInfo.game.status < 6) ||
      (roomInfo.game?.status === 6 && roomInfo.game.playerSize === 1)
    ) {
      roomInfo.players.forEach((p) => {
        const currPlayer = roomInfo.game && roomInfo.game.getPlayers().find((player) => player.userId === p.userId);
        p.counter = currPlayer?.counter || p.counter;
        p.type = currPlayer?.type || '';
        p.status = currPlayer ? 1 : p.status === -1 ? -1 : 0;
        p.actionCommand = (currPlayer && currPlayer.actionCommand) || '';
        p.delayCount = (currPlayer && currPlayer.delayCount) || 0;
        p.actionSize = (currPlayer && currPlayer.actionSize) || 0;
        p.voluntaryActionCountAtPreFlop = currPlayer?.voluntaryActionCountAtPreFlop || p.voluntaryActionCountAtPreFlop;
        p.totalActionCountAtPreFlop = currPlayer?.totalActionCountAtPreFlop || p.totalActionCountAtPreFlop;
        p.vpip = currPlayer?.vpip || p.vpip;
      });
      console.log(roomInfo.players, 'roomInfo.players ===============================333');
      const gameInfo = {
        players: roomInfo.players.map((p) => {
          const currPlayer = roomInfo.game?.allPlayer.find((player) => player.userId === p.userId);
          return Object.assign(
            {},
            {
              counter: currPlayer?.counter || p.counter,
              actionSize: currPlayer?.actionSize || 0,
              actionCommand: currPlayer?.actionCommand || '',
              nickName: p.nickName,
              type: currPlayer?.type || '',
              status: p.status || 0,
              userId: p.userId,
              buyIn: p.buyIn || 0,
              delayCount: currPlayer?.delayCount || 0,
              voluntaryActionCountAtPreFlop:
                currPlayer?.voluntaryActionCountAtPreFlop || p.voluntaryActionCountAtPreFlop,
              totalActionCountAtPreFlop: currPlayer?.totalActionCountAtPreFlop || p.totalActionCountAtPreFlop,
              vpip: currPlayer?.vpip || p.vpip,
            },
            {},
          );
        }),
        pot: roomInfo.game.pot,
        prevSize: roomInfo.game.prevSize,
        sitList: roomInfo.sit,
        actionEndTime: roomInfo.game.actionEndTime,
        currPlayer: {
          userId: roomInfo.game.currPlayer.node.userId,
        },
        smallBlind: roomInfo.config.smallBlind,
      };
      console.log('gameInfo ==========', gameInfo);
      this.adapter(Online, OnlineAction.GameInfo, gameInfo);
      this.sendGameInfoToSpectators();
    }
  }

  protected sendGameInfoToSpectators() {
    const roomInfo = this.getRoomInfo();
    this.adapter(Spectate, SpectateAction.GameInfo, {
      commonCard: roomInfo.game?.commonCard,
      actionEndTime: roomInfo.game?.actionEndTime,
      sitPlayers: roomInfo.sit.map((sit) => {
        const sitPlayer = sit.player;
        const userId = sitPlayer?.userId;
        const player = roomInfo.game?.allPlayer.find((p) => p.userId === userId);
        const mirrorPlayer = roomInfo.players.find((p) => p.userId === userId);
        return {
          isCurrentPlayer: userId && roomInfo.game?.currPlayer.node.userId === userId,
          userId,
          nickName: player?.nickName || sitPlayer?.nickName,
          position: player?.position,
          handCard: player?.getHandCard(),
          actionCommand: player?.actionCommand,
          actionSize: player?.actionSize,
          delayTime: player?.delayCount,
          counter: player?.counter,
          buyIn: mirrorPlayer?.buyIn,
        };
      }),
    });
  }
}
