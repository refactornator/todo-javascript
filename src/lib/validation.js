const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
export function normalizeTitle(s){ s=(s??'').trim().replace(/\s+/g,' '); if(!s) throw {code:'TITLE_REQUIRED',message:'Title is required'}; if(s.length>200) throw {code:'TITLE_TOO_LONG',message:'Title too long'}; return s; }
export function normalizeDescription(s){ if(s==null) return null; s=String(s).trim(); if(!s) return null; if(s.length>2000) throw {code:'DESC_TOO_LONG',message:'Description too long'}; return s; }
export function normalizeTags(sOrArr){ let arr=Array.isArray(sOrArr)?sOrArr:String(sOrArr||'').split(','); arr=arr.map(t=>String(t).trim().toLowerCase()).filter(Boolean); arr=[...new Set(arr)]; if(arr.length>10) arr=arr.slice(0,10); for(const t of arr){ if(t.length<1||t.length>30) throw {code:'TAG_LEN',message:'Tag length 1-30'}; } return arr; }
export function normalizePriority(p){ const v=(p||'medium').toLowerCase(); if(!['low','medium','high'].includes(v)) return 'medium'; return v; }
export function normalizeStatus(s){ const v=(s||'todo'); if(!['todo','in_progress','done'].includes(v)) return 'todo'; return v; }
export function normalizeDueDate(s){ if(!s) return null; const v=String(s).trim(); if(!DATE_RE.test(v)) throw {code:'DATE_FMT',message:'Use YYYY-MM-DD'}; if(v<'1970-01-01') throw {code:'DATE_RANGE',message:'Date out of range'}; return v; }
export function computeCompletedAt(prevStatus,nextStatus){ if(prevStatus!=='done' && nextStatus==='done') return new Date().toISOString(); if(prevStatus==='done' && nextStatus!=='done') return null; return undefined; }
export function isOverdue(todo){ return !!(todo.dueDate && todo.status!=='done' && todo.dueDate < new Date().toISOString().slice(0,10)); }
export function sanitizeText(s){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }

