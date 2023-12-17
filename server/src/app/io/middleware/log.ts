import { Context } from '@midwayjs/web';

export default () => {
  return async (ctx: Context, next: () => Promise<any>) => {
    if (process.env.NODE_ENV === 'production') {
      await next();
      return;
    }

    const start = Date.now();
    const logger = ctx.getLogger('ioLogger');
    logger.debug('---receive packet: ', JSON.stringify(ctx.packet));
    await next();
    logger.debug('---packet handle duration: ', Date.now() - start);
  };
};
