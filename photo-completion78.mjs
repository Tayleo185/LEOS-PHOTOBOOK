import './photo-policy78.js';
let library;
async function ocr(){if(window.Tesseract)return window.Tesseract;if(!library)library=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';script.onload=()=>resolve(window.Tesseract);script.onerror=()=>{library=null;reject(Error('Photo reader could not load. Try again.'));};document.head.append(script);});return library;}
export function photoPanel(){return `<section class="card" style="margin-bottom:24px"><h2>Upload delivery photo</h2><p>One clear delivery photo can attach the paperwork, complete a matching saved load and update earned pay, awaiting payment, profit and tax reserve targets. Handwritten forms may ask for one delivery confirmation. Payment stays unconfirmed until you record it.</p><label class="field">Take or upload a JPG, PNG or WebP photo<input id="delivery-photo" type="file" accept="image/jpeg,image/png,image/webp"></label><p id="delivery-photo-status" role="status" aria-live="polite"></p><p class="section-note">A clear load number, recognized delivery completion or named receiver, readable text and saved pay details are required. OCR cannot authenticate a signature. Uncertain paperwork needs review. Personal-toolkit loads remain separate from company loads.</p></section>`;}
export function mountPhotoCompletion({root,active,getState,request,refresh,edit,notify}){
 const input=root.querySelector('#delivery-photo'),status=root.querySelector('#delivery-photo-status');if(!input)return;
 const process=async(file)=>{if(!file)return;input.disabled=true;let worker,uploaded=false,completed=false;
 const say=text=>{if(active())status.textContent=text;};
 try{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10485760||!file.size)throw Error('Choose a JPG, PNG or WebP photo under 10 MB.');
  const snapshot=getState();if(snapshot.total>snapshot.items.length)throw Error('Load all company records before matching a photo.');
  say('Reading delivery paperwork…');const lib=await ocr();worker=await lib.createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text')say('Reading photo '+Math.round(m.progress*100)+'%');}});
  const {data}=await worker.recognize(file);if(!active())return;
  const loads=snapshot.items.filter(i=>i.kind==='load'&&!i.archived_at).map(i=>({...i.payload,id:i.id,version:i.version}));
  const pay=r=>r.payMode==='cpm'?Number(r.miles)*Number(r.payPerMile):Number(r.amount)*(r.payMode==='gross'?1:Number(r.loadShare??snapshot.company.settings.loadShare??100)/100);
  const decision=globalThis.LEOSPhotoPolicy.photoDecision({text:data.text,confidence:data.confidence,loads,pay});
  const save=async chosen=>{
  const bytes=await file.arrayBuffer();let key;if(globalThis.crypto?.subtle){const hash=await crypto.subtle.digest('SHA-256',bytes);key=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');}else{throw Error('Automatic photo saving requires a secure HTTPS connection.');}if(!active())return;
  const filename='POD-'+key+'.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg');
  if(!snapshot.files.some(f=>f.item_id===chosen.load.id&&f.name===filename)){const form=new FormData();form.set('file',new File([file],filename,{type:file.type}));form.set('itemId',chosen.load.id);say('Saving delivery photo privately…');await request('upload_file',form);uploaded=true;}
  if(!active())return;
  if(chosen.action==='complete'){say('Completing load and updating totals…');const original=snapshot.items.find(i=>i.id===chosen.load.id);await request('save_item',{id:original.id,version:original.version,kind:'load',payload:{...original.payload,status:'completed'}});completed=true;}
  if(!active())return;await refresh();notify(completed?'Delivery photo saved. Load completed; earned pay, awaiting payment, profit and tax reserve updated.':'Delivery photo attached. Existing load status and pay preserved.');
  };
  if(decision.action==='review'){
   say(decision.reason+' No load status or pay was changed.');
   if(decision.load){
    const label=document.createElement('p');label.textContent='Matched load '+decision.load.loadNo+' · Your load pay '+new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(pay(decision.load))+'.';status.append(label);
    const formLike=/\b(?:bill of lading|delivery receipt|proof of delivery)\b/i.test(data.text)&&/delivery\s*date/i.test(data.text)&&/signature|print\s*name/i.test(data.text);
    if(formLike&&pay(decision.load)>0&&!['paid','completed'].includes(decision.load.status)){
     const note=document.createElement('p');note.textContent='If this is your completed delivery paperwork, confirm delivery below. Leo will attach this photo and calculate the pay and reserve target. This does not confirm payment received.';status.append(note);
     const button=document.createElement('button');button.type='button';button.className='btn primary';button.textContent='Confirm '+decision.load.loadNo+' delivered & update totals';
     button.onclick=async()=>{if(!active())return;button.disabled=true;input.disabled=true;try{await save({...decision,action:'complete'});}catch(error){say('Completion was not confirmed. '+String(error.message||error));}finally{if(active()){input.disabled=false;button.disabled=false;}}};status.append(button);
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
