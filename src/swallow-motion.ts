// A deliberately slowed teaching sequence; timing and motion are illustrative.
export const swallowPhases = [
  {name:'呼吸准备',short:'入口开放',text:'会厌竖起，喉入口开放，空气可通过气管。食团停在舌根后方，等待吞咽。',air:'气道开放',food:'食团待送'},
  {name:'关闭气道',short:'喉上提 · 会厌翻转',text:'喉向上、向前移动，会厌向后下方翻转；喉前庭与声门同步关闭，出现短暂的吞咽性呼吸暂停。',air:'气道保护中',food:'暂未越过入口'},
  {name:'食团通过',short:'绕过喉入口 → 食管',text:'气道保持关闭。食团从喉入口旁侧绕过，向后进入咽下部，再进入食管；食团不穿过会厌，也不进入气管。',air:'气道保持关闭',food:'进入后方食管'},
  {name:'恢复呼吸',short:'会厌复位 · 气道重开',text:'食团离开咽部后，喉下降、会厌复位，气道重新开放，呼吸恢复。真实吞咽由多个结构协调完成。',air:'恢复开放',food:'食团已下行'}
];
const smooth=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
export function swallowState(progress:number){
  const p=Math.max(0,Math.min(1,progress));
  const closure=smooth(.25,.43,p)*(1-smooth(.78,.96,p));
  return {progress:p,phase:Math.min(3,Math.floor(p*4)),closure,lift:.007*closure,forward:.003*closure,angle:-1.48*closure,foodVisible:p<.76,foodTravel:smooth(.48,.75,p),airOpen:closure<.15};
}
