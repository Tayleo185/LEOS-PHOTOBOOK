export const labels={load:'Load',fuel:'Fuel',expense:'Expense',fee:'Weekly fee',settlement:'Settlement',draw:'Owner draw',taxPayment:'Tax payment',truck:'Truck',maintenance:'Maintenance',inspection:'Inspection',reminder:'Reminder'};
export const financeKinds=['load','fuel','expense','fee','settlement','draw','taxPayment'];
export const opKinds=['maintenance','inspection','reminder'];
export const num=v=>Number.isFinite(Number(v))?Number(v):0;
export const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(num(v));
export function summarize(items,settings={},month=''){
 const rows=items.filter(i=>!i.archived_at&&(!month||String(i.payload.date||i.created_at).startsWith(month)));
 const loads=rows.filter(i=>i.kind==='load'),earned=loads.filter(i=>['completed','paid'].includes(i.payload.status));
 const pay=i=>i.payload.payMode==='cpm'?num(i.payload.miles)*num(i.payload.payPerMile):num(i.payload.amount)*(num(i.payload.payMode==='gross'?100:i.payload.loadShare??settings.loadShare??100)/100);
 const revenue=earned.reduce((s,i)=>s+pay(i),0);
 const expenses=rows.filter(i=>['fuel','expense','fee'].includes(i.kind)&&i.payload.paidBy!=='other').reduce((s,i)=>s+num(i.payload.amount),0);
 const credits=rows.filter(i=>i.kind==='fuel').reduce((s,i)=>s+num(i.payload.credit),0);
 const profit=revenue+credits-expenses;
 const miles=earned.reduce((s,i)=>s+num(i.payload.miles),0);
 return {revenue,expenses,credits,profit,miles,unpaid:earned.filter(i=>i.payload.status!=='paid').reduce((s,i)=>s+pay(i),0),scheduled:loads.filter(i=>!['completed','paid'].includes(i.payload.status)).reduce((s,i)=>s+pay(i),0),taxReserve:Math.max(0,profit)*num(settings.taxReserve??25)/100,draws:rows.filter(i=>i.kind==='draw').reduce((s,i)=>s+num(i.payload.amount),0),costPerMile:miles?expenses/miles:0,loads:loads.length};
}
export function csv(rows){return rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
