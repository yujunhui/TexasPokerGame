import { Inject, Plugin, Provide } from '@midwayjs/core';
import { Context } from '@midwayjs/web';
import { IPlayerDTO, IPlayerService, UpdatePlayerDTO } from '../interface/IPlayer';

@Provide('PlayerRecordService')
export class PlayerService implements IPlayerService {
  @Inject()
  ctx: Context;

  @Plugin()
  mysql: any;

  async add(gameRecord: IPlayerDTO) {
    return await this.mysql.insert('player', {
      ...gameRecord,
    });
  }

  async update(updatePlayer: UpdatePlayerDTO) {
    const row = {
      id: updatePlayer.playerId,
      counter: updatePlayer.counter,
    };
    return await this.mysql.update('player', row);
  }

  async findByRoomNumber(roomNumber: number): Promise<IPlayerDTO[]> {
    const result = await this.mysql.select('player', {
      where: { roomNumber },
    });
    return result ? JSON.parse(JSON.stringify(result)) : [];
  }
}
