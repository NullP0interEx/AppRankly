import{j as e}from"./vendor-react-DEKjexSv.js";function C({content:x="",className:w=""}){if(!x)return e.jsx("div",{className:"text-slate-400 italic text-xs py-4",children:"No content provided. Click Edit to add notes."});const a=o=>{if(!o||typeof o!="string")return null;const t=[];let s=o,n=0;for(;s.length>0;){const c=s.match(/^`([^`]+)`/);if(c){t.push(e.jsx("code",{className:"px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-xs border border-white/10",children:c[1]},n++)),s=s.slice(c[0].length);continue}const l=s.match(/^(\*\*|__)(.*?)\1/);if(l){t.push(e.jsx("strong",{className:"font-bold text-white",children:l[2]},n++)),s=s.slice(l[0].length);continue}const g=s.match(/^(\*|_)(.*?)\1/);if(g){t.push(e.jsx("em",{className:"italic text-slate-200",children:g[2]},n++)),s=s.slice(g[0].length);continue}const p=s.match(/^\[([^\]]+)\]\(([^)]+)\)/);if(p){t.push(e.jsx("a",{href:p[2],target:"_blank",rel:"noopener noreferrer",className:"text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors",children:p[1]},n++)),s=s.slice(p[0].length);continue}const u=s.search(/[`*_\[]/);if(u===-1){t.push(e.jsx("span",{children:s},n++));break}else u===0?(t.push(e.jsx("span",{children:s[0]},n++)),s=s.slice(1)):(t.push(e.jsx("span",{children:s.slice(0,u)},n++)),s=s.slice(u))}return t},y=typeof x=="string"?x.split(`
`):[],i=[];let h=!1,b=[],m="",d=[],r=0;const f=()=>{if(d.length===0)return;const o=d[0],t=d.slice(1).filter(s=>!s.every(n=>/^[-:]+$/.test(n.trim())));i.push(e.jsx("div",{className:"my-4 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 p-1",children:e.jsxs("table",{className:"w-full text-left text-xs border-collapse",children:[e.jsx("thead",{children:e.jsx("tr",{className:"border-b border-white/10 bg-white/5 text-slate-300 font-semibold",children:o.map((s,n)=>e.jsx("th",{className:"px-3 py-2",children:a(s.trim())},n))})}),e.jsx("tbody",{children:t.map((s,n)=>e.jsx("tr",{className:"border-b border-white/5 hover:bg-white/5 transition-colors",children:s.map((c,l)=>e.jsx("td",{className:"px-3 py-2 text-slate-300",children:a(c.trim())},l))},n))})]})},`tbl_${r++}`)),d=[]};for(let o=0;o<y.length;o++){const t=y[o];if(t.trim().startsWith("```")){h?(i.push(e.jsxs("div",{className:"my-3 rounded-xl bg-slate-950 p-4 border border-white/10 font-mono text-xs overflow-x-auto text-emerald-400 shadow-inner",children:[m&&e.jsx("div",{className:"text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2 select-none",children:m}),e.jsx("pre",{className:"whitespace-pre",children:b.join(`
`)})]},`code_${r++}`)),h=!1,b=[],m=""):(f(),h=!0,m=t.trim().slice(3).trim());continue}if(h){b.push(t);continue}if(t.trim().startsWith("|")&&t.trim().endsWith("|")){const l=t.trim().slice(1,-1).split("|");d.push(l);continue}else f();if(t.startsWith("# ")){i.push(e.jsx("h1",{className:"text-xl md:text-2xl font-black text-white mt-6 mb-3 border-b border-white/10 pb-2",children:a(t.slice(2))},`h1_${r++}`));continue}if(t.startsWith("## ")){i.push(e.jsx("h2",{className:"text-lg md:text-xl font-bold text-sky-300 mt-5 mb-2",children:a(t.slice(3))},`h2_${r++}`));continue}if(t.startsWith("### ")){i.push(e.jsx("h3",{className:"text-base font-semibold text-indigo-300 mt-4 mb-1",children:a(t.slice(4))},`h3_${r++}`));continue}if(t.startsWith("#### ")){i.push(e.jsx("h4",{className:"text-sm font-semibold text-slate-200 mt-3 mb-1",children:a(t.slice(5))},`h4_${r++}`));continue}if(/^(---|[*]{3,}|_{3,})$/.test(t.trim())){i.push(e.jsx("hr",{className:"my-5 border-t border-white/10"},`hr_${r++}`));continue}if(t.startsWith("> ")){i.push(e.jsx("blockquote",{className:"my-2 border-l-4 border-indigo-500 pl-4 py-1.5 text-slate-300 bg-indigo-500/10 rounded-r-lg italic text-xs",children:a(t.slice(2))},`quote_${r++}`));continue}const s=t.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)/);if(s){const l=s[2].toLowerCase()==="x";i.push(e.jsxs("div",{className:"flex items-start space-x-2 my-1.5 text-xs",children:[e.jsx("input",{type:"checkbox",checked:l,readOnly:!0,className:"mt-0.5 h-3.5 w-3.5 rounded border-slate-700 text-accent-blue focus:ring-0 accent-accent-blue cursor-default"}),e.jsx("span",{className:l?"line-through text-slate-500":"text-slate-200",children:a(s[3])})]},`task_${r++}`));continue}const n=t.match(/^(\s*)([-*])\s+(.*)/);if(n){i.push(e.jsxs("div",{className:"flex items-start space-x-2 my-1 pl-2 text-xs text-slate-300",children:[e.jsx("span",{className:"text-accent-blue font-bold",children:"•"}),e.jsx("span",{children:a(n[3])})]},`bullet_${r++}`));continue}const c=t.match(/^(\s*)(\d+)\.\s+(.*)/);if(c){i.push(e.jsxs("div",{className:"flex items-start space-x-2 my-1 pl-2 text-xs text-slate-300",children:[e.jsxs("span",{className:"text-amber-400 font-semibold text-[11px]",children:[c[2],"."]}),e.jsx("span",{children:a(c[3])})]},`num_${r++}`));continue}if(!t.trim()){i.push(e.jsx("div",{className:"h-2"},`blank_${r++}`));continue}i.push(e.jsx("p",{className:"my-1.5 text-xs md:text-sm text-slate-300 leading-relaxed",children:a(t)},`p_${r++}`))}return f(),e.jsx("div",{className:`space-y-1 ${w}`,children:i})}const v={label:"🚀 Release Changelog",content:`# 🚀 Release Notes & Changelog (vX.Y.Z)

## 📱 App Store & Play Store Release Copy
What's New in this Version:
- ✨ Major feature: [Describe key new feature]
- ⚡ Performance optimizations and faster load times
- 🐛 Resolved minor UI layout and text clipping bugs

## 📋 Pre-Submission QA Checklist
- [ ] Unit tests & static analysis pass cleanly
- [ ] App build compiled for production release
- [ ] Localized store screenshots & previews updated
- [ ] Verified in-app review prompts and deep links
`},j={label:"🎯 ASO Experiment",content:`# 🎯 ASO Experiment Hypothesis

## 🔬 Hypothesis Statement
Changing the primary title and screenshot slide 1 headline to focus on "Privacy & Speed" will increase Store Listing Conversion Rate (CVR) by +8%.

## 📊 Baseline & Target Metrics
- **Current Baseline CVR**: 14.2%
- **Target Experiment CVR**: 16.5%
- **Test Duration**: 14 Days
- **Traffic Split**: 50/50 Control vs Variant

## 🧪 Variants to Test
- [ ] **Control**: Original screenshots with dark theme
- [ ] **Variant A**: High-contrast blue gradient with 3-word bold headlines
- [ ] **Variant B**: Feature callouts with star rating social proof
`},N={label:"🐛 Bug & Crash Triage",content:`# 🐛 Bug & Crash Triage Report

## 🚨 Issue Overview
- **Impact**: High / Moderate / Low
- **Affected OS & Devices**: iOS 17.5+ / Android 14
- **App Version**: v2.3.1

## 🔄 Steps to Reproduce
1. Launch app on target device
2. Tap on settings menu
3. Select date range filter -> observe crash or blank screen

## 🛠️ Fix & Verification Notes
- [ ] Reproduce issue in local environment
- [ ] Apply fix in pull request
- [ ] Verify fix with regression test suite
`},k={label:"💡 Feature Pitch",content:`# 💡 Feature Pitch & User Feedback

## 🎯 Target Problem
Users struggle to track retention cohorts over custom date ranges.

## 🚀 Proposed Solution
Add custom date range selector with preset shortcuts (7d, 14d, 30d, 90d).

## 📊 Success Metrics
- **Activation Rate**: +12% increase in weekly active users
- **User Engagement**: +5% higher daily session duration
`},_={label:"📊 Telemetry & Performance",content:`# 📊 Performance & Telemetry Brief

## 📱 App Overview & Release Info
- **Target App**: [App Name]
- **Target Platform**: iOS / Android
- **App Version**: [Target Version]

## 📈 Summarized Telemetry Metrics
- **Total Installs**: [Installs]
- **Total Uninstalls**: [Uninstalls]
- **Net Growth**: [Net Growth]
- **Active Devices**: [Active Devices]

## 🔬 Key Telemetry Observations & Action Items
- [ ] Monitor post-update uninstall ratio vs previous version
- [ ] Evaluate acquisition channels for high-converting keywords
- [ ] Track D1/D7 user retention cohorts
`},S={label:"📝 New Scratchpad",content:`# Brainstorming

- `},T={label:"🎯 ASO Audit Template",content:`# ASO Audit & Strategy: New Record

## 🎯 1. Title & Subtitle Keywords Optimization

- [ ] **Title Keyword Placement**
- [ ] **Subtitle / Short Description**
`},R={release:v,aso:j,bug:N,feature:k,telemetry:_,system_new_note:S,system_aso_audit:T};export{C as M,R as N};
