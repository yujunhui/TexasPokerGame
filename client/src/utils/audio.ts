import { Howl } from 'howler';
import { AudioData } from './audioData';

const loadData = {
  basic: AudioData.filter((e) => e.enable && e.type === 'basic'),
  raise: AudioData.filter((e) => e.enable && e.type === 'dialogue' && e.group.includes('raise')),
  allin: AudioData.filter((e) => e.enable && e.type === 'dialogue' && e.group.includes('allin')),
  callWhenAllin: AudioData.filter((e) => e.enable && e.type === 'dialogue' && e.group.includes('callWhenAllin')),
  foldWhenAllin: AudioData.filter((e) => e.enable && e.type === 'dialogue' && e.group.includes('foldWhenAllin')),
  clearCounter: AudioData.filter((e) => e.enable && e.type === 'dialogue' && e.group.includes('clearCounter')),
  gameStart: AudioData.filter((e) => e.enable && e.type === 'dialogue' && e.group.includes('gameStart')),
};

const allAudioData = [
  ...loadData.basic,
  ...loadData.raise,
  ...loadData.allin,
  ...loadData.callWhenAllin,
  ...loadData.foldWhenAllin,
  ...loadData.clearCounter,
  ...loadData.gameStart,
];

type allowDataGrp = Exclude<keyof typeof loadData, 'basic'>;

function playAudioGroupRandomly(dataGrp: allowDataGrp) {
  const names = loadData[dataGrp].map((e) => e.name);
  const namesLen = names.length;
  if (namesLen === 0) {
    return;
  }

  const name = namesLen === 1 ? names[0] : names[Math.floor(Math.random() * names.length)];
  playAudioByName(name);
}

export function playAudioByName(name: string) {
  const data = allAudioData.find((e) => name === e.name);
  if (!data) {
    return;
  }

  // const audio = new Howl({
  //   src: data.src,
  //   autoplay: true,
  //   onend: () => {
  //     audio.unload();
  //   },
  // });
  const audio = new Howl({
    src: data.src,
  });
  audio.play();
}

export const playRaise = () => playAudioByName('raise');
export const playFold = () => playAudioByName('fold');
export const playIncome = () => playAudioByName('income');
export const playGameStart = () => playAudioByName('game-start');

export const playRaiseRandomly = () => playAudioGroupRandomly('raise');
export const playAllinRandomly = () => playAudioGroupRandomly('allin');
export const playCallWhenAllinRandomly = () => playAudioGroupRandomly('callWhenAllin');
export const playFoldWhenAllinRandomly = () => playAudioGroupRandomly('foldWhenAllin');
export const playClearCounterRandomly = () => playAudioGroupRandomly('clearCounter');
