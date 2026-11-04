// Receipt extraction produces review drafts, never automatic financial writes.
const unique=a=>[...new Set(a)];
const moneyValues=s=>[...String(s).matchAll(/\b([0-9][0-9,]*[.,][0-9]{2})\b/g)].map(m=>Number(m[1].replace(/,(?=\d{3}(?:\D|$))/g,'').replace(',','.'))).filter(Number.isFinite);
function validDate(y,m,d){const v=new Date(Date.UTC(+y,+m-1,+d));return v.getUTCFullYear()===+y&&v.getUTCMonth()===+m-1&&v.getUTCDate()===+d?`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:null;}
export function receiptDetails(raw){
 const text=String(raw||'').replace(/\r/g,'');const body=text.split(/\b(?:IMPORTANT|MyRewards|YOU HAVE SHOWER POWER|Special Promotional Offer)\b/i)[0];const lines=body.split('\n').map(s=>s.trim()).filter(Boolean);
 const receipt=/\b(?:SALE|receipt|price\s*\/\s*gal|scales?\s*weigh)\b/i.test(body)&&!/\b(?:rate confirmation|bill of lading|remittance advice)\b/i.test(body);
 let vendor=/\bfly\s*ing\s*j\b|\bflying\s*j\b/i.test(text)?'Flying J':/\bpilot\b/i.test(text)?'Pilot':'';
 const logoGuess=!vendor&&(/^\s*Dilot[.®]?\s*$/im.test(body)||/^\s*FLYIN(?:G)?\s*$/im.test(body));if(logoGuess)vendor=/^\s*Dilot/im.test(body)?'Pilot':'Flying J';
 const dates=unique([...body.matchAll(/\b(\d{1,2})\s*[\/-]\s*(\d{1,2})\s*[\/-]\s*(20\d{2})\b/g)].map(m=>validDate(m[3],m[1],m[2])).concat([...body.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)].map(m=>validDate(m[1],m[2],m[3]))).filter(Boolean));
 const totals=[];
 for(const match of body.matchAll(/\b(?:grand\s+total|total(?:\s+paid)?|amount\s+(?:due|paid))\s*[:$]*\s*([0-9][0-9,]*[.,][0-9]{2})\b/gi))totals.push(...moneyValues(match[1]));
 const amounts=unique(totals);let amount=amounts.length===1?amounts[0]:null,paidFallback=false;
 if(!totals.length){const received=body.split(/\breceived\s*:?/i)[1]?.slice(0,230)||'';const paid=unique([...received.matchAll(/\b(?:debit\s*card|credit\s*card|cash|TCH|visa|mastercard)\s*[:$]*\s*([0-9][0-9,]*[.,][0-9]{2})\b/gi)].flatMap(m=>moneyValues(m[1])));const subtotal=unique([...body.matchAll(/\bsubtotal\s*[:$]*\s*([0-9][0-9,]*[.,][0-9]{2})\b/gi)].flatMap(m=>moneyValues(m[1])));if(paid.length===1&&subtotal.length===1&&paid[0]===subtotal[0]){amount=paid[0];paidFallback=true;}}
 const gallons=Number(body.match(/\bgallons\s*[:#]?\s*([\d,]+\.\d{1,3})/i)?.[1]?.replaceAll(',',''))||null;
 const unitPrice=Number(body.match(/\bprice\s*\/\s*gal\.?\s*[:$]?\s*(\d+\.\d{2,3})/i)?.[1])||null;
 const fuel=/\b(?:truck\s+diesel|diesel|gasoline|unleaded)\b/i.test(body),scale=/\bscales?\s*weigh\b/i.test(body);
 const transaction=body.match(/\btransaction\s*#?\s*[:#]?\s*([0-9]{4,20})\b/i)?.[1]||'';
 const warnings=[];if(paidFallback)warnings.push('Received amount matches the subtotal; check the printed total before saving');if(logoGuess)warnings.push('Check the merchant suggested from the logo');if(amount===null)warnings.push('Confirm the receipt total');if(dates.length!==1)warnings.push('Confirm the purchase date');if(!vendor)warnings.push('Confirm the merchant');if(fuel&&amount&&gallons&&unitPrice&&Math.abs(gallons*unitPrice-amount)>.1)warnings.push('Fuel math differs from the total; check every amount');
 return {isReceipt:receipt,vendor,amount,date:dates.length===1?dates[0]:null,gallons: fuel?gallons:null,unitPrice:fuel?unitPrice:null,transaction,kind:fuel?'fuel':'expense',category:fuel?'Fuel':scale?'Scale ticket':'',description:[vendor,fuel?'Diesel':scale?'Scale weigh':'Receipt'].filter(Boolean).join(' · '),warnings};
}
export function reconcileReceipts(readings,asOf=new Date().toLocaleDateString('en-CA')){
 const valid=readings.filter(r=>r.isReceipt);if(!valid.length)return readings[0];
 const ranked=[...valid].sort((a,b)=>(a.amount==null?10:0)+a.warnings.length-((b.amount==null?10:0)+b.warnings.length));
 const result={...ranked[0],warnings:[...ranked[0].warnings]};
 if(!result.vendor){const names=unique(valid.map(r=>r.vendor).filter(Boolean));if(names.length===1){result.vendor=names[0];result.warnings.push('Check the merchant suggested from the logo');result.description=result.vendor+' · '+(result.kind==='fuel'?'Diesel':result.category==='Scale ticket'?'Scale weigh':'Receipt');}}
 for(const key of ['amount','date']){
  const values=unique(valid.map(r=>r[key]).filter(v=>v!=null));
  if(values.length>1){result[key]=null;result.warnings.push('OCR passes disagree on the '+(key==='date'?'purchase date':'total')+'; enter it from the receipt');}
 }
 if(result.date&&result.date>asOf){result.date=null;result.warnings.push('OCR date appears to be in the future; check the printed year');}
 return result;
}
