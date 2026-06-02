/* ═══════════════════════════════════════════════════════
   SAGEFARM RETIREMENT PLANNER — JavaScript
   Dependencies: Chart.js 4.4.1 (loaded via CDN in index.html)
   All functions scoped inside IIFE — no global namespace pollution
   sfCalcRet() and sfCalcSWP() exposed on window for inline HTML events
═══════════════════════════════════════════════════════ */

(function(){
'use strict';

/* ══════════════════════════════════════
   SAGEFARM TARGET RETURN — internal only
   22% p.a. used for SIP accumulation phase
   (SEBI-compliant: not shown to users)
══════════════════════════════════════ */
var SF_R_ANNUAL = 0.22;

/* ── FORMAT ── */
function toIndian(n){
  if(!n && n!==0) return '';
  n = Math.round(+n);
  if(isNaN(n)) return '';
  return n.toLocaleString('en-IN');
}
function strip(s){ return (s+'').replace(/[^0-9]/g,''); }
function fmt(n){
  n = Math.abs(+n);
  if(n >= 10000000) return '₹'+(n/10000000).toFixed(2)+' Cr';
  if(n >= 100000)   return '₹'+(n/100000).toFixed(2)+' L';
  if(n >= 1000)     return '₹'+(n/1000).toFixed(1)+' K';
  return '₹'+Math.round(n).toLocaleString('en-IN');
}

/* ── INPUT HELPERS ── */
window.sfLiveComma = function(el, hiddenId){
  var raw = strip(el.value);
  var num = raw === '' ? 0 : +raw;
  document.getElementById(hiddenId).value = num;
  var formatted = raw === '' ? '' : toIndian(num);
  var pos = el.selectionStart;
  var old = el.value;
  var dbc = old.slice(0,pos).replace(/[^0-9]/g,'').length;
  el.value = formatted;
  if(formatted){
    var dc=0, np=0;
    for(var i=0;i<formatted.length;i++){
      if(/[0-9]/.test(formatted[i])) dc++;
      if(dc===dbc){np=i+1;break;}
    }
    if(dc<dbc) np=formatted.length;
    try{el.setSelectionRange(np,np);}catch(e){}
  }
  var sl = document.getElementById(hiddenId+'Slide');
  if(sl) sl.value = Math.min(+sl.max, Math.max(+sl.min, num));
};
window.sfSlideToField = function(slide, hiddenId, dispId){
  var v = +slide.value;
  document.getElementById(hiddenId).value = v;
  document.getElementById(dispId).value = toIndian(v);
};

/* ── CHART COLOURS ── */
var TXT='#5c6b6e';
var TEAL='#e8a045', TEAL_FILL='rgba(232,160,69,0.13)';   /* corpus = warm amber/golden */
var GRAY='#c8d8d5', GRAY_FILL='rgba(200,216,213,0.28)';
var AMBER='#d4820a', AMBER_FILL='rgba(212,130,10,0.08)';
var STEP_COLOR='#22c97a', STEP_FILL='rgba(34,201,122,0.10)'; /* step-up = bright green */

function CHART_OPT(){
  return {
    responsive:true, maintainAspectRatio:false,
    interaction:{mode:'index',intersect:false},
    plugins:{
      legend:{display:false},
      tooltip:{backgroundColor:'#fff',borderColor:'#d0e8e3',borderWidth:1,
        titleColor:'#111',bodyColor:TXT,padding:10,cornerRadius:8,
        callbacks:{label:function(d){return ' '+d.dataset.label+': '+fmt(d.raw);}}}
    },
    scales:{
      x:{grid:{display:false},ticks:{color:TXT,font:{size:11}},border:{display:false}},
      y:{grid:{color:'rgba(0,184,150,0.07)'},ticks:{color:TXT,font:{size:11},callback:function(v){return fmt(v);}},border:{display:false}}
    }
  };
}

/* ── STEP-UP TOGGLE ── */
window.sfOnStepToggle = function(){
  var on = document.getElementById('stepToggle').checked;
  document.getElementById('stepBox').classList.toggle('show', on);
  sfCalcRet();
};

/* ══════════════════════════════════════
   SIP FORMULAS — beginning-of-month (BOM)
   Standard SIP formula uses BOM convention:
   FV = P × [(1+r)^n - 1]/r × (1+r)
   where r = monthly rate, n = months
   This matches Groww / Scripbox / ET Money
══════════════════════════════════════ */
var retCh = null;

function calcData(){
  var goal    = +document.getElementById('retGoal').value    || 10000000;
  var yrs     = +document.getElementById('retYrs').value     || 20;
  var savings = +document.getElementById('retSavings').value || 0;
  var useStep = document.getElementById('stepToggle').checked;
  var su      = +document.getElementById('suInp').value || 10;
  var r = SF_R_ANNUAL / 12;  // monthly rate
  var n = yrs * 12;

  /* Future value of existing savings (BOM: compounded for full duration) */
  var savFV = savings * Math.pow(1+r, n);
  var fvNeeded = Math.max(0, goal - savFV);

  /*
   * BOM SIP needed formula:
   * FV = P × [(1+r)^n - 1]/r × (1+r)
   * → P = FV × r / [((1+r)^n - 1) × (1+r)]
   */
  var baseSip = fvNeeded <= 0 ? 0
    : fvNeeded * r / ((Math.pow(1+r,n) - 1) * (1+r));

  /* Build yearly series — BOM: add SIP at start of month then compound */
  var labels=[], invested=[], corpus=[], stepCorpus=[];
  var cumInv=0, cumCorp=savings;
  var stepCorp=savings, stepMon=baseSip, stepCumInv=0;

  for(var y=1; y<=yrs; y++){
    if(y>1 && useStep) stepMon = stepMon * (1 + su/100);
    for(var m=0; m<12; m++){
      /* BOM: deposit first, then earn interest */
      cumCorp = (cumCorp + baseSip) * (1+r);
      cumInv += baseSip;
      if(useStep){
        stepCorp = (stepCorp + stepMon) * (1+r);
        stepCumInv += stepMon;
      }
    }
    labels.push('Yr '+y);
    invested.push(Math.round(cumInv + savings));
    corpus.push(Math.round(cumCorp));
    if(useStep) stepCorpus.push(Math.round(stepCorp));
  }
  return {labels,invested,corpus,stepCorpus,useStep,baseSip,fvNeeded,goal,yrs,su,stepCumInv,cumInv,savings,r};
}


/* ── TOOLTIP CLICK HANDLER ── */
(function(){
  var activeIcon = null;
  document.addEventListener('click', function(e){
    var icon = e.target.closest
      ? e.target.closest('.info-icon')
      : (e.target.classList.contains('info-icon') ? e.target : null);
    if(icon){
      e.stopPropagation();
      var ctrl = icon.parentElement;
      while(ctrl && !ctrl.classList.contains('ctrl')) ctrl = ctrl.parentElement;
      var tip = ctrl ? ctrl.querySelector('.tooltip') : null;
      if(!tip) return;
      if(tip.style.display === 'block'){
        tip.style.display = 'none';
        icon.classList.remove('active');
        activeIcon = null;
        return;
      }
      // hide any open tooltip
      document.querySelectorAll('#sf-planner-root .tooltip').forEach(function(t){ t.style.display='none'; });
      document.querySelectorAll('#sf-planner-root .info-icon').forEach(function(i){ i.classList.remove('active'); });
      tip.style.display = 'block';
      icon.classList.add('active');
      activeIcon = icon;
    } else {
      // click outside — close all
      document.querySelectorAll('#sf-planner-root .tooltip').forEach(function(t){ t.style.display='none'; });
      document.querySelectorAll('#sf-planner-root .info-icon').forEach(function(i){ i.classList.remove('active'); });
      activeIcon = null;
    }
  });
})();

window.sfAdjustCorpus = function(delta){
  var hidden = document.getElementById('retGoal');
  var disp   = document.getElementById('retGoalDisp');
  var slide  = document.getElementById('retGoalSlide');
  var cur = +hidden.value || 10000000;
  var next = Math.max(+slide.min, Math.min(5000000000, cur + delta));
  hidden.value = next;
  disp.value = next.toLocaleString('en-IN');
  slide.value = next;
  sfUpdateCrLabel(next);
  sfCalcRet();
};

function sfUpdateCrLabel(val){
  var lbl = document.getElementById('retGoalCrLabel');
  if(!lbl) return;
  // Strip commas from display value if passed as string
  var n = typeof val === 'string' ? +(val.replace(/,/g,'')) : (+val || 0);
  if(n >= 10000000){
    var crVal = n / 10000000;
    // Show exact integer Cr, else 2 decimal places trimmed
    lbl.textContent = (Number.isInteger(crVal) ? crVal : +crVal.toFixed(2)) + ' Cr';
  } else if(n >= 100000){
    lbl.textContent = +(n/100000).toFixed(2) + ' L';
  } else {
    lbl.textContent = '';
  }
}

window.sfCalcRet = function(){
  sfUpdateCrLabel(document.getElementById('retGoal').value);
  var d = calcData();
  var goalAchieved = (d.fvNeeded <= 0);
  var fi = d.invested[d.invested.length-1];
  var fc = d.corpus[d.corpus.length-1];
  var stepFinalCorpus = (d.useStep && d.stepCorpus.length) ? d.stepCorpus[d.stepCorpus.length-1] : 0;
  var displayCorpus = d.useStep ? stepFinalCorpus : fc;
  var totalInvested = d.useStep ? (d.stepCumInv + d.savings) : fi;

  /* Pills */
  var sipEl  = document.getElementById('rp-sip');
  var sipLbl = document.getElementById('rp-sip-lbl');
  var invLbl = document.getElementById('rp-inv-lbl');
  sipEl.textContent = d.baseSip <= 0 ? '₹0/mo (Goal met!)' : fmt(d.baseSip)+'/mo';
  if(goalAchieved || d.baseSip <= 0){
    sipEl.closest('.rpill').style.background  = '#007A63';
    sipEl.closest('.rpill').style.borderColor = '#007A63';
    sipLbl.textContent = 'Savings cover goal ✓';
  } else {
    sipEl.closest('.rpill').style.background  = '';
    sipEl.closest('.rpill').style.borderColor = '';
    sipLbl.textContent = d.useStep ? 'Flat SIP — Yr 1 base' : 'Monthly SIP needed';
  }
  invLbl.textContent = d.useStep ? 'Total Invested (Step-Up)' : 'Total Invested';
  document.getElementById('rp-invested').textContent = fmt(totalInvested);
  document.getElementById('rp-gain').textContent = fmt(Math.max(0, displayCorpus - totalInvested));

  /* Auto-fill SWP corpus */
  var autoC = Math.round(displayCorpus);
  document.getElementById('swpCorp').value     = autoC;
  document.getElementById('swpCorpDisp').value = toIndian(autoC);
  var swpSl = document.getElementById('swpCorpSlide');
  swpSl.value = Math.min(+swpSl.max, autoC);

  /* Legend */
  var leg = '<span class="li"><span class="ld" style="background:'+TEAL+'"></span>Corpus (Sagefarm target)</span>'
           +'<span class="li"><span class="ld" style="background:'+GRAY+'"></span>Amount invested</span>';
  if(d.useStep && d.stepCorpus.length)
    leg += '<span class="li"><span class="ld" style="background:'+STEP_COLOR+'"></span>Step-up corpus</span>';
  document.getElementById('retLegend').innerHTML = leg;

  /* Step-up table */
  buildSuTable(d);

  /* Chart */
  var datasets = [
    {label:'Amount invested', data:d.invested, borderColor:GRAY, backgroundColor:GRAY_FILL, borderWidth:1.5, borderDash:[5,3], fill:true, tension:.38, pointRadius:0, pointHoverRadius:4},
    {label:'Corpus (Sagefarm target)', data:d.corpus, borderColor:TEAL, backgroundColor:TEAL_FILL, borderWidth:2.5, fill:false, tension:.38, pointRadius:0, pointHoverRadius:5},
  ];
  if(d.useStep && d.stepCorpus.length)
    datasets.push({label:'Step-up corpus', data:d.stepCorpus, borderColor:STEP_COLOR, backgroundColor:STEP_FILL, borderWidth:2.5, fill:false, tension:.38, pointRadius:0, pointHoverRadius:5});
  if(retCh) retCh.destroy();
  retCh = new Chart(document.getElementById('retChart').getContext('2d'),{
    type:'line', data:{labels:d.labels, datasets:datasets}, options:CHART_OPT()
  });

  sfCalcSWP();
};

function buildSuTable(d){
  var tbody = document.getElementById('suTableBody');
  if(!d.useStep){ tbody.innerHTML=''; return; }
  var r = d.r, su = d.su;
  var stepMon = d.baseSip;
  var stepCumInv = 0, stepCorp = d.savings;
  var flatCumInv = 0, flatCorp = d.savings;
  var rows = '';
  for(var y=1; y<=d.yrs; y++){
    if(y>1) stepMon = stepMon*(1+su/100);
    for(var m=0; m<12; m++){
      stepCorp = (stepCorp + stepMon) * (1+r);
      stepCumInv += stepMon;
      flatCorp = (flatCorp + d.baseSip) * (1+r);
      flatCumInv += d.baseSip;
    }
    var extra = Math.max(0, stepCorp - flatCorp);
    rows += '<tr>'
      +'<td>Year '+y+'</td>'
      +'<td class="td-sip">'+fmt(stepMon)+'/mo</td>'
      +'<td style="color:#5c6b6e">'+fmt(d.baseSip)+'/mo</td>'
      +'<td>'+fmt(stepCumInv + d.savings)+'</td>'
      +'<td class="td-corp">'+fmt(stepCorp)+'</td>'
      +'<td style="color:#5c6b6e">'+fmt(flatCorp)+'</td>'
      +'<td class="td-diff">+'+fmt(extra)+'</td>'
    +'</tr>';
  }
  tbody.innerHTML = rows;
}

/* ══════════════════════════════════════
   SWP FORMULAS — beginning-of-month (BOM)
   Each month: withdraw first, then earn interest
   bal = (bal - W) × (1+r)
   Matches AMFI / Groww SWP convention
══════════════════════════════════════ */
var swpCh = null;
window.sfCalcSWP = function(){
  var corpus  = +document.getElementById('swpCorp').value || 10000000;
  var monthly = +document.getElementById('swpMon').value  || 80000;
  var ret     = +document.getElementById('swpRet').value  || 9;
  var r = ret / 100 / 12;

  var bal = corpus, months = 0, totalW = 0;
  var cs = [corpus], ws = [0];
  var breakPts = [{yr:0, bal:corpus, totalW:0}];

  /* Monthly interest on corpus (BOM: interest earned on (corpus - withdrawal)) */
  var monthlyInt = (corpus - monthly) > 0 ? (corpus - monthly) * r : 0;
  var sustainable = monthly < corpus * r; // can withdraw and corpus still grows

  if(sustainable){
    /* perpetual — run 40 years for display */
    for(var m=1; m<=480; m++){
      bal = (bal - monthly) * (1+r);  /* BOM: withdraw then compound */
      totalW += monthly;
      if(m%6===0){ cs.push(Math.round(bal)); ws.push(Math.round(totalW)); }
      if(m%60===0) breakPts.push({yr:m/12, bal:Math.round(bal), totalW:Math.round(totalW)});
    }
    document.getElementById('swpDuration').innerHTML = 'Never runs out <span style="font-size:11.5px;font-weight:400;color:rgba(255,255,255,0.55);display:block;margin-top:4px;letter-spacing:0;line-height:1.5">(Your Future is Secured with <strong style="color:rgba(255,255,255,0.85);font-weight:700">Sagefarm</strong>)</span>';
    document.getElementById('swpMeta').innerHTML =
      'Monthly gain (approx.): <strong>'+fmt(Math.round(corpus*r))+'</strong><br>'+
      'Withdrawal: <strong>'+fmt(monthly)+'/mo</strong><br>'+
      'Corpus in 40 yrs: <strong>'+fmt(bal)+'</strong>';
    sfSetSpill('ok','Corpus is perpetually sustainable');
    document.getElementById('swpChartLabel').textContent = 'Corpus growth over time (perpetual)';
    buildBreakdown(breakPts, corpus, true);
    drawSwp(cs, ws, 480, true);
    return;
  }

  /* Depleting — BOM: withdraw first, then compound */
  while(bal > monthly && months < 60000){  /* ~5000 yr cap */
    bal = (bal - monthly) * (1+r);
    totalW += monthly;
    months++;
  }
  /* last partial month */
  if(bal > 0 && bal <= monthly){
    totalW += bal;
    months++;
    bal = 0;
  }
  var tm = months;
  var plotStep = Math.max(1, Math.floor(tm/60));
  var b2 = corpus, tw2 = 0;
  var cs2 = [corpus], ws2 = [0];
  var breakPts2 = [{yr:0, bal:corpus, totalW:0}];
  for(var i=1; i<=tm; i++){
    var w = Math.min(monthly, b2);
    b2 = Math.max(0, (b2 - w) * (1+r));
    tw2 += w;
    if(i % plotStep === 0 || i === tm){ cs2.push(Math.round(b2)); ws2.push(Math.round(tw2)); }
    if(i % 60 === 0 && b2 > 0) breakPts2.push({yr:i/12, bal:Math.round(b2), totalW:Math.round(tw2)});
  }
  if(breakPts2[breakPts2.length-1].bal !== 0)
    breakPts2.push({yr:+(tm/12).toFixed(1), bal:0, totalW:Math.round(tw2)});

  var yrsF = tm / 12;
  document.getElementById('swpDuration').innerHTML =
    yrsF >= 100
      ? '<span style="font-size:28px;font-weight:700">~'+Math.round(yrsF)+'</span><span> yrs</span>'
      : yrsF >= 1
      ? '<span style="font-size:28px;font-weight:700">~'+yrsF.toFixed(1)+'</span><span> yrs</span>'
      : (tm === 0
          ? '<span style="font-size:15px;font-weight:600;line-height:1.5">Withdrawal exceeds<br>corpus — not viable</span>'
          : (tm < 3
              ? '<span style="font-size:15px;font-weight:600">Immediate depletion<br><span style="font-size:12px;font-weight:400">(&lt; 1 quarter)</span></span>'
              : '<span style="font-size:28px;font-weight:700">'+tm+'</span><span> months<br><span style="font-size:11px;font-weight:400;opacity:.7">('+Math.ceil(tm/3)+' quarters)</span></span>'));
  document.getElementById('swpMeta').innerHTML =
    'Total income: <strong>'+fmt(tw2)+'</strong><br>'+
    'Monthly withdrawal: <strong>'+fmt(monthly)+'/mo</strong><br>'+
    'Starting corpus: <strong>'+fmt(corpus)+'</strong>';

  if(tm === 0)       sfSetSpill('bad','Withdrawal exceeds corpus — not a viable SWP plan');
  else if(yrsF < 1)  sfSetSpill('bad','Corpus depletes within the year — critically under-funded');
  else if(yrsF < 5)  sfSetSpill('bad','Rapid depletion — reduce monthly withdrawal or grow corpus');
  else if(yrsF < 15) sfSetSpill('warn','Consider a lower withdrawal rate for long-term sustainability');
  else               sfSetSpill('ok','Strong corpus longevity — well-structured withdrawal plan');
  document.getElementById('swpChartLabel').textContent = 'Corpus depletion over time';
  buildBreakdown(breakPts2, corpus, false);
  drawSwp(cs2, ws2, tm, false);
};

function sfSetSpill(t, msg){
  var p = document.getElementById('swpPill');
  p.className = 'spill '+t;
  var ic = t==='ok'?'ti-check' : t==='warn'?'ti-alert-circle':'ti-alert-triangle';
  p.innerHTML = '<i class="ti '+ic+'" style="font-size:12px"></i><span>'+msg+'</span>';
}

function buildBreakdown(pts, startCorpus, perp){
  var tbody = document.getElementById('swpBreakdownBody');
  var statCfg = [
    {max:25, cls:'bad',  icon:'ti-alert-triangle', lbl:'Critical'},
    {max:50, cls:'warn', icon:'ti-alert-circle',   lbl:'Low'},
    {max:75, cls:'',     icon:'ti-minus',          lbl:'Moderate'},
    {max:101,cls:'ok',   icon:'ti-check',          lbl:'Healthy'}
  ];
  var rows = '';
  pts.forEach(function(p, i){
    var pct = startCorpus > 0 ? Math.round(p.bal / startCorpus * 100) : 0;
    var s = statCfg.find(function(c){return pct <= c.max;}) || statCfg[3];
    var isFirst = (i === 0);
    var isLast  = (!perp && i === pts.length-1 && p.bal === 0);
    var bg = isFirst ? 'background:rgba(0,184,150,0.04)' : (i%2===0 ? '' : 'background:rgba(0,0,0,0.015)');
    var barW = Math.max(0, Math.min(100, pct));
    var barC = pct>75 ? '#00B896' : pct>50 ? '#d4820a' : pct>25 ? '#e07b30' : '#c0392b';
    rows += '<tr style="border-bottom:1px solid #e0eeeb;'+bg+'">'
      +'<td style="font-weight:600;color:#5c6b6e">'+(isFirst?'Start':isLast?'End (Yr '+p.yr+')':'Year '+p.yr)+'</td>'
      +'<td><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">'
        +'<span style="font-weight:600;color:'+(isLast?'#c0392b':'#1a1a1a')+'">'+(isLast?'₹0':fmt(p.bal))+'</span>'
        +'<div style="width:80px;height:4px;background:#e0eeeb;border-radius:4px;overflow:hidden">'
          +'<div style="width:'+barW+'%;height:100%;background:'+barC+';border-radius:4px"></div>'
        +'</div>'
      +'</div></td>'
      +'<td style="color:#5c6b6e">'+(isFirst?'—':fmt(p.totalW))+'</td>'
      +'<td><span style="font-weight:600;color:'+barC+'">'+(isFirst?'100%':isLast?'0%':pct+'%')+'</span></td>'
      +'<td style="text-align:left">'
        +(isFirst
          ?'<span class="spill ok" style="padding:3px 9px;font-size:10.5px;margin-top:0"><i class="ti ti-leaf" style="font-size:11px"></i> Starting</span>'
          :isLast
          ?'<span class="spill bad" style="padding:3px 9px;font-size:10.5px;margin-top:0"><i class="ti ti-flag" style="font-size:11px"></i> Depleted</span>'
          :perp
          ?'<span class="spill ok" style="padding:3px 9px;font-size:10.5px;margin-top:0"><i class="ti ti-infinity" style="font-size:11px"></i> Growing</span>'
          :'<span class="spill '+s.cls+'" style="padding:3px 9px;font-size:10.5px;margin-top:0"><i class="ti '+s.icon+'" style="font-size:11px"></i> '+s.lbl+'</span>'
        )
      +'</td>'
    +'</tr>';
  });
  tbody.innerHTML = rows;
}

function drawSwp(cs, ws, tm, perp){
  var plotStep = Math.max(1, Math.floor(tm/60));
  var labels = [];
  for(var i=0; i<cs.length; i++){
    var mo = i * (perp ? 6 : plotStep);
    labels.push(mo===0 ? 'Now' : (Math.floor(mo/12))+'y'+(mo%12 ? mo%12+'m' : ''));
  }
  if(swpCh) swpCh.destroy();
  swpCh = new Chart(document.getElementById('swpChart').getContext('2d'),{
    type:'line',
    data:{labels:labels, datasets:[
      {label:'Remaining corpus',    data:cs, borderColor:'#00B896', backgroundColor:'rgba(0,184,150,0.1)',  borderWidth:2.5, fill:true, tension:.4, pointRadius:0, pointHoverRadius:4},
      {label:'Cumulative withdrawn',data:ws, borderColor:'#d4820a', backgroundColor:'rgba(212,130,10,0.08)', borderWidth:2,   fill:true, tension:.4, pointRadius:0, pointHoverRadius:4, borderDash:[5,4]},
    ]},
    options:(function(){
      var o = CHART_OPT();
      o.scales.x.ticks.maxTicksLimit = 14;
      o.scales.x.ticks.maxRotation = 0;
      return o;
    })()
  });
}

/* ── INIT ── */
sfCalcRet();

})();
