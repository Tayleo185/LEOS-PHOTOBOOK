import {normalizeUpload} from './uploads82.mjs';
import {receiptDetails,reconcileReceipts} from './receipt-reader82.mjs';
const norm=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function analyzeDocument(text,items=[]){
 text=String(text||'');const receipt=receiptDetails(text);
 const type=/\b(rate confirmation|dispatch confirmation)\b/i.test(text)?'rate confirmation':/\b(settlement|remittance advice|net pay)\b/i.test(text)?'settlement':/\b(bill of lading|proof of delivery|delivery receipt)\b/i.test(text)?'delivery paperwork':receipt.isReceipt?'receipt':/\binvoice\b/i.test(text)?'invoice':/\b(receipt|total paid|payment approved)\b/i.test(text)?'receipt':'unrecognized document';
 const refs=[...new Set([...text.matchAll(/\b(?:invoice|load|dispatch|trip|reference)\s*(?:number|no\.?|#|:)\s*[:#-]?\s*([A-Z0-9-]{3,24})\b/gi)].map(m=>norm(m[1])))];
 const candidates=items.filter(i=>!i.archived_at&&refs.some(ref=>[i.payload.loadNo,i.payload.reference,i.payload.paymentRef].some(v=>v&&norm(v)===ref)));
 const totalMatches=[...text.matchAll(/(?:grand total|total paid|amount due|total)\s*[:$]*\s*([0-9][0-9,]*\.\d{2})\b/gi)];
 const amounts=type==='receipt'?(receipt.amount!=null?[receipt.amount]:[]):[...new Set(totalMatches.map(m=>Number(m[1].replaceAll(',',''))))];
 const dates=type==='receipt'?(receipt.date?[receipt.date]:[]):[...new Set([...text.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)].map(m=>m[0]))];
 // Vendor + amount + date is a suggestion only, never permission to change financial data.
 if(!candidates.length&&type==='receipt'&&amounts.length===1&&dates.length===1){
  for(const i of items.filter(i=>!i.archived_at&&['expense','fuel','fee'].includes(i.kind))){const vendor=String(i.payload.vendor||'').trim();if(vendor.length>=4&&(text.toUpperCase().includes(vendor.toUpperCase())||receipt.vendor&&norm(vendor)===norm(receipt.vendor))&&Number(i.payload.amount)===amounts[0]&&i.payload.date===dates[0])candidates.push(i);}
 }
 return {type,receipt,refs,amount:amounts.length===1?amounts[0]:null,date:dates.length===1?dates[0]:null,candidates,missing:[...(!refs.length&&type!=='receipt'?['document reference']:[]),...(amounts.length!==1?['one clear total']:[]),...(dates.length!==1?['purchase date']:[])],ambiguous:candidates.length>1||refs.length>1};
}
export function receiptWorkflow({receipt,duplicate,items}){
 const linked=duplicate?.item_id?items.find(i=>i.id===duplicate.item_id&&!i.archived_at):null;
 const financial=linked&&['fuel','expense','fee'].includes(linked.kind);
 const same=financial&&receipt.amount!=null&&receipt.date&&Math.round(Number(linked.payload.amount)*100)===Math.round(receipt.amount*100)&&linked.payload.date===receipt.date&&((receipt.kind==='fuel')===(linked.kind==='fuel'));
 return {linked,alreadyRecorded:!!same,linkedMismatch:!!financial&&!same,canCreate:!same};
}
export function smartUploadPanel(){return `<section class="card smart-upload" style="margin-bottom:24px"><span class="eyebrow">LESS TYPING. MORE CLARITY.</span><h2>Read and match a document</h2><p>Scan an invoice, receipt, settlement or delivery photo. Leo suggests an existing record and checks for an identical saved image. You review the match before attaching; receipt totals can prepare a fuel or expense draft for your review. No payment is confirmed by a photo.</p><label class="field">Choose a document photo<input id="smart-document" type="file" accept="image/jpeg,image/png,image/webp"></label><div id="smart-result" role="status" aria-live="polite"></div><p class="section-note">Large photos are optimized before upload. PDF storage is available through Upload document; PDF reading is not enabled. OCR suggestions can be wrong.</p></section>`;}
export function mountSmartUpload({root,active,getState,read,request,refresh,review,delivery,canWrite,createReceipt}){
 const input=root.querySelector('#smart-document'),result=root.querySelector('#smart-result');if(!input)return;
 const say=t=>{if(active())result.textContent=t;};
 const process=async(incoming,sourceFileId)=>{let file=incoming;if(!file)return;input.disabled=true;
 try{
  say('Preparing your photo…');file=await normalizeUpload(file,{imagesOnly:true});if(!active())return;
  const snapshot=getState();if(snapshot.total>snapshot.items.length)throw Error('Load all records before matching documents.');
  say('Reading your document…');const data=await read(file);if(!active())return;
  let analysis=analyzeDocument(data.text,snapshot.items.filter(i=>canWrite(i.kind)));
  if(analysis.type==='receipt'&&data.alternatives?.length){
   const receipt=reconcileReceipts([analysis.receipt,...data.alternatives.map(receiptDetails)]);
   analysis={...analysis,receipt,amount:receipt.amount,date:receipt.date};
   // Reconcile before proposing an existing record; disagreeing totals or dates require manual review.
   analysis.candidates=receipt.amount!=null&&receipt.date&&receipt.vendor?snapshot.items.filter(i=>!i.archived_at&&canWrite(i.kind)&&['fuel','expense','fee'].includes(i.kind)&&norm(i.payload.vendor)===norm(receipt.vendor)&&Number(i.payload.amount)===receipt.amount&&i.payload.date===receipt.date):[];
   analysis.missing=[...(receipt.amount==null?['receipt total']:[]),...(!receipt.date?['purchase date']:[])];
  }
  say(analysis.type==='receipt'?'Receipt read. Review the details before saving to bookkeeping. '+(analysis.missing.length?'Please confirm: '+analysis.missing.join(', ')+'.':''):'Detected '+analysis.type+'. '+(analysis.ambiguous?'Multiple references or matches: review carefully. ':analysis.candidates.length?'Suggested matching record below. ':'No saved record matched. Create or find the record, then attach this document. '));
  if(analysis.type==='receipt'){const r=analysis.receipt,p=document.createElement('p');p.textContent=[r.vendor||'Merchant needs review',r.date||'Date needs review',r.amount!=null?'Total $'+r.amount.toFixed(2):'Total needs review',r.gallons?r.gallons+' gallons':'',r.unitPrice?'$'+r.unitPrice+' / gallon':''].filter(Boolean).join(' · ');result.append(p);if(r.warnings.length){const w=document.createElement('p');w.textContent=r.warnings.join('. ')+'.';result.append(w);}}
  const bytes=await file.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(!active())return;
  const name='DOC-'+hash+'.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg');
  const duplicate=snapshot.files.find(f=>f.id===sourceFileId||f.name.includes(hash));
  const workflow=receiptWorkflow({receipt:analysis.receipt,duplicate,items:snapshot.items});
  if(duplicate){const note=document.createElement('p');note.textContent=workflow.alreadyRecorded?'This receipt is already recorded. Review the existing expense below.':workflow.linkedMismatch?'This photo is linked to an expense, but its details differ from the extracted receipt or need review. The existing entry has not been changed. Check it before creating a new expense.':'The photo is saved privately. It has not yet been entered as this receipt’s expense.';result.append(note);
   if(workflow.linked){const b=document.createElement('button');b.type='button';b.className='btn secondary';b.textContent='Review existing record';b.onclick=()=>{if(active())review(workflow.linked.id);};result.append(b);}
  }
  if(analysis.type==='receipt'&&!analysis.candidates.length&&workflow.canCreate&&createReceipt){const b=document.createElement('button');b.type='button';b.className='btn primary';b.textContent='Review '+(analysis.receipt.kind==='fuel'?'fuel':'expense')+' draft';b.onclick=()=>{if(active())createReceipt(analysis.receipt,new File([file],name,{type:file.type}));};result.append(b);}
  for(const item of analysis.candidates){
   const p=document.createElement('p');p.textContent=item.payload.description+' · '+(item.payload.loadNo||item.payload.reference||item.payload.date||'');result.append(p);
   const view=document.createElement('button');view.type='button';view.className='btn secondary';view.textContent='Review record';view.onclick=()=>{if(active())review(item.id);};result.append(view);
   const attach=document.createElement('button');attach.type='button';attach.className='btn primary';attach.textContent='Confirm match & attach photo';attach.onclick=async()=>{if(!active())return;attach.disabled=true;try{if(snapshot.files.some(f=>f.item_id===item.id&&f.name.includes(hash))){say('This identical photo is already attached to this record.');return;}const form=new FormData();form.set('file',new File([file],name,{type:file.type}));form.set('itemId',item.id);await request('upload_file',form);if(active()){await refresh();}}catch(e){say('Attachment failed: '+e.message);}finally{if(active())attach.disabled=false;}};result.append(' ',attach);
  }
  if(analysis.type==='receipt'&&!analysis.candidates.length&&workflow.canCreate&&!workflow.linkedMismatch&&createReceipt){createReceipt(analysis.receipt,new File([file],name,{type:file.type}));}
  if(analysis.type==='delivery paperwork'&&delivery){const b=document.createElement('button');b.type='button';b.className='btn secondary';b.textContent='Check delivery completion';b.onclick=()=>{if(active())delivery(file);};result.append(document.createElement('br'),b);}
 }catch(e){say('Document was not changed. '+e.message);}finally{if(active()){input.disabled=false;input.value='';}}
 };
 input.onchange=()=>process(input.files?.[0]);return process;
}
