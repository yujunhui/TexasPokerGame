<template>
  <Transition name="fade">
    <div class="other-settings" v-show="showOtherSettings">
      <div class="shadow" @click="closeOtherSettings"></div>
      <div class="other-settings-body">
        <h3>其他设置</h3>
        <div class="option">
          <label>
            <input type="checkbox" v-model="notificationEnabled" @change="saveNotificationSettings" />
            轮到你时发送桌面通知
          </label>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { setNotificationEnabled, isNotificationEnabled, requestNotificationPermission } from '@/utils/notification';
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class OtherSettings extends Vue {
  @Prop() public showOtherSettings!: boolean;
  public notificationEnabled: boolean = false;

  public mounted() {
    this.notificationEnabled = isNotificationEnabled();
  }

  public closeOtherSettings() {
    this.$emit('update:showOtherSettings', false);
  }

  public saveNotificationSettings() {
    if (this.notificationEnabled) {
      // Request permission when enabling notification
      requestNotificationPermission().then((granted) => {
        if (!granted) {
          // If permission denied, reset the toggle
          this.notificationEnabled = false;
          alert('请允许浏览器通知权限');
        }
        setNotificationEnabled(this.notificationEnabled);
      });
    } else {
      setNotificationEnabled(false);
    }
  }
}
</script>

<style scoped lang="less">
.other-settings {
  position: fixed;
  z-index: 99;

  .shadow {
    position: fixed;
    z-index: 9;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.2);
  }

  .other-settings-body {
    z-index: 99;
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    border-radius: 12px;
    box-sizing: border-box;
    background: #fff;
    padding: 20px;
    overflow-y: auto;

    h3 {
      margin-bottom: 20px;
    }
  }

  .option {
    margin-top: 10px;
  }
}
</style>
