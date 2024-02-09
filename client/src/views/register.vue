<template>
  <div class="register-container container">
    <div class="register-body">
      <div class="logo">D Z P</div>
      <div class="title">Create Account</div>
      <div class="user-name">
        <XInput
          v-model="form.userAccount"
          text="account"
          @focus="removeValid('userAccount')"
          :error="errorData.indexOf('userAccount') > -1"
        ></XInput>
      </div>
      <div class="user-name">
        <XInput
          v-model="form.nickName"
          text="nickName"
          @focus="removeValid('nickName')"
          :error="errorData.indexOf('nickName') > -1"
        ></XInput>
      </div>
      <div class="password">
        <XInput
          v-model="form.password"
          text="password"
          type="password"
          @focus="removeValid('password')"
          :error="errorData.indexOf('password') > -1"
        ></XInput>
      </div>
      <div class="confirm">
        <XInput
          v-model="form.confirm"
          text="confirm"
          type="password"
          @focus="removeValid('confirm')"
          :error="errorData.indexOf('confirm') > -1"
        ></XInput>
      </div>
      <div class="register-btn">
        <div class="s-btn btn"><span @click="register">submit</span></div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import Component from 'vue-class-component';
import { Vue } from 'vue-property-decorator';
import toast from '../components/Toast.vue';
import XInput from '../components/XInput.vue';
import service from '../service';

@Component({
  components: {
    toast,
    XInput,
  },
})
export default class Register extends Vue {
  public form: any = {
    userAccount: '',
    nickName: '',
    password: '',
    confirm: '',
  };
  public errorData: string[] = [];

  public valid() {
    const errorArr: string[] = [];
    for (const formKey in this.form) {
      if (this.form[formKey] === '') {
        errorArr.push(formKey);
      }
    }
    // confirm password
    if (this.form.password !== this.form.confirm) {
      errorArr.push('confirm');
      errorArr.push('password');
    }
    this.errorData = errorArr;
  }

  public removeValid(validName: string) {
    this.errorData = this.errorData
      .join(',')
      .replace(validName, '')
      .split(',');
  }

  public async register() {
    try {
      this.valid();
      if (this.errorData.join('') === '') {
        await service.register(this.form);
        this.$plugin.toast('sign successful');
        setTimeout(() => {
          this.$router.replace({ name: 'login' });
        }, 2000);
      }
    } catch (e) {
      this.$plugin.toast(JSON.stringify(e));
    }
  }
}
</script>
<style lang="less">
.register-container {
  padding: 20px;
  max-width: 600px;
  margin: auto;

  .logo {
    text-align: left;
    margin-bottom: 10px;
    font-size: 16px;
    font-weight: 700;
  }

  .title {
    text-align: left;
    margin-bottom: 5vh;
  }

  .register-btn {
    width: 50vw;
    float: right;
    margin: auto;
  }
}
</style>
