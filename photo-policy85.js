/* Shared photo decision rules. OCR text is evidence for bookkeeping, not signature verification. */
(function(root){
 const norm=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 function photoDecision({text,confidence,loads,pay}){
  text=String(text||'');
  const refs=[...text.matchAll(/\b(?:load|dispatch|trip)\s*(?:number|id|no\.?|#|:)\s*[:#-]?\s*([A-Z0-9-]{5,24})\b/gi)].map(m=>norm(m[1]));
  const ids=[...new Set(refs)];
  if(ids.length!==1)return {action:'review',reason:'One clear load or dispatch number is required.'};
  const matches=loads.filter(r=>norm(r.loadNo)===ids[0]);
  if(matches.length!==1){
   if(!matches.length){
    // Some shipper BOLs print only the numeric load ID, without the broker prefix.
    // Keep this as an explicit review match, even if delivery words are present.
    const suffix=/^\d{6,}$/.test(ids[0])?loads.filter(r=>/^[A-Z]+\d+$/.test(norm(r.loadNo))&&norm(r.loadNo).replace(/^[A-Z]+/,'')===ids[0]):[];
    if(suffix.length===1)return {action:'review',load:suffix[0],possibleMatch:true,reason:'BOL load ID '+ids[0]+' matches the numeric part of saved load '+suffix[0].loadNo+'. Confirm whether this is pickup or completed delivery paperwork.'};
    if(suffix.length>1)return {action:'review',reason:'This numeric BOL ID matches multiple saved loads. Review the full load number before changing progress.'};
    const possible=loads.filter(r=>{const saved=norm(r.loadNo),read=ids[0];if(saved.length!==read.length)return false;let changes=0;for(let i=0;i<saved.length;i++){if(saved[i]===read[i])continue;if(!['Q0','0Q','O0','0O','I1','1I','L1','1L','S5','5S','B8','8B'].includes(saved[i]+read[i]))return false;changes++;}return changes===1;});
    if(possible.length===1)return {action:'review',load:possible[0],possibleMatch:true,reason:'The photo reads '+ids[0]+'. Possible saved load '+possible[0].loadNo+' has one commonly confused character. Check the load number before confirming delivery.'};
   }
   return {action:'review',reason:matches.length?'More than one load has this number. Choose the correct load.':'No unique saved load matches this number. Check the load number or save its rate confirmation first.'};
  }
  const load=matches[0];
  if(!Number.isFinite(Number(confidence))||Number(confidence)<85)return {action:'review',load,reason:'Matched the load, but handwriting or unclear text needs delivery confirmation.'};
  if(/\b(settlement|net pay|remittance advice|rate confirmation|dispatch confirmation)\b/i.test(text))return {action:'review',load,reason:'A rate confirmation or settlement does not establish completed delivery.'};
  const delivered=/\b(?:delivery completed\s+(?:on|at|date)\s*[:#-]?\s*\d|successfully delivered\s+(?:on|at|date)\s*[:#-]?\s*\d|delivered\s+(?:on|at|date)\s*[:#-]?\s*\d|received by\s*[:\-]\s*[A-Z][A-Z .'-]{2,40})/i.test(text);
  const placeholder=/\breceived by\s*[:\-]\s*(?:name|signature|print name|receiver)\b/i.test(text);
  const negative=/\b(?:not delivered|undelivered|delivery failed|delivery refused|refused delivery|delivery pending|pending delivery|signature required)\b/i.test(text);
  if(!delivered||negative||placeholder)return {action:'review',load,reason:'Clear completed-delivery text or a named receiver is required. Blank signature labels do not prove delivery.'};
  if(!(pay(load)>0))return {action:'review',load,reason:'The load needs confirmed pay details before automatic completion.'};
  return {action:['completed','paid'].includes(load.status)?'attach':'complete',load,reason:'Matched one saved load and recognized completed-delivery text.'};
 }
 root.LEOSPhotoPolicy={photoDecision};
})(typeof globalThis==='object'?globalThis:window);
