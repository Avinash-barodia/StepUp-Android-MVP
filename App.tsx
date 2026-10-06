import React, { useEffect, useState } from 'react';
import { Alert, AppState, Linking, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle } from 'react-native-svg';
import tracker, { Snapshot } from './modules/step-tracker';

const green = '#23614F';
function localDate(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && { opacity: 0.4 }]}><Text style={[styles.buttonText, secondary && {color:green}]}>{title}</Text></Pressable>;
}
function AppContent() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState('Today');
  const [weight, setWeight] = useState(''); const [height, setHeight] = useState('');
  const [goal, setGoal] = useState('8000'); const [length, setLength] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  function refresh() { try { if(tracker) setData(tracker.snapshot()); } catch(e) { setError(String(e)); } }
  useEffect(() => { refresh(); const id = setInterval(refresh, 2000); const sub = AppState.addEventListener('change', s => { if(s === 'active') refresh(); }); return () => { clearInterval(id); sub.remove(); }; }, []);
  useEffect(() => { if(data?.configured) { setWeight(String(data.profile.weight)); setHeight(String(data.profile.height)); setGoal(String(data.profile.goal)); setLength(data.profile.stepLength.toFixed(2)); } }, [data?.configured]);
  const today = data?.days.find(d => d.date === localDate()) ?? {steps:0,km:0,kcal:0};
  const target = data?.profile.goal ?? 8000;
  async function start() {
    if(!tracker) return;
    setBusy(true); setError('');
    try {
      if(Number(Platform.Version) >= 29) {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION, {title:'Allow step counting', message:'StepUp uses your phone’s activity sensor to count steps, including with the screen locked.',buttonPositive:'Continue',buttonNegative:'Cancel'});
        if(result !== PermissionsAndroid.RESULTS.GRANTED) { setError('Activity permission is needed. Enable it in Android settings, then try again.'); return; }
      }
      if(Number(Platform.Version) >= 33) await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      tracker.start(); setTimeout(refresh,600);
    } catch(e) { setError(String(e)); } finally { setBusy(false); }
  }
  function save() {
    const w=Number(weight), h=Number(height), g=Number(goal), l=length.trim() ? Number(length) : h*0.00415;
    if(!Number.isFinite(w)||w<20||w>350||!Number.isFinite(h)||h<100||h>250||!Number.isInteger(g)||g<100||g>100000||!Number.isFinite(l)||l<0.2||l>1.5) { Alert.alert('Check your details','Weight: 20–350 kg. Height: 100–250 cm. Goal: 100–100,000 whole steps. Step length: 0.2–1.5 m.'); return; }
    try { tracker?.configure(w,h,g,l); setLength(l.toFixed(2)); refresh(); setTab('Today'); Alert.alert('Profile saved','Changes apply to future steps. Tap Start tracking to begin.'); } catch(e) {setError(String(e));}
  }
  const settings = <>
    <Text style={styles.heading}>{data?.configured ? 'Make it yours.' : 'Let’s set your pace.'}</Text>
    <Text style={styles.body}>Your details stay on this phone. They help estimate walking distance and active calories.</Text>
    {([['Weight · kg',weight,setWeight,'75'],['Height · cm',height,setHeight,'178'],['Daily step goal',goal,setGoal,'8000'],['Step length · metres (optional)',length,setLength,'Auto from height']] as const).map(([label,value,set,placeholder]) => <View key={label} style={{marginTop:18}}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} style={styles.input} value={value} onChangeText={set} keyboardType="decimal-pad" placeholder={placeholder} placeholderTextColor="#8D9992" /></View>)}
    <Text style={styles.note}>For a better distance estimate, walk a measured 20 metres and divide 20 by your counted steps. Enter that length above.</Text>
    <Button title="Save profile" onPress={save}/>
    {data?.configured && <><Button title="Open Android app settings" secondary onPress={() => { void Linking.openSettings(); }}/><Button title="Delete walking history" secondary onPress={() => Alert.alert('Delete all history?','This cannot be undone. Your profile will remain.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{try{tracker?.stop(); setTimeout(()=>{try{tracker?.clear();refresh();}catch(e){setError(String(e));}},500);}catch(e){setError(String(e));}}}])}/></>}
  </>;
  if(!tracker) return <SafeAreaView style={styles.safe}><View style={styles.page}><Text style={styles.brand}>StepUp</Text><Text style={styles.heading}>Your phone is the tracker.</Text><Text style={styles.body}>Install the StepUp Android APK built with EAS to use the native step sensor. This module is not available in Expo Go or a web preview.</Text><Text style={styles.note}>See README.md in the project for the cloud build commands.</Text></View></SafeAreaView>;
  return <SafeAreaView style={styles.safe}><StatusBar style="dark"/><View style={styles.header}><Text style={styles.brand}>StepUp<Text style={{color:'#D6984F'}}> ·</Text></Text><Text style={styles.small}>A LITTLE MORE, EVERY DAY</Text></View>
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {!!error && <View style={styles.warning}><Text style={styles.body}>{error}</Text><Button title="App settings" secondary onPress={()=>{void Linking.openSettings();}}/></View>}
      {!data ? <Text style={styles.body}>Loading your activity…</Text> : !data.configured || tab==='Settings' ? settings : tab==='Today' ? <>
        <Text style={styles.eyebrow}>{new Date().toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'}).toUpperCase()}</Text>
        <Text style={styles.heading}>Every step counts.</Text><Text style={styles.body}>Make room for a little movement.</Text>
        <View style={styles.hero}><View style={{width:250,height:250,alignSelf:'center',justifyContent:'center',alignItems:'center'}}>
          <Svg width={250} height={250} style={StyleSheet.absoluteFill}><Circle cx={125} cy={125} r={108} stroke="#DFE8DF" strokeWidth={13} fill="none"/><Circle cx={125} cy={125} r={108} stroke={green} strokeWidth={13} fill="none" strokeLinecap="round" strokeDasharray={`${2*Math.PI*108}`} strokeDashoffset={2*Math.PI*108*(1-Math.min(today.steps/target,1))} rotation={-90} origin="125,125"/></Svg>
          <Text style={styles.stepNumber}>{today.steps.toLocaleString()}</Text><Text style={styles.body}>steps today</Text><Text style={styles.goal}>of {target.toLocaleString()} goal</Text>
        </View><Text style={styles.progressText}>{today.steps>=target ? 'Daily goal reached. Nicely done!' : `${(target-today.steps).toLocaleString()} steps to your goal`}</Text></View>
        <View style={styles.stats}><View style={styles.stat}><Text style={styles.eyebrow}>DISTANCE</Text><Text style={styles.statNumber}>{today.km.toFixed(2)} <Text style={styles.unit}>km</Text></Text><Text style={styles.small}>Estimated</Text></View><View style={styles.stat}><Text style={styles.eyebrow}>ACTIVE ENERGY</Text><Text style={styles.statNumber}>{Math.round(today.kcal)} <Text style={styles.unit}>kcal</Text></Text><Text style={styles.small}>Walking estimate</Text></View></View>
        <View style={styles.card}><Text style={styles.cardTitle}>{!data.available ? 'Step sensor unavailable' : data.running ? data.status : 'Tracking paused'}</Text><Text style={styles.body}>{data.running ? 'Carry your phone as you walk. Sensor updates may arrive with a short delay.' : 'Start tracking while this app is open. Your phone does the counting.'}</Text>{data.lastUpdate>0 && <Text style={styles.note}>Last sensor update: {new Date(data.lastUpdate).toLocaleTimeString()}</Text>}
          <Button title={busy ? 'Starting…' : data.running ? 'Pause tracking' : 'Start tracking'} disabled={!data.available||busy} onPress={data.running ? ()=>{tracker?.stop();setTimeout(refresh,300);} : ()=>{void start();}}/>
        </View><Text style={styles.note}>Calories are a rough estimate for level walking, not total daily energy expenditure. Running, hills and workouts are not modelled.</Text>
        <Text style={styles.note}>After a reboot, force-stop or system shutdown of tracking, reopen StepUp and tap Start. Steps during paused periods are not recovered.</Text>
      </> : <>
        <Text style={styles.eyebrow}>YOUR ACTIVITY</Text><Text style={styles.heading}>Small steps. Real progress.</Text>
        <View style={styles.card}><Text style={styles.cardTitle}>Last seven days</Text><View style={styles.chart}>{Array.from({length:7},(_,i)=>{const date=new Date();date.setDate(date.getDate()-6+i);const count=data.days.find(d=>d.date===localDate(date))?.steps??0;const max=Math.max(target,...data.days.slice(0,7).map(d=>d.steps));return <View key={i} style={styles.barColumn}><Text style={styles.barValue}>{count>=1000?`${(count/1000).toFixed(1)}k`:count}</Text><View style={styles.barTrack}><View style={[styles.bar,{height:Math.max(2,count/max*100)}]}/></View><Text style={styles.small}>{date.toLocaleDateString(undefined,{weekday:'narrow'})}</Text></View>;})}</View></View>
        {data.days.length===0 ? <Text style={styles.body}>Your first walk will appear here. Save your profile and start tracking to begin.</Text> : data.days.map(d=><View key={d.date} style={styles.historyRow}><View><Text style={styles.cardTitle}>{d.date}</Text><Text style={styles.small}>{d.km.toFixed(2)} km · ~{Math.round(d.kcal)} active kcal</Text></View><Text style={styles.historySteps}>{d.steps.toLocaleString()}<Text style={styles.unit}> steps</Text></Text></View>)}
      </>}
    </ScrollView>
    {data?.configured && <View style={styles.tabs}>{['Today','History','Settings'].map(t=><Pressable key={t} accessibilityRole="tab" accessibilityState={{selected:t===tab}} onPress={()=>setTab(t)} style={[styles.tab,tab===t&&styles.activeTab]}><Text style={{color:tab===t?green:'#758379',fontWeight:'700'}}>{t}</Text></Pressable>)}</View>}
  </SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><AppContent/></SafeAreaProvider>;}
const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#F6F7F1'},header:{paddingHorizontal:24,paddingVertical:16,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},brand:{fontSize:28,fontWeight:'800',color:green,letterSpacing:-1},small:{fontSize:11,color:'#738176'},page:{padding:24,paddingBottom:32},heading:{fontSize:32,lineHeight:38,fontWeight:'700',letterSpacing:-1,color:'#203D31',marginTop:8,marginBottom:10},body:{fontSize:15,lineHeight:23,color:'#68766C'},eyebrow:{fontSize:11,letterSpacing:1.5,fontWeight:'700',color:'#6B7B6F'},hero:{marginVertical:22,padding:18,backgroundColor:'#EDF1E6',borderRadius:28},stepNumber:{fontSize:48,fontWeight:'800',color:green,letterSpacing:-2},goal:{marginTop:12,fontSize:13,color:'#7B887D'},progressText:{textAlign:'center',fontSize:13,color:green,marginTop:14,fontWeight:'600'},stats:{flexDirection:'row',gap:12},stat:{flex:1,backgroundColor:'#FFFFFF',padding:17,borderRadius:20},statNumber:{fontSize:29,fontWeight:'700',color:'#203D31',marginVertical:10},unit:{fontSize:12,fontWeight:'400'},card:{marginTop:20,padding:20,backgroundColor:'#FFFFFF',borderRadius:22},cardTitle:{fontSize:16,fontWeight:'700',color:'#203D31',marginBottom:8},button:{backgroundColor:green,borderRadius:15,padding:17,alignItems:'center',marginTop:18},secondary:{backgroundColor:'#E8EDE4'},buttonText:{color:'#FFFFFF',fontSize:15,fontWeight:'700'},note:{fontSize:12,lineHeight:19,color:'#778276',marginTop:16},label:{fontSize:13,fontWeight:'600',color:'#3E5345',marginBottom:8},input:{backgroundColor:'white',borderWidth:1,borderColor:'#DDE4D9',borderRadius:14,padding:16,fontSize:17,color:'#203D31'},warning:{padding:16,backgroundColor:'#FFF0D8',borderRadius:16,marginBottom:16},tabs:{flexDirection:'row',padding:10,borderTopWidth:1,borderColor:'#E3E8DE',backgroundColor:'#F6F7F1'},tab:{flex:1,alignItems:'center',paddingVertical:14,borderRadius:12},activeTab:{backgroundColor:'#E5EDDF'},chart:{height:150,flexDirection:'row',gap:8,marginTop:15},barColumn:{flex:1,alignItems:'center',justifyContent:'flex-end'},barValue:{fontSize:10,color:green,marginBottom:7},barTrack:{height:100,justifyContent:'flex-end',width:18,marginBottom:8},bar:{backgroundColor:green,borderRadius:6,width:18},historyRow:{paddingVertical:20,borderBottomWidth:1,borderColor:'#E1E7DC',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},historySteps:{fontSize:20,fontWeight:'700',color:green}
});
