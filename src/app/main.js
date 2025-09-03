import { createEventBus } from '../lib/events.js';
import { uuidv4 } from '../lib/uuid.js';
import { sanitizeText, isOverdue } from '../lib/validation.js';
import { createRepo } from '../storage/repo.js';

const bus=createEventBus();
const repo=createRepo();
let state={ items:[], selected:new Set(), filters:{ status:'all', q:'', sort:'-createdAt' } };

const els={
  list: document.getElementById('todo-list'),
  empty: document.getElementById('empty-state'),
  addBtn: document.getElementById('add-btn'),
  sort: document.getElementById('sort'),
  bulkComplete: document.getElementById('bulk-complete'),
  bulkDelete: document.getElementById('bulk-delete'),
  exportBtn: document.getElementById('export-json'),
  importBtn: document.getElementById('import-json'),
  importFile: document.getElementById('import-file'),
  search: document.getElementById('search'),
  tabs: document.querySelectorAll('.filters [role=tab]'),
  modal: document.getElementById('todo-modal'),
  form: document.getElementById('todo-form'),
  cancel: document.getElementById('cancel-btn'),
  toast: document.getElementById('toast'),
  count: document.getElementById('count'),
  themeToggle: document.getElementById('theme-toggle'),
};

function setTheme(mode){ const doc=document.documentElement; const m=mode||localStorage.getItem('theme')|| (window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'); doc.setAttribute('data-theme',m); localStorage.setItem('theme',m); }
setTheme();
els.themeToggle.addEventListener('click',()=>{ const m=document.documentElement.getAttribute('data-theme')==='light'?'dark':'light'; setTheme(m); });

function showToast(text,action){ els.toast.textContent=text; els.toast.hidden=false; clearTimeout(showToast._t); const btn=action?` <button id="toast-undo">${action.label}</button>`:''; els.toast.innerHTML=sanitizeText(text)+btn; if(action){ document.getElementById('toast-undo').onclick=action.onClick; } showToast._t=setTimeout(()=>els.toast.innerHTML='',6000); }

function openModal(todo){ els.modal.hidden=false; els.form.dataset.id=todo?.id||''; els.form.title.value=todo?.title||''; els.form.description.value=todo?.description||''; els.form.status.value=todo?.status||'todo'; els.form.priority.value=todo?.priority||'medium'; els.form.dueDate.value=todo?.dueDate||''; els.form.tags.value=(todo?.tags||[]).join(', '); els.form.title.focus(); }
function closeModal(){ els.modal.hidden=true; els.form.reset(); els.form.dataset.id=''; document.getElementById('form-error').textContent=''; }
els.cancel.addEventListener('click',closeModal);

async function refresh(){ const {items}=await repo.list(); state.items=items; render(); }

function applyFilters(items){ const {status,q}=state.filters; let out=[...items]; if(status!=='all') out=out.filter(t=>t.status===status); if(q){ const s=q.toLowerCase(); out=out.filter(t=> (t.title+ ' '+(t.description||'')).toLowerCase().includes(s)); }
  // sort
  const key=state.filters.sort.replace('-',''); const dir=state.filters.sort.startsWith('-')?-1:1; out.sort((a,b)=>{ let va=a[key]??'', vb=b[key]??''; if(key==='priority'){ const order={high:3,medium:2,low:1}; va=order[va]||0; vb=order[vb]||0; } return (va>vb?1:va<vb?-1:0)*dir; });
  return out;
}

function render(){ const items=applyFilters(state.items); els.count.textContent=`${items.length} items`; els.empty.style.display=items.length? 'none':'block'; els.list.innerHTML='';
  // enable/disable bulk actions
  const selCount=[...state.selected].filter(id=>items.some(t=>t.id===id)).length; els.bulkComplete.disabled=selCount===0; els.bulkDelete.disabled=selCount===0;
  for(const t of items){ const li=document.createElement('li'); li.className='todo-item'; li.innerHTML=`
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" aria-label="Select" data-id="${t.id}" class="select-box" ${state.selected.has(t.id)?'checked':''} />
        <input type="checkbox" ${t.status==='done'?'checked':''} aria-label="Mark done" data-id="${t.id}" class="done-box" />
        <span>${t.title?sanitizeText(t.title):''}</span>
        <span class="badge ${t.priority}"><span class="priority-dot ${t.priority}"></span>${t.priority}</span>
        ${t.dueDate?`<span class="${isOverdue(t)?'overdue':''}">Due ${t.dueDate}</span>`:''}
        ${t.tags?.length? `<span class="muted">${t.tags.map(sanitizeText).join(', ')}</span>`:''}
      </div>
      <div style="display:flex;gap:6px;">
        <button data-id="${t.id}" class="edit">Edit</button>
        <button data-id="${t.id}" class="del">Delete</button>
      </div>`;
    els.list.appendChild(li);
  }
}

// Bulk selection toggle
els.list.addEventListener('change',(e)=>{
  if(e.target.classList.contains('select-box')){
    const id=e.target.dataset.id; if(e.target.checked) state.selected.add(id); else state.selected.delete(id); render();
  }
});

// Bulk actions
els.bulkComplete.addEventListener('click', async ()=>{ const ids=[...state.selected]; if(!ids.length) return; await repo.bulkAction({action:'complete',ids}); state.selected.clear(); await refresh(); showToast('Completed selected'); });
els.bulkDelete.addEventListener('click', async ()=>{ const ids=[...state.selected]; if(!ids.length) return; const snapshot=await Promise.all(ids.map(id=>repo.get(id))); await repo.bulkAction({action:'delete',ids}); state.selected.clear(); await refresh(); showToast('Deleted selected',{label:'Undo', onClick: async ()=>{ for(const t of snapshot) if(t) await repo.create(t); await refresh(); }}); });

// Import/Export
els.exportBtn.addEventListener('click', async ()=>{ const json=await repo.exportJson(); const blob=new Blob([json],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='todos-export.json'; a.click(); URL.revokeObjectURL(a.href); });
els.importBtn.addEventListener('click', ()=> els.importFile.click());
els.importFile.addEventListener('change', async ()=>{ const f=els.importFile.files[0]; if(!f) return; const text=await f.text(); try{ const {imported}=await repo.importJson(text); await refresh(); showToast(`Imported ${imported} items`); }catch(err){ showToast(err?.message||'Import failed'); } finally { els.importFile.value=''; }
});

// Events
els.addBtn.addEventListener('click',()=>openModal());
els.search.addEventListener('input',e=>{ state.filters.q=e.target.value; render(); });
els.sort.addEventListener('change',e=>{ state.filters.sort=e.target.value; render(); });
els.tabs.forEach(tab=>tab.addEventListener('click',()=>{ els.tabs.forEach(t=>t.setAttribute('aria-selected','false')); tab.setAttribute('aria-selected','true'); state.filters.status=tab.dataset.status; render(); }));

document.addEventListener('keydown',e=>{ if(e.key==='/'&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='TEXTAREA'){ e.preventDefault(); els.search.focus(); } if(e.key.toLowerCase()==='n' && !els.modal.hidden){ /* ignore while modal open */ } else if(e.key.toLowerCase()==='n'){ openModal(); } if(e.key==='Escape' && !els.modal.hidden){ closeModal(); } });

els.list.addEventListener('click',async (e)=>{
  const id=e.target?.dataset?.id; if(!id) return;
  if(e.target.classList.contains('edit')){ const t=await repo.get(id); openModal(t); }
  if(e.target.classList.contains('del')){ const t=await repo.get(id); await repo.delete(id); await refresh(); showToast('Todo deleted',{label:'Undo', onClick: async ()=>{ await repo.create({...t,id:uuidv4(),createdAt:t.createdAt,updatedAt:t.updatedAt}); await refresh(); }}); }
});

els.list.addEventListener('change',async (e)=>{
  if(e.target.classList.contains('done-box')){ const id=e.target.dataset.id; const t=await repo.get(id); const prev=t.status; await repo.update(id,{status:e.target.checked?'done':'todo'}); await refresh(); showToast('Status changed',{label:'Undo', onClick: async ()=>{ await repo.update(id,{status:prev}); await refresh(); }}); }
});

els.form.addEventListener('submit',async (e)=>{
  e.preventDefault(); const fd=new FormData(els.form); const input={ title: fd.get('title'), description: fd.get('description'), status: fd.get('status'), priority: fd.get('priority'), dueDate: fd.get('dueDate'), tags: (fd.get('tags')||'').toString().split(',') };
  try{
    if(els.form.dataset.id){ await repo.update(els.form.dataset.id,input); } else { await repo.create(input); }
    closeModal(); await refresh(); showToast('Saved');
  }catch(err){ document.getElementById('form-error').textContent=err?.message||'Error'; }
});

window.addEventListener('storage',refresh);

refresh();

