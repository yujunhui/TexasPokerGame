import { IOptions, ToastExtendConstructor } from '../src/plugins/toast';

interface IPlugin {
  toast(options: string | IOptions): ToastExtendConstructor;
}

declare module 'vue/types/vue' {
  interface Vue {
    $plugin: IPlugin;
  }
}
