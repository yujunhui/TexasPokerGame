<template>
  <div class="game-container container">
    <Loader class="loader-position" :active="!socketStatus" message="服务器连接中..." />

    <sitList
      :actionUserId="actionUserId"
      :commonCard="commonCard"
      :currPlayer="currPlayer"
      :hand-card="handCard"
      :isPlay="isPlay"
      :max-buy-in-size="canBuyInSize"
      :playersStatus="playersStatus"
      :roomConfig="roomConfig"
      :sitLink.sync="sitLink"
      :time.sync="time"
      :valueCards="valueCards"
      :winner="winner"
      @buyIn="buyIn"
      @delay="delay"
      @sit="sitDown"
    ></sitList>

    <div class="game-canvas">
      <animation
        class="action-notice"
        :animationName="latestSpecialActionMsg.toLocaleLowerCase().includes('allin') ? 'tada' : 'heartBeat'"
        ref="actionNotice"
        v-show="latestSpecialActionMsg"
      >
        {{ latestSpecialActionMsg }}
      </animation>
      <div class="game-body">
        <div class="pot">pot: {{ pot }}</div>
        <div class="roomId">No.:{{ roomId }}</div>
        <div class="btn play" v-show="isOwner && !isPlay">
          <span @click="play">play game</span>
        </div>
      </div>
      <common-card class="common-cards" :commonCard="commonCard" :valueCards="valueCards"></common-card>
      <div class="winner-poke-style" v-show="gameOver && winner[0][0].handCard.length > 0">
        {{ PokeStyle(winner[0] && winner[0][0] && winner[0][0].handCard) }} WIN!!
      </div>
    </div>

    <actionDialog
      :base-size="baseSize"
      :curr-player="currPlayer"
      :is-action="isAction"
      :is-pre-flop="commonCard.length === 0"
      :min-action-size="minActionSize"
      :is-two-player="gamePlayers.length === 2"
      :pot="pot"
      :audio-status="audioStatus"
      :prev-size="prevSize"
      @action="action"
    ></actionDialog>

    <notice :message-list="messageList"></notice>
    <div class="game-record iconfont icon-record" @click="getRecord(0)"></div>
    <div class="setting">
      <div class="shadow" @click="toggleSetting()" v-if="showSetting"></div>
      <div class="setting-btn" @click="toggleSetting()"></div>
      <Transition name="fade">
        <div class="setting-body" v-show="showSetting">
          <p @click="toggleSetting()" class="setting-close">X</p>
          <p @click="$router.replace({ name: 'home' })">Home</p>
          <p @click="showBuyInDialog()">Buy In</p>
          <p @click="standUp()">Stand Up</p>
          <p @click="showCounterRecord">Counter Record</p>
          <p @click="speakSettings()">Speak Settings</p>
          <p @click="closeAudio()">Audio ({{ audioStatus ? 'On' : 'Off' }})</p>
        </div>
      </Transition>
    </div>
    <BuyIn :showBuyIn.sync="showBuyIn" :min="0" :max="canBuyInSize" @buyIn="buyIn"></BuyIn>
    <SpeakSettings :showSpeakSettings.sync="showSpeakSettings"></SpeakSettings>
    <toast :show.sync="showMsg" :text="msg"></toast>
    <Transition name="fade">
      <record :players="players" v-model="showRecord" v-show="showRecord"></record>
    </Transition>
    <sendMsg @send="sendMsgHandle" @sendAudio="sendAudio" :msg-list="msgListReverse"></sendMsg>
    <iAudio :play="playIncome && audioStatus" type="income"></iAudio>
    <iAudio :play="playRaiseNotice && audioStatus" type="raise-notice"></iAudio>
    <iAudio :play="playAllInNotice && audioStatus" type="allin-notice"></iAudio>
    <gameRecord
      v-model="showCommandRecord"
      :game-list="gameList"
      @getRecord="getRecord"
      :curr-game-index="currGameIndex"
      :command-list="commandRecordList"
    ></gameRecord>
  </div>
</template>

<script lang="ts">
import { Ref, Vue, Watch } from 'vue-property-decorator';
import Component from 'vue-class-component';
import io from 'socket.io-client';
import cookie from 'js-cookie';
import sitList from '../components/SitList.vue';
import commonCard from '../components/CommonCard.vue';
import { IPlayer } from '@/interface/IPlayer';
import { IPlayersStatus } from '@/interface/IPlayersStatus';
import { ILinkNode, Link } from '@/utils/Link';
import ISit from '../interface/ISit';
import BuyIn from '../components/BuyIn.vue';
import toast from '../components/Toast.vue';
import record from '../components/Record.vue';
import notice from '../components/Notice.vue';
import iAudio from '../components/Audio.vue';
import sendMsg from '../components/SendMsg.vue';
import SpeakSettings from '@/components/SpeakSettings.vue';
import animation from '@/components/Animation.vue';
import actionDialog from '../components/Action.vue';
import { PokerStyle } from '@/utils/PokerStyle';
import origin from '../utils/origin';
import { IRoom } from '@/interface/IRoom';
import service from '../service';
import gameRecord from '@/components/GameRecord.vue';
import Loader from '@/components/Loader.vue';
import { IGameRecord } from '@/interface/IGameRecord';
import { Online, OnlineAction, P2PAction, MaxBuyInFactor } from '@/utils/constant';
import { Howl } from 'howler';

export enum ECommand {
  ALL_IN = 'allin',
  BET = 'bet',
  CALL = 'call',
  CHECK = 'check',
  FOLD = 'fold',
  RAISE = 'raise',
}

interface IMsg {
  action: string;
  clients: string[];
  target: string;
  message?: any;
  data: any;
}

interface ILatestActionData {
  userId: string;
  nickName: string;
  /** call, check, bet:4, raise:4, raise:100, fold, allin */
  latestAction: string;
}

const GAME_BASE_SIZE = 1;
const ACTION_TIME = 30;

@Component({
  components: {
    sitList,
    commonCard,
    BuyIn,
    toast,
    record,
    gameRecord,
    notice,
    iAudio,
    actionDialog,
    sendMsg,
    animation,
    SpeakSettings,
    Loader,
  },
})
export default class Game extends Vue {
  get msgListReverse() {
    const msg = JSON.parse(JSON.stringify(this.messageList));
    return msg.reverse();
  }

  get isPlay() {
    return this.gaming || this.pot !== 0;
  }

  get roomId() {
    return this.$route.params.roomNumber;
  }

  get isOwner() {
    return !!this.$route.params.isOwner;
  }

  get gameOver() {
    return this.winner.length !== 0;
  }

  get isAction() {
    return this.userInfo && this.userInfo.userId === this.actionUserId;
  }

  get valueCards() {
    if (this.gameOver && this.winner[0] && this.winner[0][0].handCard) {
      const handCards = this.winner[0][0].handCard;
      const style = new PokerStyle([...handCards, ...this.commonCard], this.roomConfig.isShort);
      return style.getPokerValueCard();
    } else {
      return [];
    }
  }

  get gamePlayers() {
    if (!this.isPlay) {
      return [];
    }
    return this.sitList.filter((s) => s.player && s.player.status === 1);
  }

  get hasSit() {
    return !!this.sitList.find((s) => s.player && s.player.userId === this.currPlayer?.userId);
  }

  get currPlayer() {
    return this.players.find((u: IPlayer) => this.userInfo.userId === u.userId);
  }

  get minActionSize() {
    return this.prevSize <= 0 ? this.baseSize * 2 : this.prevSize * 2;
  }

  get baseSize() {
    return this.roomConfig.smallBlind || GAME_BASE_SIZE;
  }

  // 获取当前用户的买入筹码数
  get currentBuyInSize() {
    return this.currPlayer?.buyIn || 0;
  }

  get maxOneOffBuyInSize() {
    return this.baseSize * MaxBuyInFactor;
  }

  get limitBuyInSize() {
    return (Math.floor(this.currentBuyInSize / this.maxOneOffBuyInSize) + 1) * this.maxOneOffBuyInSize;
  }

  get canBuyInSize() {
    // 如果没输完, 且当前的buyin size 不是0(不是第一次买入)
    // 那么看看能不能整除单次买入的最大buyin size
    // 能整除代表到达买入限制了
    if (
      this.currentCounter !== 0 &&
      this.currentBuyInSize !== 0 &&
      this.currentBuyInSize % this.maxOneOffBuyInSize === 0
    ) {
      return 0;
    }
    return this.limitBuyInSize - this.currentBuyInSize;
  }

  // 获取当前用户的筹码数(买入+赢)
  get currentCounter() {
    const player = this.players.find((u: IPlayer) => this.userInfo.userId === u.userId);
    return this.currPlayer?.counter || 0;
  }

  get latestSpecialAction() {
    const specialActions = [ECommand.BET, ECommand.RAISE, ECommand.ALL_IN];
    return this.currentRoundActions
      .filter((action) => specialActions.includes(action.latestAction.split(':')[0] as ECommand))
      .pop();
  }

  get latestSpecialActionMsg() {
    const latestSpecialAction = this.latestSpecialAction;
    if (!latestSpecialAction) {
      return '';
    }
    const [command, size] = latestSpecialAction.latestAction.split(':');
    if (command === ECommand.ALL_IN) {
      return `${latestSpecialAction.nickName} ALL IN!`;
    }
    if ([ECommand.RAISE, ECommand.BET].includes(command as ECommand)) {
      const prevPot = this.pot - Number(size);
      return `${latestSpecialAction.nickName} ${command.toLocaleLowerCase()} to ${this.pot}(${prevPot}+${size})!`;
    }
    return '';
  }

  get socketStatus() {
    return this.socket?.connected;
  }

  public socket: any = null;
  @Ref() public readonly actionNotice!: animation;
  // in the room user
  // have a sit user
  public players: IPlayer[] = [];
  public currentRoundActions: ILatestActionData[] = [];
  public userInfo: any = {};
  public joinMsg = '';
  public handCard = [];
  public commonCard = [];
  public pot = 0;
  public slidePots = [];
  public prevSize = 0;
  public winner: IPlayer[][] = [];
  public showBuyIn = false;
  public showSetting = false;
  public sitLink: any = '';
  public gaming = false;
  public sitList: ISit[] = [];
  public actionUserId = '';
  public showAllin = false;
  public showMsg = false;
  public playIncome = false;
  public msg = '';
  public time = ACTION_TIME;
  public timeSt = 0;
  public commandRecordList = [];
  public actionEndTime = 0;
  public showCommandRecord = false;
  public gameList: IGameRecord[] = [];
  public currGameIndex = 0;
  public audioStatus = true;
  public roomConfig: IRoom = {
    isShort: false,
    smallBlind: 1,
  };
  public messageList: any[] = [];
  public showRecord = false;
  public playRaiseNotice = false;
  public playAllInNotice = false;
  public playersStatus: IPlayersStatus = {};
  public showSpeakSettings = false;

  @Watch('latestSpecialAction')
  public privateActionNoticeChange(newValue: ILatestActionData, oldValue: ILatestActionData) {
    if (newValue?.nickName !== oldValue?.nickName) {
      this.actionNotice?.applyAnimation();
    }
  }

  @Watch('players')
  public playerChange(players: IPlayer[]) {
    console.log('player change-------');
    this.sitList = this.sitList.map((sit: ISit) => {
      const player = players.find((p) => sit.player && p.userId === sit.player.userId && sit.player.counter > 0);
      return Object.assign({}, {}, { player, position: sit.position }) as ISit;
    });
    this.initSitLink();
  }

  @Watch('isPlay')
  public isPlayChange(val: boolean) {
    if (val) {
      clearTimeout(this.timeSt);
      this.doCountDown();
    }
  }

  public playReminderSound() {
    const reminderSetting = localStorage.getItem('playReminderSound');
    return reminderSetting !== null ? reminderSetting === 'true' : true;
  }

  public playMessageSound() {
    const messageSetting = localStorage.getItem('playMessageSound');
    return messageSetting !== null ? messageSetting === 'true' : true;
  }

  public playRaiseReminderSound() {
    const raiseReminderSetting = localStorage.getItem('playRaiseReminderSound');
    return raiseReminderSetting !== null ? raiseReminderSetting === 'true' : true;
  }

  @Watch('actionUserId')
  public actionUserIdChange() {
    // Reminder for Raise and Allin
    if (this.audioStatus && this.isAction && this.playRaiseReminderSound()) {
      const latestSpecialAction = this.latestSpecialAction;
      if (latestSpecialAction) {
        const [command, size] = latestSpecialAction.latestAction.split(':');
        if (latestSpecialAction.latestAction.includes(ECommand.ALL_IN)) {
          this.speakText(`${latestSpecialAction.nickName} ALL IN!`);
        }
        if ([ECommand.RAISE, ECommand.BET].includes(command as ECommand)) {
          this.speakText(`${latestSpecialAction.nickName} ${command.toLocaleLowerCase()} ${size} 到 ${this.pot}!`);
        }
      }
    }

    // Reminder for current user
    if (this.audioStatus && this.isAction && this.playReminderSound()) {
      this.speakText(this.userInfo.nickName + ',到你啦!');
    }

    if (this.isPlay && this.actionEndTime) {
      const now = Date.now();
      this.time = Math.floor((this.actionEndTime - now) / 1000);
      clearTimeout(this.timeSt);
      this.doCountDown();
    }
  }

  public init() {
    this.joinMsg = '';
    this.handCard = [];
    this.commonCard = [];
    this.pot = 0;
    this.prevSize = 0;
    this.time = ACTION_TIME;
    this.winner = [];
    this.showBuyIn = false;
    this.showSpeakSettings = false;
    this.initSitLink();
  }

  public getSocketServerUrl() {
    return `${origin.urls[0]}/socket`;
  }

  public sendMsgHandle(msgInfo: string) {
    const msg = `${this.userInfo.nickName}:${msgInfo}`;
    this.emit('broadcast', { msg });
  }

  public sendAudio(audioData: any) {
    this.emit('broadcast', {
      type: 'audio',
      audioData,
      from: this.currPlayer?.userId,
    });
  }

  public showCounterRecord() {
    this.showRecord = true;
    this.showSetting = false;
  }

  public doCountDown() {
    if (this.time <= 0) {
      clearTimeout(this.timeSt);
      return;
    }
    this.timeSt = setTimeout(() => {
      const now = Date.now();
      this.time = Math.floor((this.actionEndTime - now) / 1000);
      this.doCountDown();
    }, 1000);
  }

  public speakText(textToSpeak: string) {
    const isRandomVoice = localStorage.getItem('tts:isRandomVoice');

    let voice: SpeechSynthesisVoice;
    if (isRandomVoice === 'true') {
      const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('zh'));
      if (voices.length === 0) {
        return;
      }

      const i = Math.floor(Math.random() * voices.length);
      voice = voices[i];
    } else {
      const selectedVoiceName = localStorage.getItem('selectedVoice');
      if (!selectedVoiceName) {
        // 如果没有选择语音，则不发声
        return;
      }

      const selectedVoice = window.speechSynthesis.getVoices().find((v) => v.name === selectedVoiceName);

      if (!selectedVoice) {
        // 如果找不到对应的语音，也不发声
        return;
      }
      voice = selectedVoice;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.voice = voice; // 使用用户选择的语音
    window.speechSynthesis.speak(utterance);
  }

  public PokeStyle(cards: string[]) {
    if (this.commonCard.length === 0 || !cards) {
      return '';
    }
    const commonCards = this.commonCard || [];
    const card = [...cards, ...commonCards];
    const style = new PokerStyle(card, this.roomConfig.isShort);
    return style.getPokerStyleName();
  }

  public showBuyInDialog() {
    this.showBuyIn = true;
    this.showSetting = false;
  }

  public sitListMap() {
    let node = this.sitLink;
    const sit = [];
    for (let i = 0; i < 10; i++) {
      sit.push(node.node);
      node = node.next;
    }
    return sit;
  }

  public sitDown() {
    this.emit('sitDown', { sitList: this.sitListMap() });
  }

  public delay() {
    this.emit('delayTime');
  }

  public action(command: string) {
    if (command === 'fold') {
      clearTimeout(this.timeSt);
    }
    if (command === 'allin') {
      this.showAllin = true;
      setTimeout(() => {
        this.showAllin = false;
      }, 3000);
    }
    this.emit('action', { command });
    // this.isAction = false;
    // this.isRaise = false;
  }

  public socketInit() {
    const token = cookie.get('token') || localStorage.getItem('token') || '';
    const roomConfig = this.getRoomConfig();
    const log = console.log;
    this.roomConfig = JSON.parse(roomConfig);
    console.log(JSON.parse(roomConfig), 'roomConfig');
    this.socket = io(this.getSocketServerUrl(), {
      // 实际使用中可以在这里传递参数
      query: {
        room: this.roomId,
        token,
        roomConfig,
        key: 'IDENTIFY_VERSION_KEY',
      },
      transports: ['websocket'],
    });
    log('#init,', this.socket);
    this.socket.on('connect', () => {
      const id: string = this.socket.id;
      log('#connect,', id, this.socket);

      // 监听自身 id 以实现 p2p 通讯
      this.socket.on(id, (msg: any) => {
        log('#receive,', msg);
        const data = msg.data;
        if (data.action === P2PAction.HandCard) {
          console.log('come in handCard =========', data);
          this.handCard = data.payload.handCard;
          console.log('come in handCard =========', this.handCard);
        }
        if (data.action === P2PAction.UserInfo) {
          this.userInfo = data.payload.userInfo;
        }
        if (data.action === P2PAction.SitList) {
          this.sitList = data.payload.sitList;
          this.initSitLink();
        }
        if (data.action === P2PAction.GameInfo) {
          const payload = data.payload;
          this.players = payload.data.players;
          this.pot = payload.data.pot || 0;
          this.prevSize = payload.data.prevSize;
          this.commonCard = payload.data.commonCard;
          this.actionEndTime = payload.data.actionEndTime;
          console.log('msg.data.currPlayer.userId', msg.data);
          this.actionUserId = payload.data.currPlayer.userId;
          // this.isAction = !!(this.userInfo
          //   && this.userInfo.userId === payload.data.currPlayer.userId);
        }

        // room time out
        if (data.action === P2PAction.Deny) {
          this.$plugin.toast('room is close');
          setTimeout(() => {
            this.$router.replace({ name: 'home' });
          }, 1000);
        }

        if (data.action === P2PAction.UpgradeClient) {
          this.$plugin.toast('need to upgrade the client');
          setTimeout(() => {
            location.reload();
          }, 1000);
        }
      });
    });

    // 接收在线用户信息
    this.socket.on(Online, (msg: IMsg) => {
      log('#online,', msg);
      if (msg.action === OnlineAction.SitList) {
        console.log(msg.data, 'sit');
        this.sitList = msg.data.sitList;
        this.initSitLink();
      }
      if (msg.action === OnlineAction.Join) {
        this.joinMsg = msg.data;
      }
      if (msg.action === OnlineAction.Players) {
        this.players = msg.data.players;
      }
      if (msg.action === OnlineAction.ActionComplete) {
        this.commonCard = msg.data.commonCard;
        this.slidePots = msg.data.slidePots;
        this.actionEndTime = msg.data.actionEndTime || Date.now() + 30 * 1000;
        this.currentRoundActions = [];
        console.log('players', msg.data);
      }
      if (msg.action === OnlineAction.GameInfo) {
        this.players = msg.data.players;
        this.pot = msg.data.pot || 0;
        this.roomConfig.smallBlind = msg.data.smallBlind;
        this.prevSize = msg.data.prevSize;
        this.actionUserId = msg.data.currPlayer.userId;
        this.actionEndTime = msg.data.actionEndTime;
        // this.isAction = !!(this.userInfo && this.userInfo.userId === msg.data.currPlayer.userId);
        this.sitList = msg.data.sitList;
        console.log('gameInfo', msg.data);
        console.log('handCard', this.handCard);
      }

      if (msg.action === OnlineAction.GameOver) {
        console.log('gameOver', msg.data);
        clearTimeout(this.timeSt);
        this.actionUserId = '0';
        this.winner = msg.data.winner;
        this.commonCard = msg.data.commonCard;
        this.currentRoundActions = [];
        const allPlayers = msg.data.allPlayers;
        allPlayers.forEach((winner: IPlayer) => {
          this.players.forEach((p) => {
            if (winner.userId === p.userId) {
              p.handCard = winner.handCard;
              p.counter = winner.counter;
              p.income = winner.income;
            }
          });
        });
        // income music
        this.playIncome = true;
        setTimeout(() => {
          this.playIncome = false;
        }, 1000);
      }

      if (msg.action === OnlineAction.NewGame) {
        this.init();
      }

      if (msg.action === OnlineAction.Pause) {
        this.players = msg.data.players;
        this.sitList = msg.data.sitList;
        console.log('players', this.players);
        this.gaming = false;
        this.init();
      }

      if (msg.action === OnlineAction.DelayTime) {
        this.actionEndTime = msg.data.actionEndTime;
        const now = Date.now();
        this.time = Math.floor((this.actionEndTime - now) / 1000);
        // if (this.currPlayer?.userId !== this.actionUserId) {
        //   this.time += 60;
        // }
      }

      if (msg.action === OnlineAction.LatestAction) {
        const data = msg.data as ILatestActionData;
        this.currentRoundActions.push(data);
        const { latestAction, userId: actionUserId } = data;
        if (actionUserId !== this.userInfo.userId) {
          if (latestAction.includes(ECommand.RAISE) || latestAction.includes(ECommand.BET)) {
            this.playRaiseNotice = true;
            setTimeout(() => {
              this.playRaiseNotice = false;
            }, 1000);
          }
          if (latestAction.includes(ECommand.ALL_IN)) {
            this.playAllInNotice = true;
            setTimeout(() => {
              this.playAllInNotice = false;
            }, 1000);
          }
        }
      }

      if (msg.action === OnlineAction.Broadcast) {
        if (msg.message.msg) {
          this.messageList.push({
            message: msg.message.msg || '',
            top: Math.random() * 50 + 10,
          });

          if (this.audioStatus && msg.message.msg.split(':')[0] !== this.userInfo.nickName && this.playMessageSound()) {
            this.speakText(msg.message.msg.replace(':', ' '));
          }
        }

        if (msg.message.type === 'audio') {
          const { data, duration } = msg.message.audioData;
          const playerId = msg.message.from;
          this.$set(this.playersStatus, playerId, { ...this.playersStatus[playerId], speaking: true });
          setTimeout(() => {
            this.playersStatus[playerId].speaking = false;
          }, duration);

          if (this.audioStatus && this.currPlayer?.userId !== playerId) {
            const audio = new Howl({
              src: data,
              autoplay: true,
              onend: () => {
                audio.unload();
              },
            });
          }
        }
      }
    });

    // 系统事件
    this.socket.on('disconnect', (msg: IMsg) => {
      // this.$plugin.toast('room is disconnect');
      // this.socketInit();
      log('#disconnect', msg);
    });

    this.socket.on('disconnecting', () => {
      this.$plugin.toast('room is disconnecting');
      log('#disconnecting');
    });

    this.socket.on('error', () => {
      this.$plugin.toast('room is error');
      log('#error');
    });
  }

  public async buyIn(
    buyInSize: number,
    onSuccess: () => void = () => {
      return;
    },
  ) {
    buyInSize = Number(buyInSize);
    if (buyInSize <= 0) {
      this.$plugin.toast('靓仔, 买个鸡春做咩啊');
      return;
    }

    if (this.canBuyInSize === 0 || this.currentBuyInSize + buyInSize > this.limitBuyInSize) {
      this.$plugin.toast('靓仔, 超过买入限制咯');
      return;
    }

    try {
      this.showMsg = true;
      this.msg = this.hasSit && this.isPlay ? `已补充买入 ${buyInSize}, 下局生效` : `已补充买入 ${buyInSize}`;
      this.emit('buyIn', { buyInSize });
      onSuccess();
    } catch (e) {
      console.error('buyIn error', e);
    }
  }
  public standUp() {
    // player in the game
    if (this.currPlayer && this.currPlayer.status === 1) {
      this.$plugin.toast('sorry, please fold you hand!');
      return;
    }
    this.emit('standUp');
    this.showSetting = false;
  }

  public closeAudio() {
    this.audioStatus = !this.audioStatus;
  }

  public speakSettings() {
    this.showSpeakSettings = true;
    this.showSetting = false;
  }

  public toggleSetting() {
    this.showSetting = !this.showSetting;
  }

  public play() {
    if (this.players.length >= 2) {
      this.gaming = true;
      this.emit('playGame');
    } else {
      console.log('no enough player');
    }
  }

  public emit(eventType: string, data: any = {}) {
    this.socket.emit(eventType, {
      target: '',
      payload: {
        ...data,
      },
    });
  }

  public initSitLink() {
    const sitListMap = this.sitList || [];
    if (sitListMap.length === 0) {
      for (let i = 0; i < 10; i++) {
        const sit = {
          player: null,
          position: i + 1,
        };
        sitListMap.push(sit);
      }
    }
    let link = new Link<ISit>(sitListMap).link;
    for (let i = 0; i < 10; i++) {
      if (link.node.player && link.node.player.userId === this.currPlayer?.userId) {
        this.sitLink = link;
        return;
      }
      const next = link.next;
      link = next as ILinkNode<ISit>;
    }
    this.sitLink = link;
  }

  public async getRecord(index: number) {
    try {
      let gameId = 0;
      if (!index) {
        const result = await service.gameRecordList(this.roomId);
        this.gameList = Object.values(result.data);
        gameId = this.gameList[this.gameList.length - 1].gameId;
        this.currGameIndex = this.gameList.length;
        console.log('ccc len', this.gameList.length);
      } else {
        this.currGameIndex = index;
        gameId = this.gameList[index - 1].gameId;
      }
      console.log(gameId, 'ccc11');
      const { data } = await service.commandRecordList(this.roomId, gameId);
      this.commandRecordList = data.commandList;
      this.showCommandRecord = true;
      console.log(data);
    } catch (e) {
      console.log(e);
      this.$plugin.toast('cannot find the room');
    }
  }

  public getRoomConfig() {
    return cookie.get('roomConfig') || localStorage.getItem('roomConfig') || '';
  }

  /**
   * 自动加入房间
   * - 会覆盖掉已经加入的房间的配置
   */
  public async autoJoinRoom() {
    try {
      const { data } = await service.findRoom(this.roomId);
      cookie.set('roomConfig', data, { expires: 1 });
    } catch (e) {
      this.$plugin.toast((e as any).message);
      console.log(e);
    }
  }

  public async created() {
    try {
      await this.autoJoinRoom();
      this.socketInit();
      if (!this.sitLink) {
        this.initSitLink();
      }
    } catch (e) {
      console.log(e);
    }
    // document.addEventListener('visibilitychange', () => {
    //   if (!document.hidden) {
    //     this.socketInit();
    //   }
    // });
  }
}
</script>

<style lang="less" scoped>
.game-container {
  background: radial-gradient(#00bf86, #006a55);
  background-size: 100% 100%;
  height: calc(100% - 45px);
  width: 100vw;
  overflow: hidden;

  .game-canvas {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -110px);
    white-space: nowrap;

    .action-notice {
      position: absolute;
      bottom: 100%;
      font-size: 16px;
      font-weight: bold;
      color: #cc0202;
      margin-bottom: 1em;
    }

    .game-body {
      z-index: 0;

      .roomId {
        margin-top: 10px;
        font-size: 14px;
      }
    }

    @media (min-width: 800px) and (min-height: 800px) {
      transform: translate(-50%, -150px);

      .action-notice {
        font-size: 24px;
      }

      .common-cards /deep/ .card-container {
        transform: scale(1.5);
      }
    }
  }

  .common-cards {
    margin-top: 30px;
  }

  .winner-poke-style {
    margin-top: 20px;
    font-size: 14px;
    color: #fff;
  }

  .setting {
    left: 0;
    top: 0;
    position: absolute;

    .shadow {
      position: fixed;
      z-index: 5;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.2);
    }

    .setting-btn {
      position: absolute;
      top: 0;
      left: 0;
      margin: 10px;
      background: url('../assets/setting-btn.svg');
      background-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    .setting-body {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      z-index: 8;
      width: 60%;
      // height: 40%;
      border-radius: 12px;
      box-sizing: border-box;
      background: #fff;
      padding: 20px;
      overflow-y: auto;
      font-weight: bold;

      p {
        padding: 6px;
        text-align: left;
        &.setting-close {
          text-align: right;
        }
      }
    }
  }

  .game-record {
    position: absolute;
    right: 10px;
    top: 7px;
    font-size: 36px;
    color: #fff;
  }
}

.loader-position {
  position: absolute;
  left: 50%;
  top: 30%;
  transform: translate(-50%, -50%);
}
</style>
