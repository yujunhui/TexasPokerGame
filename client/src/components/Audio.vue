<template>
  <div class="audio-container">
    <audio v-for="data in audioData" :ref="data.type" controls>
      <source :src="data.src" type="audio/mpeg" />
      Your browser does not support the audio element.
    </audio>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';

@Component
export default class Audio extends Vue {
  @Prop() public playType!: string;
  @Prop() public playIncomeAudio!: boolean;
  @Prop() public playRaiseAudio!: boolean;
  @Prop() public playAllinAudio!: boolean;

  public basicAudioData = [
    { type: 'click', src: require('../assets/mp3/click.mp3') },
    { type: 'raise', src: require('../assets/mp3/raise.mp3') },
    { type: 'fold', src: require('../assets/mp3/fold.mp3') },
  ];
  public incomeAudioData = [{ type: 'income', src: require('../assets/mp3/income.mp3') }];
  public raiseAudioData = [
    { type: 'raise-ms-xiaoxiao-raise', src: require('../assets/mp3/raise-ms-xiaoxiao-raise.mp3') },
    { type: 'raise-ms-xiaobei-dani', src: require('../assets/mp3/raise-ms-xiaobei-dani.mp3') },
  ];
  public allinAudioData = [
    { type: 'allin-ms-xiaoxiao-allin', src: require('../assets/mp3/allin-ms-xiaoxiao-allin.mp3') },
  ];
  public audioData = [...this.basicAudioData, ...this.raiseAudioData, ...this.allinAudioData];

  @Watch('playType')
  public playWatcher(val: string) {
    if (!val || !this.audioData.map((e) => e.type).includes(val)) {
      return;
    }
    this.playSpecifyType(val);
  }

  @Watch('playIncomeAudio')
  public playIncomeAudioWatcher(val: boolean) {
    if (!val) {
      return;
    }
    this.playAudio('incomeAudioData');
  }

  @Watch('playRaiseAudio')
  public playRaiseAudioWatcher(val: boolean) {
    if (!val) {
      return;
    }
    this.playAudio('raiseAudioData');
  }

  @Watch('playAllinAudio')
  public playAllinAudioWatcher(val: boolean) {
    if (!val) {
      return;
    }
    this.playAudio('allinAudioData');
  }

  private playAudio(prop: 'incomeAudioData' | 'raiseAudioData' | 'allinAudioData') {
    const types = this[prop].map((e) => e.type);
    const randomType = types[Math.floor(Math.random() * types.length)];
    this.playSpecifyType(randomType);
  }

  private playSpecifyType(typ: string) {
    (this.$refs[typ] as HTMLAudioElement[])[0].play();
  }
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
