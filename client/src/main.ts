import VConsole from 'vconsole';
import Vue from 'vue';
import App from './App.vue';
import toastPlugin from './plugins/toast';
import router from './router';
import store from './store';
import './utils/init';
// 快速点击bug
// import fastClick from 'fastclick';
Vue.use(toastPlugin);

Vue.config.productionTip = false;

if (process.env.NODE_ENV !== 'production') {
  // tslint:disable-next-line:no-unused-expression
  new VConsole();
}
// @ts-ignore
// fastClick.attach(document.body);

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app');
