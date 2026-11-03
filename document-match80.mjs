const norm=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function analyzeDocument(text,items=[]){
 text=String(text||'');
 const type=/\b(rate confirmation|dispatch confirmation)\b/i.test(text)?'rate confirmation':/\b(settlement|remittance advice|net pay)\b/i.test(text)?'settlement':/\b(bill of lading|proof of delivery|delivery receipt)\b/i.test(text)?'delivery paperwork':/\binvoice\b/i.test(text)?'invoice':/\b(receipt|total paid|payment approved)\b/i.test(text)?'receipt':'unrecognized document';
 const refs=[...new Set([...text.matchAll(/\b(?:invoice|load|dispatch|trip|reference)\s*(?:number|no\.?|#|:)\s*[:#-]?\s*([A-Z0-9-]{3,24})\b/gi)].map(m=>norm(m[1])))];
 const candidates=items.filter(i=>!i.archived_at&&refs.some(ref=>[i.payload.loadNo,i.payload.reference,i.payload.paymentRef].some(v=>v&&norm(v)===ref)));
 const totalMatches=[...text.matchAll(/(?:grand total|total paid|amount due|total)\s*[:$]*\s*([0-9][0-9,]*\.\d{2})\b/gi)];
 const amounts=[...new Set(totalMatches.map(m=>Number(m[1].replaceAll(',',''))))];
 const dates=[...new Set([...text.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)].map(m=>m[0]))];
 // Vendor + amount + date is a suggestion only, never permission to change financial data.
 if(!candidates.length&&type==='receipt'&&amounts.length===1&&dates.length===1){
  for(const i of items.filter(i=>!i.archived_at&&['expense','fuel','fee'].includes(i.kind))){const vendor=String(i.payload.vendor||'').trim();if(vendor.length>=4&&text.toUpperCase().includes(vendor.toUpperCase())&&Number(i.payload.amount)===amounts[0]&&i.payload.date===dates[0])candidates.push(i);}
 }
 return {type,refs,amount:amounts.length===1?amounts[0]:null,date:dates.length===1?dates[0]:null,candidates,missing:[...(!refs.length?['document reference']:[]),...(amounts.length!==1?['one clear total']:[]),...(dates.length!==1?['date in YYYY-MM-DD format']:[])],ambiguous:candidates.length>1||refs.length>1};
}
export function smartUploadPanel(){return `<section class="card smart-upload" style="margin-bottom:24px"><span class="eyebrow">LESS TYPING. MORE CLARITY.</span><h2>Read and match a document</h2><p>Scan an invoice, receipt, settlement or delivery photo. Leo suggests an existing record and checks for an identical saved image. You review the match before attaching; no payment is confirmed by a photo.</p><label class="field">Choose a document photo<input id="smart-document" type="file" accept="image/jpeg,image/png,image/webp"></label><div id="smart-result" role="status" aria-live="polite"></div><p class="section-note">Images up to 10 MB. PDF storage is available through Upload document; PDF reading is not enabled. OCR suggestions can be wrong.</p></section>`;}
export function mountSmartUpload({root,active,getState,read,request,refresh,review,delivery,canWrite}){
 const input=root.querySelector('#smart-document'),result=root.querySelector('#smart-result');if(!input)return;
 const say=t=>{if(active())result.textContent=t;};
 input.onchange=async()=>{const file=input.files?.[0];if(!file)return;input.disabled=true;
 try{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>10485760)throw Error('Choose a JPG, PNG or WebP under 10 MB.');
  const snapshot=getState();if(snapshot.total>snapshot.items.length)throw Error('Load all records before matching documents.');
  say('Reading your document…');const data=await read(file);if(!active())return;
  const analysis=analyzeDocument(data.text,snapshot.items.filter(i=>canWrite(i.kind)));
  say('Detected '+analysis.type+'. '+(analysis.ambiguous?'Multiple references or matches: review carefully. ':analysis.candidates.length?'Suggested matching record below. ':'No saved record matched. Create or find the record, then attach this document. ')+(analysis.missing.length?'Needs review: '+analysis.missing.join(', ')+'. ':''));
  const bytes=await file.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(!active())return;
  const name='DOC-'+hash+'.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg');
  const duplicate=snapshot.files.find(f=>f.name.includes(hash));if(duplicate){const note=document.createElement('p');note.textContent='An identical photo is already saved'+(duplicate.item_id?' against a record.':'.');result.append(note);}
  for(const item of analysis.candidates){
   const p=document.createElement('p');p.textContent=item.payload.description+' · '+(item.payload.loadNo||item.payload.reference||item.payload.date||'');result.append(p);
   const view=document.createElement('button');view.type='button';view.className='btn secondary';view.textContent='Review record';view.onclick=()=>{if(active())review(item.id);};result.append(view);
   const attach=document.createElement('button');attach.type='button';attach.className='btn primary';attach.textContent='Confirm match & attach photo';attach.onclick=async()=>{if(!active())return;attach.disabled=true;try{if(snapshot.files.some(f=>f.item_id===item.id&&f.name.includes(hash))){say('This identical photo is already attached to this record.');return;}const form=new FormData();form.set('file',new File([file],name,{type:file.type}));form.set('itemId',item.id);await request('upload_file',form);if(active()){await refresh();}}catch(e){say('Attachment failed: '+e.message);}finally{if(active())attach.disabled=false;}};result.append(' ',attach);
  }
  if(analysis.type==='delivery paperwork'&&delivery){const b=document.createElement('button');b.type='button';b.className='btn secondary';b.textContent='Check delivery completion';b.onclick=()=>{if(active())delivery(file);};result.append(document.createElement('br'),b);}
 }catch(e){say('Document was not changed. '+e.message);}finally{if(active()){input.disabled=false;input.value='';}}
 };
}
