// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!
import '@midwayjs/web';
import 'egg';
import 'egg-cors';
import 'egg-development';
import 'egg-i18n';
import 'egg-jsonp';
import 'egg-jwt';
import 'egg-logrotator';
import 'egg-multipart';
import 'egg-mysql';
import 'egg-onerror';
import 'egg-redis';
import 'egg-schedule';
import 'egg-security';
import 'egg-session';
import 'egg-socket.io';
import 'egg-static';
import 'egg-view';
import 'egg-watcher';
declare module 'egg' {
  interface EggPlugin {
    onerror?: EggPluginItem;
    session?: EggPluginItem;
    i18n?: EggPluginItem;
    watcher?: EggPluginItem;
    multipart?: EggPluginItem;
    security?: EggPluginItem;
    development?: EggPluginItem;
    logrotator?: EggPluginItem;
    schedule?: EggPluginItem;
    static?: EggPluginItem;
    jsonp?: EggPluginItem;
    view?: EggPluginItem;
    cors?: EggPluginItem;
    redis?: EggPluginItem;
    io?: EggPluginItem;
    jwt?: EggPluginItem;
    mysql?: EggPluginItem;
  }
}
