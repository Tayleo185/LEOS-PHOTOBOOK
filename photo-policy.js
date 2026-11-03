/* Shared photo decision rules. OCR text is evidence for bookkeeping, not signature verification. */
(function(root){
 const norm=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 function photoDecision({text,confidence,loads,pay}){
  text=String(text||'');
  if(Number(confidence)<85)return {action:'review',reason:'The photo text is not clear enough for automatic bookkeeping.'};
  const refs=[...text.matchAll(/\b(?:load|dispatch|trip)\s*(?:number|no\.?|#|:)\s*[:#-]?\s*([A-Z0-9-]{5,24})\b/gi)].map(m=>norm(m[1]));
  const ids=[...new Set(refs)];
  if(ids.length!==1)return {action:'review',reason:'One clear load or dispatch number is required.'};
  const matches=loads.filter(r=>norm(r.loadNo)===ids[0]);
  if(matches.length!==1)return {action:'review',reason:matches.length?'More than one load has this number. Choose the correct load.':'No saved load matches this number. Save its rate confirmation first.'};
  const load=matches[0];
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
