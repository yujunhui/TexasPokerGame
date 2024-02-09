<template>
  <div class="record-container" v-show="show">
    <div class="shadow" @click="show = false"></div>
    <div class="body">
      <div class="title">
        牌局记录
        <span class="close" @click="show = false">X</span>
      </div>
      <ul>
        <li class="record-header">
          <i>昵称</i>
          <i>buy in</i>
          <i>counter</i>
          <i>income</i>
          <i>VPIP (V/Total)</i>
          <i>PFR</i>
          <i>翻前胜率</i>
        </li>
        <li v-for="player in players">
          <i>{{ player.nickName }}</i>
          <i>{{ player.buyIn }}</i>
          <i>{{ player.counter }}</i>
          <i>{{ player.counter - player.buyIn }}</i>
          <i v-html="formatVPIP(player)"></i>
          <i v-html="formatPFR(player)"></i>
          <i v-html="formatPreFlopEquity(player)"></i>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { IPlayer } from '@/interface/IPlayer';
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
  components: {},
})
export default class Record extends Vue {
  @Prop() public value!: boolean;
  @Prop() public players!: IPlayer[];

  get show() {
    return this.value;
  }

  set show(val) {
    this.$emit('input', val);
  }

  public formatVPIP(player: IPlayer) {
    return this.formatPercentage(player.voluntaryActionCountAtPreFlop, player.actionCountAtPreFlop);
  }

  public formatPFR(player: IPlayer) {
    return this.formatPercentage(player.raiseCountAtPreFlop, player.actionCountAtPreFlop);
  }

  public formatPreFlopEquity(player: IPlayer) {
    return this.formatPercentage(player.winCountAtPreFlop, player.gameCount);
  }

  private formatPercentage(numerator: number, denominator: number) {
    if (denominator === 0 || numerator === 0) {
      return '0%';
    }
    const rate = ((numerator / denominator) * 100).toFixed(2);
    return `${rate}%<br />(${numerator}/${denominator})`;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
.record-container {
  width: 100vw;
  height: 100vh;
  color: #fff;
  background: #2a2a2a;
  position: absolute;
  left: 0;
  top: 0;
  z-index: 9999;

  .close {
    color: red;
    text-align: right;
    float: right;
  }

  .shadow {
    background: rgba(0, 0, 0, 0.3);
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    position: fixed;
    z-index: 1;
  }

  .body {
    position: relative;
    z-index: 9;
  }

  .title {
    color: #fff;
    text-align: left;
    line-height: 30px;
    padding: 5px 10px;
    border-bottom: 2px solid #fff;
  }

  ul {
    li.record-header {
      font-weight: bold;
    }

    li {
      display: flex;
      border-bottom: 1px solid #c7bc68;

      i {
        flex: 1;
        padding: 5px 10px;
        font-size: 16px;
        line-height: 20px;
        display: inline-block;
        font-style: normal;
        font-size: 12px;
      }
    }
  }
}
</style>
