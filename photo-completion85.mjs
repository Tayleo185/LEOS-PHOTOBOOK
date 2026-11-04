import {normalizeUpload} from './uploads82.mjs';
import './photo-policy85.js';
let library;
async function ocr(){if(window.Tesseract)return window.Tesseract;if(!library)library=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';script.onload=()=>resolve(window.Tesseract);script.onerror=()=>{library=null;reject(Error('Photo reader could not load. Try again.'));};document.head.append(script);});return library;}
export async function readDocumentPhoto(file){
 const lib=await ocr(),worker=await lib.createWorker('eng');let bitmap;
 try{
  bitmap=await createImageBitmap(file);const long=bitmap.height/bitmap.width>2.6;
  // Long receipts contain rewards and barcodes below the sale. Read the sale area at a legible scale.
  const height=long?Math.min(bitmap.height,Math.round(bitmap.width*2.8)):bitmap.height;
  const scale=Math.min(4,Math.max(1,1400/bitmap.width));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(height*scale);
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,bitmap.width,height,0,0,canvas.width,canvas.height);
  await worker.setParameters({tessedit_pageseg_mode:long?'6':'3'});const first=(await worker.recognize(canvas)).data;
  if(!long)return first;
  if(!/\b(?:sale|receipt|transaction|gallons|subtotal)\b/i.test(first.text)){await worker.setParameters({tessedit_pageseg_mode:'3'});return (await worker.recognize(file)).data;}
  // A second layout pass helps logos and separated label/value columns. Keep alternatives separate.
  await worker.setParameters({tessedit_pageseg_mode:'11'});const second=(await worker.recognize(canvas)).data;
  return {...first,alternatives:[second.text],receiptCrop:true};
 }finally{bitmap?.close();await worker.terminate();}
}
export function photoPanel(){return `<section class="card" style="margin-bottom:24px"><h2>Upload delivery photo</h2><p>One clear delivery photo can attach the paperwork, complete a matching saved load and update earned pay, awaiting payment, profit and tax reserve targets. Handwritten forms may ask for one delivery confirmation. Payment stays unconfirmed until you record it.</p><label class="field">Take or upload a JPG, PNG or WebP photo<input id="delivery-photo" type="file" accept="image/jpeg,image/png,image/webp"></label><p id="delivery-photo-status" role="status" aria-live="polite"></p><p class="section-note">A clear load number, recognized delivery completion or named receiver, readable text and saved pay details are required. OCR cannot authenticate a signature. Uncertain paperwork needs review. Personal-toolkit loads remain separate from company loads.</p></section>`;}
export function mountPhotoCompletion({root,active,getState,request,refresh,edit,notify}){
 const input=root.querySelector('#delivery-photo'),status=root.querySelector('#delivery-photo-status');if(!input)return;
 const process=async(file,preRead)=>{if(!file)return;input.disabled=true;let worker,uploaded=false,completed=false;
 const say=text=>{if(active())status.textContent=text;};
 try{
  say('Preparing delivery photo…');file=await normalizeUpload(file,{imagesOnly:true});if(!active())return;
  const snapshot=getState();if(snapshot.total>snapshot.items.length)throw Error('Load all company records before matching a photo.');
  say('Reading delivery paperwork…');let data=preRead;if(!data){const lib=await ocr();worker=await lib.createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text')say('Reading photo '+Math.round(m.progress*100)+'%');}});data=(await worker.recognize(file)).data;}if(!active())return;
  const loads=snapshot.items.filter(i=>i.kind==='load'&&!i.archived_at).map(i=>({...i.payload,id:i.id,version:i.version}));
  const pay=r=>r.payMode==='cpm'?Number(r.miles)*Number(r.payPerMile):Number(r.amount)*(r.payMode==='gross'?1:Number(r.loadShare??snapshot.company.settings.loadShare??100)/100);
  const decision=globalThis.LEOSPhotoPolicy.photoDecision({text:data.text,confidence:data.confidence,loads,pay});
  const save=async (chosen,completedDate)=>{
  const bytes=await file.arrayBuffer();let key;if(globalThis.crypto?.subtle){const hash=await crypto.subtle.digest('SHA-256',bytes);key=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');}else{throw Error('Automatic photo saving requires a secure HTTPS connection.');}if(!active())return;
  const filename='POD-'+key+'.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg');
  if(!snapshot.files.some(f=>f.item_id===chosen.load.id&&f.name===filename)){const form=new FormData();form.set('file',new File([file],filename,{type:file.type}));form.set('itemId',chosen.load.id);say('Saving delivery photo privately…');await request('upload_file',form);uploaded=true;}
  if(!active())return;
  if(chosen.action==='complete'){say('Completing load and updating totals…');const original=snapshot.items.find(i=>i.id===chosen.load.id);await request('save_item',{id:original.id,version:original.version,kind:'load',payload:{...original.payload,status:'completed',date:completedDate||new Date().toLocaleDateString('en-CA'),notes:[original.payload.notes, 'Delivery completed '+(completedDate||new Date().toLocaleDateString('en-CA'))+' via photo confirmation. Previously scheduled record date: '+(original.payload.date||'not set')+'.'].filter(Boolean).join('\n')}});completed=true;}
  if(chosen.action==='pickup'){const original=snapshot.items.find(i=>i.id===chosen.load.id);await request('save_item',{id:original.id,version:original.version,kind:'load',payload:{...original.payload,status:'in_transit'}});}
  if(!active())return;await refresh();notify(completed?'Delivery photo saved. Load completed; earned pay, awaiting payment, profit and tax reserve updated.':chosen.action==='pickup'?'Pickup photo saved. Load is in transit; earned pay updates when delivery is confirmed.':'Delivery photo attached. Existing load status and pay preserved.');
  };
  if(decision.action==='review'){
   say(decision.reason+' No load status or pay was changed.');
   if(decision.load){
    const label=document.createElement('p');label.textContent='Matched load '+decision.load.loadNo+' · Your load pay '+new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(pay(decision.load))+'.';status.append(label);
    const formLike=/\b(?:bill of lading|delivery receipt|proof of delivery)\b/i.test(data.text)&&!/\b(?:not delivered|undelivered|delivery failed|delivery refused|refused delivery)\b/i.test(data.text);
    if(formLike&&pay(decision.load)>0&&!['paid','completed'].includes(decision.load.status)){
     const note=document.createElement('p');note.textContent='A BOL can be issued at pickup. Confirm delivery only after unloading is complete. Leo will attach this photo and update earned pay and reserve; payment remains unconfirmed.';status.append(note);
     const dateLabel=document.createElement('label');dateLabel.className='field';dateLabel.textContent='Actual delivery date';const date=document.createElement('input');date.type='date';date.value=new Date().toLocaleDateString('en-CA');date.max=date.value;date.required=true;dateLabel.append(date);status.append(dateLabel);
     const button=document.createElement('button');button.type='button';button.className='btn primary';button.textContent='Confirm '+decision.load.loadNo+' delivered & update totals';
     button.onclick=async()=>{if(!active())return;button.disabled=true;input.disabled=true;try{if(!date.value||date.value>date.max)throw Error('Enter the actual delivery date, today or earlier.');await save({...decision,action:'complete'},date.value);}catch(error){say('Completion was not confirmed. '+String(error.message||error));}finally{if(active()){input.disabled=false;button.disabled=false;}}};status.append(button);
    }
    if(formLike&&decision.load.status==='scheduled'){
     const pickup=document.createElement('button');pickup.type='button';pickup.className='btn secondary';pickup.textContent='Confirm picked up / in transit';pickup.onclick=async()=>{if(!active())return;pickup.disabled=true;input.disabled=true;try{await save({...decision,action:'pickup'});}catch(error){say('Pickup was not confirmed. '+String(error.message||error));}finally{if(active()){input.disabled=false;pickup.disabled=false;}}};status.append(' ',pickup);
    }
    const editButton=document.createElement('button');editButton.type='button';editButton.className='btn secondary';editButton.textContent='Review matched load';editButton.onclick=()=>edit(snapshot.items.find(i=>i.id===decision.load.id));status.append(' ',editButton);
   }
   return;
  }
  await save(decision);
 }catch(error){say((uploaded?'Photo saved privately. ':'')+(completed?'Load saved as completed, but refresh failed. Reload to see totals. ': 'Completion was not confirmed. ')+String(error.message||error));}
 finally{if(worker)await worker.terminate();if(active()){input.disabled=false;input.value='';}}
 };
 input.onchange=()=>process(input.files?.[0]);return process;
}
