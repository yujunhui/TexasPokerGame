<template>
  <div class="settings" v-show="showSettings">
    <div class="shadow" @click="closeSettings"></div>
    <div class="settings-body">
      <i>Home</i>
      <i>Buy In</i>
      <i>Stand Up</i>
      <i>Counter Record</i>
      <i>Speak Setting</i>
      <i>Audio(open)</i>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class SpeakSettings extends Vue {
  @Prop() public showSettings!: boolean;

  public mounted() {}

  public closeSettings() {
    this.$emit('update:showSettings', false);
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.settings {
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

  .speak-settings-body {
    z-index: 99;
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    height: 60%;
    border-radius: 12px;
    box-sizing: border-box;
    background: #fff;
    padding: 20px;
    overflow-y: auto;

    h3:not(:first-of-type) {
      padding-top: 30px;
    }

    .voice-list {
      max-height: 200px;
      /* Adjust the height as needed */
      overflow-y: auto;
    }

    .selected-voice {
      font-weight: bold;
    }
  }

  .option {
    margin-top: 10px;
  }
}
</style>
