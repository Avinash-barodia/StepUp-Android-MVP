import React, { useEffect, useState } from 'react';
import { Alert, AppState, Linking, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Path } from 'react-native-svg';
import tracker, { Snapshot, Walk } from './modules/step-tracker';
import { themes } from './src/themes';
import { clock, pace, cadence, speed, dateKey } from './src/metrics';

type Tab = 'Today'|'Walk'|'History'|'Profile';
function AppContent() {
  const [data,setData]=useState<Snapshot|null>(null), [tab,setTab]=useState<Tab>('Today');
  const [weight,setWeight]=useState(''), [height,setHeight]=useState(''), [goal,setGoal]=useState('8000'), [length,setLength]=useState('');
  const [theme,setTheme]=useState<'blush'|'charcoal'>('blush'), [error,setError]=useState(''), [busy,setBusy]=useState(false);
  const [historyMode,setHistoryMode]=useState<'walks'|'days'>('walks'), [selected,setSelected]=useState<Walk|null>(null);
  const c=themes[theme];
  function refresh(){ try { if(tracker){const s=tracker.snapshot();setData(s);setTheme(s.theme??'blush');} } catch(e){setError(String(e));} }
  useEffect(()=>{refresh();const id=setInterval(()=>{if(AppState.currentState==='active')refresh();},1000);const sub=AppState.addEventListener('change',s=>{if(s==='active')refresh();});return()=>{clearInterval(id);sub.remove();};},[]);
  useEffect(()=>{if(data?.configured){setWeight(String(data.profile.weight));setHeight(String(data.profile.height));setGoal(String(data.profile.goal));setLength(data.profile.stepLength.toFixed(3));}},[data?.configured]);
  const active=data?.sessions.find(s=>s.status!=='saved');
  const today=data?.days.find(d=>d.date===dateKey())??{steps:0,km:0,kcal:0};
  const target=data?.profile.goal??8000;
  const button=(title:string,onPress:()=>void,secondary=false,disabled=false)=><Pressable accessibilityRole="button" disabled={disabled||busy} onPress={onPress} style={[styles.button,{backgroundColor:secondary?'transparent':c.accent,borderColor:c.accent,borderWidth:secondary?1:0,opacity:disabled||busy?0.45:1}]}><Text style={{fontSize:16,fontWeight:'700',color:secondary?c.accent:c.onAccent}}>{title}</Text></Pressable>;
  const text=(s:string)=> <Text style={[styles.body,{color:c.muted}]}>{s}</Text>;
  const heading=(s:string)=> <Text style={[styles.heading,{color:c.ink}]}>{s}</Text>;
  const title=(s:string)=> <Text style={[styles.title,{color:c.ink}]}>{s}</Text>;
  const card=(children:React.ReactNode)=> <View style={[styles.card,{backgroundColor:c.card,borderColor:c.line}]}>{children}</View>;
  const metric=(value:string,label:string)=> <View style={[styles.metric,{backgroundColor:c.soft}]}><Text style={[styles.metricValue,{color:c.ink}]}>{value}</Text><Text style={[styles.small,{color:c.muted}]}>{label}</Text></View>;
  function action(a:'begin'|'pause'|'resume'|'finish'|'save'|'discard'){try{tracker?.sessionAction(a);refresh();if(a==='save'||a==='discard'){setTab('History');setSelected(null);}}catch(e){setError(String(e));}}
  async function start(session=false){
    if(!tracker||busy)return;setBusy(true);setError('');
    try{
      if(Number(Platform.Version)>=29 && await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION)!==PermissionsAndroid.RESULTS.GRANTED){setError('Allow Physical activity permission in Android settings to count steps.');return;}
      if(Number(Platform.Version)>=33)await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if(!tracker.snapshot().running)tracker.start();
      let ready=false;
      for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,150));if(tracker.snapshot().running){ready=true;break;}}
      if(!ready)throw new Error('Tracking could not start. Check activity permission and try again.');
      if(session){tracker.sessionAction(active?'resume':'begin');setTab('Walk');}
      refresh();
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  function finish(){Alert.alert('Finish this walk?','You can review the results before saving.',[{text:'Keep walking',style:'cancel'},{text:'Finish',onPress:()=>action('finish')}]);}
  function saveProfile(){const w=Number(weight),h=Number(height),g=Number(goal),l=length.trim()?Number(length):h*0.00415;
    if(!Number.isFinite(w)||w<20||w>350||!Number.isFinite(h)||h<100||h>250||!Number.isInteger(g)||g<100||g>100000||!Number.isFinite(l)||l<0.2||l>1.5){Alert.alert('Check your details','Weight: 20–350 kg. Height: 100–250 cm. Goal: 100–100,000 steps. Step length: 0.2–1.5 m.');return;}
    try{tracker?.configure(w,h,g,l);setLength(l.toFixed(3));refresh();setTab('Today');Alert.alert('Profile saved','Your new measurements apply to future steps.');}catch(e){setError(String(e));}
  }
  const themePicker=<View style={styles.row}>{(['blush','charcoal'] as const).map(t=><Pressable accessibilityRole="radio" accessibilityState={{checked:theme===t}} key={t} onPress={()=>{try{tracker?.setTheme(t);setTheme(t);}catch(e){setError(String(e));}}} style={[styles.themeChoice,{backgroundColor:themes[t].bg,borderColor:theme===t?c.accent:c.line,borderWidth:2}]}><View style={{height:22,width:22,borderRadius:11,backgroundColor:themes[t].accent,marginBottom:8}}/><Text style={{color:themes[t].ink,fontWeight:'700'}}>{themes[t].name}{theme===t?' ✓':''}</Text></Pressable>)}</View>;
  function summary(w:Walk){return <>
    {heading(w.status==='review'?'A walk worth keeping.':'Your walk, in numbers.')}
    {text(new Date(w.started).toLocaleString())}
    {card(<><Text style={[styles.timer,{color:c.ink}]}>{clock(w.elapsedMs)}</Text>{text('Session time · manual pauses excluded')}<View style={styles.row}>{metric(pace(w.elapsedMs,w.km),'Avg. pace · min/km')}{metric(speed(w.elapsedMs,w.km),'Avg. speed · km/h')}</View><View style={styles.row}>{metric(w.km.toFixed(2),'Est. distance · km')}{metric(w.steps.toLocaleString(),'Steps')}</View><View style={styles.row}>{metric(cadence(w.elapsedMs,w.steps),'Avg. steps/min')}{metric(String(Math.round(w.kcal)),'Est. active kcal')}</View></>)}
    {text('Distance, pace, speed and energy are estimates from phone steps and your step length. Standing still counts toward session time unless paused.')}
    {w.status==='review'?<>{button('Save walk',()=>action('save'))}{button('Discard walk',()=>Alert.alert('Discard this walk?','The session will be removed. Daily steps will remain.',[{text:'Cancel',style:'cancel'},{text:'Discard',style:'destructive',onPress:()=>action('discard')}]),true)}</>:button('Back to history',()=>setSelected(null),true)}
  </>;}
  const week=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return{label:d.toLocaleDateString(undefined,{weekday:'narrow'}),steps:data?.days.find(x=>x.date===dateKey(d))?.steps??0};});
  const weekMax=Math.max(target,...week.map(d=>d.steps));
  const chart=card(<>{title('This week')}<View style={styles.chart}>{week.map((d,i)=><View key={i} style={styles.barColumn}><Text style={[styles.small,{color:c.muted}]}>{d.steps>=1000?`${(d.steps/1000).toFixed(1)}k`:d.steps}</Text><View style={{height:85,justifyContent:'flex-end',marginVertical:8}}><View style={{height:Math.max(3,d.steps/weekMax*85),width:18,borderRadius:6,backgroundColor:i===6?c.accent:c.ring}}/></View><Text style={[styles.small,{color:c.muted}]}>{d.label}</Text></View>)}</View></>);
  if(!tracker)return <SafeAreaView style={[styles.safe,{backgroundColor:c.bg}]}><View style={styles.page}>{heading('Install the new StepUp APK.')}{text('This version needs its updated native Android module. Build the preview APK with EAS; Expo Go cannot run the tracker.')}</View></SafeAreaView>;
  return <SafeAreaView style={[styles.safe,{backgroundColor:c.bg}]}><StatusBar style={theme==='charcoal'?'light':'dark'}/>
    <View style={styles.header}><Text style={[styles.logo,{color:c.accent}]}>StepUp</Text><Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={()=>setTab('Profile')} style={[styles.avatar,{backgroundColor:c.soft}]}><Svg width={22} height={22} viewBox="0 0 24 24"><Circle cx={12} cy={8} r={3.5} fill="none" stroke={c.accent} strokeWidth={1.6}/><Path d="M5 21v-2a7 7 0 0 1 14 0v2" fill="none" stroke={c.accent} strokeWidth={1.6}/></Svg></Pressable></View>
    {active && tab!=='Walk' && <Pressable accessibilityRole="button" onPress={()=>{setTab('Walk');setSelected(null);}} style={[styles.banner,{backgroundColor:c.soft}]}><Text style={{color:c.ink,fontWeight:'700'}}>{active.status==='review'?'Review your walk':`${active.status==='recording'?'Walk in progress':'Walk paused'} · ${clock(active.elapsedMs)}`}</Text><Text style={{color:c.accent}}>Open →</Text></Pressable>}
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {!!error&&card(<>{title('Let’s fix this')}{text(error)}{button('Android app settings',()=>{void Linking.openSettings();},true)}{button('Dismiss',()=>setError(''),true)}</>)}
      {!data?text('Loading your activity…'):!data.configured||tab==='Profile'?<>
        {heading(data.configured?'Make it yours.':'Find your rhythm.')}{text('Choose your look. Both themes have the same features, and you can switch anytime.')}{themePicker}
        {title('Your measurements')}{text('Used for rough distance and calorie estimates. No account is needed in the app.')}
        {([['Weight · kg',weight,setWeight,'75'],['Height · cm',height,setHeight,'178'],['Daily step goal',goal,setGoal,'8000'],['Step length · metres (optional)',length,setLength,'Auto from height']] as const).map(([label,value,set,placeholder])=><View key={label} style={{marginTop:16}}><Text style={[styles.label,{color:c.ink}]}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={set} keyboardType="decimal-pad" placeholder={placeholder} placeholderTextColor={c.muted} style={[styles.input,{backgroundColor:c.card,borderColor:c.line,color:c.ink}]}/></View>)}
        {text('Calibrate: walk a measured 20 metres, count your steps, then enter 20 ÷ steps as your step length. Updating height alone keeps an existing calibrated length.')}{button('Save profile',saveProfile)}
        {data.configured&&<>{card(<>{title(data.running?'Daily tracking is on':'Daily tracking is paused')}{text('Daily steps can continue while a walk session is paused or finished.')}{button(data.running?'Pause daily tracking':'Enable daily tracking',()=>{if(data.running){if(active?.status==='recording'){Alert.alert('Pause your walk first','Open the Walk tab and pause your session before stopping daily tracking.');return;}tracker?.stop();setTimeout(refresh,250);}else void start();},true,!data.available)}{button('Android app settings',()=>{void Linking.openSettings();},true)}</>)}{button('Delete all activity history',()=>Alert.alert('Delete all activity?','Saved walks and daily totals will be deleted. Your profile and theme will remain.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{try{if(active){Alert.alert('Finish your current walk first');return;}tracker?.stop();setTimeout(()=>{try{tracker?.clear();refresh();}catch(e){setError(String(e));}},500);}catch(e){setError(String(e));}}}]),true)}</>}
      </>:tab==='Today'?<>
        {heading('Find your stride.')}{text(new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}))}
        <View style={styles.ringWrap}>
          {theme==='blush'&&<Svg width={290} height={280} style={StyleSheet.absoluteFill} viewBox="0 0 290 280"><Path d="M145 240Q15 210 20 90Q135 110 145 240 M145 240Q285 195 267 52Q155 97 145 240" fill={c.soft} opacity={0.55}/></Svg>}
          <Svg width={256} height={256} style={{position:'absolute'}}><Circle cx={128} cy={128} r={106} fill="none" stroke={c.ring} strokeWidth={13}/><Circle cx={128} cy={128} r={106} fill="none" stroke={c.accent} strokeWidth={13} strokeLinecap="round" strokeDasharray={2*Math.PI*106} strokeDashoffset={2*Math.PI*106*(1-Math.min(today.steps/target,1))} rotation={-90} origin="128,128"/></Svg>
          <Text style={[styles.stepNumber,{color:c.ink}]}>{today.steps.toLocaleString()}</Text>{text(`of ${target.toLocaleString()} steps`)}
        </View>
        <View style={styles.row}>{metric(today.km.toFixed(2)+' km','Estimated distance')}{metric(Math.round(today.kcal)+' kcal','Estimated active energy')}</View>
        {button(active?'Return to your walk':'Start a walk',()=>active?setTab('Walk'):void start(true),false,!data.available)}
        {chart}{card(<>{title(!data.available?'Step sensor unavailable':data.running?'Daily tracking is on':'Daily tracking is paused')}{text(!data.available?'This phone does not expose a step counter.':data.running?'Carry your phone. Steps may arrive with a short sensor delay.':'Start a walk or enable daily tracking in Profile.')}{data.lastUpdate>0&&text('Last sensor update: '+new Date(data.lastUpdate).toLocaleTimeString())}</>)}
        {text('After a reboot or force-stop, reopen StepUp to restart tracking. Missing steps are not recovered.')}
      </>:tab==='Walk'?active?.status==='review'?summary(active):active?<>
        {heading('Your walking time.')}
        <Text style={{color:active.status==='recording'?c.good:c.accent,fontWeight:'700',marginVertical:12}}>{active.status==='recording'?'● Recording':active.status==='interrupted'?'Tracking interrupted':'Ⅱ Paused'}</Text>
        {active.status==='interrupted'&&text('The tracker stopped. Time is retained up to its last checkpoint. Resume when you’re ready.')}
        {card(<><Text style={[styles.timer,{color:c.ink}]}>{clock(active.elapsedMs)}</Text>{text('Session time · manual pauses excluded')}</>)}
        {card(<><Text style={[styles.pace,{color:c.ink}]}>{pace(active.elapsedMs,active.km)}</Text>{text('Average pace · min/km · estimated')}</>)}
        <View style={styles.row}>{metric(active.km.toFixed(2)+' km','Est. distance')}{metric(active.steps.toLocaleString(),'Steps')}</View>
        <View style={styles.row}>{metric(cadence(active.elapsedMs,active.steps),'Avg. steps/min')}{metric(Math.round(active.kcal)+' kcal','Est. active energy')}</View>
        {text(`Average speed: ${speed(active.elapsedMs,active.km)} km/h · estimated`)}
        {button(active.status==='recording'?'Pause':'Resume',()=>active.status==='recording'?action('pause'):void start(true))}{button('Finish walk',finish,true)}
        {text('Pause when you stop for a break. Pace includes standing time until you pause. Sensor batches can delay step updates.')}
      </>:<>{heading('Make time for a walk.')}{text('Start a session to record your time, steps and estimated average pace. Your daily totals stay separate.')}{card(<>{title('Ready when you are.')}{text('Keep your phone with you. No GPS or smartwatch required.')}{button('Start a walk',()=>{void start(true);},false,!data.available)}</>)}{text('Energy estimates cover level walking only. Hills, running and other workouts are not modelled.')}</>:selected?summary(selected):<>
        {heading('Look how far you’ve come.')}{chart}<View style={styles.row}>{(['walks','days'] as const).map(m=><Pressable key={m} accessibilityRole="tab" accessibilityState={{selected:historyMode===m}} onPress={()=>setHistoryMode(m)} style={[styles.filter,{backgroundColor:historyMode===m?c.soft:c.card}]}><Text style={{color:c.ink,fontWeight:'700'}}>{m==='walks'?'Walks':'Daily totals'}</Text></Pressable>)}</View>
        {historyMode==='walks'?(data.sessions.filter(s=>s.status==='saved').length===0?card(<>{title('Your next chapter starts on foot.')}{text('Finish and save a walk to see it here.')}</>):data.sessions.filter(s=>s.status==='saved').map(w=><Pressable accessibilityRole="button" key={w.id} onPress={()=>setSelected(w)} style={[styles.historyRow,{backgroundColor:c.card}]}>{title(new Date(w.started).toLocaleDateString(undefined,{day:'numeric',month:'short'}))}{text(`${clock(w.elapsedMs)} · ${w.km.toFixed(2)} km · ${pace(w.elapsedMs,w.km)} min/km`)}<Text style={{color:c.accent,marginTop:8}}>View walk →</Text></Pressable>)):(data.days.length===0?text('Your daily steps will appear here.'):data.days.map(d=><View key={d.date} style={[styles.historyRow,{backgroundColor:c.card}]}>{title(d.date)}{text(`${d.steps.toLocaleString()} steps · ${d.km.toFixed(2)} km · ~${Math.round(d.kcal)} kcal`)}</View>))}
      </>}
    </ScrollView>
    {data?.configured&&<View style={[styles.tabs,{borderColor:c.line,backgroundColor:c.bg}]}>{(['Today','Walk','History','Profile'] as const).map(t=><Pressable key={t} accessibilityRole="tab" accessibilityState={{selected:tab===t}} onPress={()=>{setTab(t);setSelected(null);}} style={[styles.tab,{backgroundColor:tab===t?c.soft:'transparent'}]}><Text style={{fontSize:13,fontWeight:'700',color:tab===t?c.accent:c.muted}}>{t}</Text></Pressable>)}</View>}
  </SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><AppContent/></SafeAreaProvider>;}
const styles=StyleSheet.create({safe:{flex:1},page:{padding:22,paddingBottom:32},header:{paddingHorizontal:24,paddingVertical:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},logo:{fontSize:28,fontWeight:'800',letterSpacing:-1},avatar:{height:44,width:44,borderRadius:22,alignItems:'center',justifyContent:'center'},heading:{fontSize:31,lineHeight:38,fontWeight:'700',letterSpacing:-0.8,marginBottom:10},title:{fontSize:17,fontWeight:'700',marginBottom:8},body:{fontSize:14,lineHeight:22,marginVertical:5},small:{fontSize:12,lineHeight:18},card:{padding:20,borderRadius:24,borderWidth:1,marginVertical:12},row:{flexDirection:'row',gap:12,marginVertical:8},metric:{flex:1,padding:16,borderRadius:18,justifyContent:'center'},metricValue:{fontSize:23,fontWeight:'700',marginBottom:6},button:{padding:17,minHeight:54,borderRadius:28,alignItems:'center',justifyContent:'center',marginTop:12},stepNumber:{fontSize:46,fontWeight:'800',letterSpacing:-1},ringWrap:{height:280,alignItems:'center',justifyContent:'center',alignSelf:'center',width:290,marginVertical:10},timer:{fontSize:52,fontWeight:'700',fontVariant:['tabular-nums'],textAlign:'center',paddingVertical:16},pace:{fontSize:42,fontWeight:'700',fontVariant:['tabular-nums'],textAlign:'center'},themeChoice:{flex:1,padding:20,borderRadius:18,marginBottom:16},label:{fontSize:14,fontWeight:'600',marginBottom:8},input:{borderWidth:1,borderRadius:14,padding:16,fontSize:17},banner:{marginHorizontal:16,padding:14,borderRadius:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},tabs:{flexDirection:'row',borderTopWidth:1,padding:8,gap:4},tab:{flex:1,paddingVertical:16,borderRadius:14,alignItems:'center'},chart:{flexDirection:'row',justifyContent:'space-between',marginTop:12},barColumn:{alignItems:'center',flex:1},filter:{padding:14,borderRadius:14,flex:1,alignItems:'center'},historyRow:{padding:20,borderRadius:18,marginTop:12}});
