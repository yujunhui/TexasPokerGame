import { MidwayAppInfo, MidwayConfig } from '@midwayjs/core';
import { EggAppConfig, PowerPartial } from 'egg';

export default (appInfo: MidwayAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig>;

  config.io = {
    redis: {
      host: 'redis',
    },
  };

  config.redis = {
    client: {
      host: 'redis',
    },
  };

  config.mysql = {
    client: {
      host: 'mysql',
    },
  };

  return config as MidwayConfig;
};
