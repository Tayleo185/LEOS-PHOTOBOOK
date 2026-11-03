export const labels={load:'Load',fuel:'Fuel',expense:'Expense',fee:'Weekly fee',settlement:'Settlement',draw:'Owner draw',taxPayment:'Tax payment',truck:'Truck',maintenance:'Maintenance',inspection:'Inspection',reminder:'Reminder',income:'Income received',invoice:'Customer invoice',bill:'Business bill',contribution:'Owner contribution',taxDeadline:'Tax deadline'};
export const financeKinds=['load','fuel','expense','fee','settlement','draw','taxPayment','income','invoice','bill','contribution'];
export const opKinds=['maintenance','inspection','reminder','taxDeadline'];
export const num=v=>Number.isFinite(Number(v))?Number(v):0;
export const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(num(v));
export function summarize(items,settings={},month=''){
 const rows=items.filter(i=>!i.archived_at&&(!month||String(i.payload.date||i.created_at).startsWith(month)));
 const loads=rows.filter(i=>i.kind==='load'),earned=loads.filter(i=>['completed','paid'].includes(i.payload.status));
 const pay=i=>i.payload.payMode==='cpm'?num(i.payload.miles)*num(i.payload.payPerMile):num(i.payload.amount)*(num(i.payload.payMode==='gross'?100:i.payload.loadShare??settings.loadShare??100)/100);
 const received=rows.filter(i=>i.kind==='income'&&i.payload.status==='paid').reduce((s,i)=>s+num(i.payload.amount),0);
 const revenue=earned.reduce((s,i)=>s+pay(i),0)+received;
 const expenses=rows.filter(i=>['fuel','expense','fee'].includes(i.kind)&&i.payload.paidBy!=='other').reduce((s,i)=>s+num(i.payload.amount),0);
 const credits=rows.filter(i=>i.kind==='fuel').reduce((s,i)=>s+num(i.payload.credit),0);
 const profit=revenue+credits-expenses;
 const miles=earned.reduce((s,i)=>s+num(i.payload.miles),0);
 const invoicesDue=items.filter(i=>!i.archived_at&&i.kind==='invoice'&&i.payload.status!=='paid').reduce((s,i)=>s+num(i.payload.amount),0);
 const billsDue=items.filter(i=>!i.archived_at&&i.kind==='bill'&&i.payload.status!=='paid').reduce((s,i)=>s+num(i.payload.amount),0);
 const contributions=rows.filter(i=>i.kind==='contribution').reduce((s,i)=>s+num(i.payload.amount),0);
 const draws=rows.filter(i=>i.kind==='draw').reduce((s,i)=>s+num(i.payload.amount),0);
 const taxPaid=rows.filter(i=>i.kind==='taxPayment').reduce((s,i)=>s+num(i.payload.amount),0);
 const cashMovement=items.filter(i=>!i.archived_at&&i.kind==='load'&&i.payload.status==='paid'&&(!month||String(i.payload.paymentDate||i.payload.date||i.created_at).startsWith(month))).reduce((s,i)=>s+pay(i),0)+received+credits+contributions-expenses-draws-taxPaid;
 return {revenue,received,expenses,credits,profit,miles,invoicesDue,billsDue,contributions,taxPaid,cashMovement,unpaid:earned.filter(i=>i.payload.status!=='paid').reduce((s,i)=>s+pay(i),0),scheduled:loads.filter(i=>!['completed','paid'].includes(i.payload.status)).reduce((s,i)=>s+pay(i),0),taxReserve:Math.max(0,profit)*num(settings.taxReserve??25)/100,draws,costPerMile:miles?expenses/miles:0,loads:loads.length};
}
export function taxSummary(items,files,year,settings={}){
 const active=items.filter(i=>!i.archived_at),dated=active.filter(i=>String(i.payload.date||i.created_at).startsWith(String(year)));
 const expenses=dated.filter(i=>['expense','fuel','fee'].includes(i.kind)&&i.payload.paidBy!=='other');
 const payments=active.filter(i=>i.kind==='taxPayment'&&String(i.payload.taxYear||String(i.payload.date||i.created_at).slice(0,4))===String(year));
 const deadlines=active.filter(i=>i.kind==='taxDeadline'&&String(i.payload.taxYear||String(i.payload.dueDate||i.payload.date||'').slice(0,4))===String(year));
 const total=rows=>rows.reduce((sum,i)=>sum+num(i.payload.amount),0);
 const s=summarize(dated,settings);
 return {payments,deadlines,expenses,paid:total(payments),reserve:s.taxReserve,reviewed:total(expenses.filter(i=>i.payload.taxReview==='reviewed')),needsReview:expenses.filter(i=>!i.payload.taxReview||i.payload.taxReview==='needs_review'),missingDocuments:expenses.filter(i=>!files.some(f=>f.item_id===i.id)),byType:Object.fromEntries(['income_estimate','income_return','sales','payroll','property','other'].map(t=>[t,total(payments.filter(i=>(i.payload.taxType||'other')===t))]))};
}
export function csv(rows){return rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
