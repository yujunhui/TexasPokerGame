<template>
  <div :class="classNames">
    <slot />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Watch, Prop } from 'vue-property-decorator';

@Component
export default class Animation extends Vue {
  public expose = ['applyAnimation'];
  @Prop() public animationName!: string;

  public classNames = '';

  public applyAnimation() {
    this.classNames = '';
    setTimeout(() => {
      if (this.animationName) {
        this.classNames = `animate__animated animate__${this.animationName}`;
      }
    }, 50);
  }

  @Watch('animationName')
  public watchAnimationName() {
    this.applyAnimation();
  }

  public mounted() {
    this.applyAnimation();
  }
}
</script>
