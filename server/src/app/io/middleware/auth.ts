import { Context } from '@midwayjs/web';
import { ITickMsg } from '../../../interface/ITickMsg';
import { P2PAction } from '../../../utils/constant';

export default () => {
  return async (ctx: Context, next: () => Promise<any>) => {
    const socket = ctx.socket as any;
    const id = socket.id;
    const app = ctx.app as any;
    const nsp = app.io.of('/socket');
    const query = socket.handshake.query;
    // 用户信息
    const { room, token, key } = query;

    function tick(id: number, action: P2PAction.Deny | P2PAction.UpgradeClient, msg: ITickMsg, nsp: any, socket: any) {
      // 踢出用户前发送消息
      socket.emit(id, ctx.helper.parseMsg(action, msg));
      // 调用 adapter 方法踢出用户，客户端触发 disconnect 事件
      nsp.adapter.remoteDisconnect(id, true, (err: any) => {
        ctx.logger.error(`room service tick, action: ${action}, mag:${JSON.stringify(msg)}`, err);
      });
    }

    try {
      if (key !== 'IDENTIFY_VERSION_KEY') {
        tick(id, P2PAction.UpgradeClient, { type: 'error', message: 'need to upgrade the client' }, nsp, socket);
        return;
      }

      const { user } = await app.jwt.verify(token);
      ctx.state.user = user;
      // const { nick_name: userName } = userInfo.user;

      // 检查房间是否存在，不存在则踢出用户
      const roomService = await app.applicationContext.getAsync('RoomService');
      const hasRoom = await roomService.findByRoomNumber(room);
      if (!hasRoom) {
        tick(id, P2PAction.Deny, { type: 'deleted', message: 'room has been deleted' }, nsp, socket);
        return;
      }
      await next();
    } catch (e) {
      console.error(e);
      tick(id, P2PAction.Deny, { type: 'critical', message: 'something went wrong' }, nsp, socket);
      throw e;
    }
  };
};
