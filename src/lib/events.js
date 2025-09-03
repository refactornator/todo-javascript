export function createEventBus(){
  const listeners=new Map();
  return {
    on(type,cb){ if(!listeners.has(type)) listeners.set(type,new Set()); listeners.get(type).add(cb); return ()=>listeners.get(type)?.delete(cb); },
    emit(type,payload){ listeners.get(type)?.forEach(cb=>{ try{ cb(payload);}catch(e){ console.error('event handler error',e);} }); },
    clear(){ listeners.clear(); }
  };
}

