<template>
  <div class="audio-container"></div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class Emoji extends Vue {
  @Prop() public type!: string;
  @Prop() public show!: boolean;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.audio-container {
  position: absolute;
  z-index: -99;
  display: none;
}
</style>
