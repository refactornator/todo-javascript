import { uuidv4 } from '../lib/uuid.js';
import { normalizeTitle, normalizeDescription, normalizePriority, normalizeStatus, normalizeDueDate, normalizeTags, computeCompletedAt } from '../lib/validation.js';

const KEY='todos:v1';

function nowISO(){ return new Date().toISOString(); }

function isIDBAvailable(){ try{ return 'indexedDB' in window; }catch{ return false; } }

// LocalStorage fallback implementation
const localImpl={
  async _read(){ const raw=localStorage.getItem(KEY); return raw?JSON.parse(raw):[]; },
  async _write(list){ localStorage.setItem(KEY,JSON.stringify(list)); },
  async list(){ const items=await this._read(); return { items, total: items.length }; },
  async get(id){ return (await this._read()).find(t=>t.id===id)||null; },
  async create(input){ const list=await this._read(); const now=nowISO(); const id=uuidv4(); const status=normalizeStatus(input.status); const completedAt = computeCompletedAt('todo', status) ?? null; const todo={
      id,
      title: normalizeTitle(input.title),
      description: normalizeDescription(input.description),
      status,
      priority: normalizePriority(input.priority),
      dueDate: normalizeDueDate(input.dueDate),
      tags: normalizeTags(input.tags||[]),
      createdAt: now, updatedAt: now, completedAt
    };
    list.push(todo); await this._write(list); return todo; },
  async update(id,patch){ const list=await this._read(); const idx=list.findIndex(t=>t.id===id); if(idx<0) throw {code:'NOT_FOUND',message:'Todo not found'}; const prev=list[idx]; const nextStatus=patch.status?normalizeStatus(patch.status):prev.status; const completedAt = computeCompletedAt(prev.status, nextStatus);
    const next={...prev,
      title: patch.title!==undefined?normalizeTitle(patch.title):prev.title,
      description: patch.description!==undefined?normalizeDescription(patch.description):prev.description,
      status: nextStatus,
      priority: patch.priority!==undefined?normalizePriority(patch.priority):prev.priority,
      dueDate: patch.dueDate!==undefined?normalizeDueDate(patch.dueDate):prev.dueDate,
      tags: patch.tags!==undefined?normalizeTags(patch.tags):prev.tags,
      updatedAt: nowISO()
    };
    if(completedAt!==undefined) next.completedAt=completedAt;
    list[idx]=next; await this._write(list); return next; },
  async delete(id){ const list=await this._read(); const idx=list.findIndex(t=>t.id===id); if(idx<0) return; list.splice(idx,1); await this._write(list); },
  async bulkAction({action,ids}){ const list=await this._read(); let count=0; if(action==='delete'){ const before=list.length; const remaining=list.filter(t=>!ids.includes(t.id)); count=before-remaining.length; await this._write(remaining); } else if(action==='complete'){ for(let i=0;i<list.length;i++){ const t=list[i]; if(ids.includes(t.id) && t.status!=='done'){ list[i]={...t,status:'done',completedAt: nowISO(), updatedAt: nowISO()}; count++; } } await this._write(list);} return {updated: count}; },
  async exportJson(){ const items=await this._read(); return JSON.stringify({version:1,exportedAt: nowISO(), todos: items},null,2); },
  async importJson(json){ const data=JSON.parse(json); if(!data||!Array.isArray(data.todos)) throw {code:'BAD_JSON',message:'Invalid export file'}; const items=await this._read(); let imported=0; for(const t of data.todos){ if(!t.id) t.id=uuidv4(); items.push(t); imported++; } await this._write(items); return { imported }; }
};

// Minimal IndexedDB implementation
function openDB(){ return new Promise((resolve,reject)=>{
  const req=indexedDB.open('todo-mvp',1);
  req.onupgradeneeded=()=>{ const db=req.result; const store=db.createObjectStore('todos',{keyPath:'id'}); store.createIndex('status','status'); store.createIndex('priority','priority'); store.createIndex('dueDate','dueDate'); };
  req.onerror=()=>reject(req.error); req.onsuccess=()=>resolve(req.result);
}); }

const idbImpl={
  async _db(){ if(!this.__db) this.__db=await openDB(); return this.__db; },
  async _tx(mode){ const db=await this._db(); return db.transaction('todos',mode).objectStore('todos'); },
  async list(){ const store=await this._tx('readonly'); return new Promise((resolve,reject)=>{ const items=[]; const req=store.openCursor(); req.onsuccess=e=>{ const c=e.target.result; if(c){ items.push(c.value); c.continue(); } else resolve({items,total:items.length}); }; req.onerror=()=>reject(req.error); }); },
  async get(id){ const store=await this._tx('readonly'); return new Promise((resolve,reject)=>{ const req=store.get(id); req.onsuccess=()=>resolve(req.result||null); req.onerror=()=>reject(req.error); }); },
  async create(input){ const store=await this._tx('readwrite'); const now=nowISO(); const id=uuidv4(); const status=normalizeStatus(input.status); const completedAt = computeCompletedAt('todo', status) ?? null; const todo={ id,
    title: normalizeTitle(input.title), description: normalizeDescription(input.description), status,
    priority: normalizePriority(input.priority), dueDate: normalizeDueDate(input.dueDate), tags: normalizeTags(input.tags||[]),
    createdAt: now, updatedAt: now, completedAt };
    return new Promise((resolve,reject)=>{ const req=store.add(todo); req.onsuccess=()=>resolve(todo); req.onerror=()=>reject(req.error); }); },
  async update(id,patch){ const store=await this._tx('readwrite'); const prev=await this.get(id); if(!prev) throw {code:'NOT_FOUND',message:'Todo not found'}; const nextStatus=patch.status?normalizeStatus(patch.status):prev.status; const completedAt = computeCompletedAt(prev.status, nextStatus);
    const next={...prev,
      title: patch.title!==undefined?normalizeTitle(patch.title):prev.title,
      description: patch.description!==undefined?normalizeDescription(patch.description):prev.description,
      status: nextStatus,
      priority: patch.priority!==undefined?normalizePriority(patch.priority):prev.priority,
      dueDate: patch.dueDate!==undefined?normalizeDueDate(patch.dueDate):prev.dueDate,
      tags: patch.tags!==undefined?normalizeTags(patch.tags):prev.tags,
      updatedAt: nowISO()
    };
    if(completedAt!==undefined) next.completedAt=completedAt;
    return new Promise((resolve,reject)=>{ const req=store.put(next); req.onsuccess=()=>resolve(next); req.onerror=()=>reject(req.error); }); },
  async delete(id){ const store=await this._tx('readwrite'); return new Promise((resolve,reject)=>{ const req=store.delete(id); req.onsuccess=()=>resolve(); req.onerror=()=>reject(req.error); }); },
  async bulkAction({action,ids}){ let updated=0; if(action==='delete'){ const store=await this._tx('readwrite'); await Promise.all(ids.map(id=>new Promise((res,rej)=>{ const req=store.delete(id); req.onsuccess=()=>{updated++;res();}; req.onerror=()=>rej(req.error);}))); }
    else if(action==='complete'){ for(const id of ids){ try{ const t=await this.get(id); if(t && t.status!=='done'){ await this.update(id,{status:'done'}); updated++; } }catch{} } }
    return { updated }; },
  async exportJson(){ const {items}=await this.list(); return JSON.stringify({version:1,exportedAt: nowISO(), todos: items},null,2); },
  async importJson(json){ const data=JSON.parse(json); if(!data||!Array.isArray(data.todos)) throw {code:'BAD_JSON',message:'Invalid export file'}; let imported=0; for(const t of data.todos){ if(!t.id) t.id=uuidv4(); await this.create(t); imported++; } return { imported }; }
};

export function createRepo(){ return isIDBAvailable()?idbImpl:localImpl; }

