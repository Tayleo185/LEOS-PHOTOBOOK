export function extractBol(text){
 const lines=String(text).replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean);
 const block=patterns=>{const i=lines.findIndex(s=>patterns.test(s));if(i<0)return '';const out=[];const first=lines[i].replace(patterns,'').replace(/^[\s:|-]+/,'');if(first)out.push(first);for(const line of lines.slice(i+1,i+6)){if(/ship\s*from|pickup|consignor|ship\s*to|deliver\s*to|consignee|bill of lading|total weight|commodity|carrier|appointment|description|signature/i.test(line))break;out.push(line);}return out.join(', ').slice(0,400);};
 return {loadNo:(text.match(/(?:BOL|bill of lading|load|reference)\s*(?:number|no\.?|#|:)\s*([A-Z0-9-]{3,35})/i)||[])[1]||'',origin:block(/ship\s*from|pickup|consignor/i),destination:block(/ship\s*to|deliver\s*to|consignee/i)};
}
export function fuelBudget({miles,mpg,tank,current,reserve}){
 for(const [k,v] of Object.entries({miles,mpg,tank,current,reserve}))if(!Number.isFinite(Number(v))||Number(v)<0)throw Error('Enter valid '+k+'.');
 miles=Number(miles);mpg=Number(mpg);tank=Number(tank);current=Number(current);reserve=Number(reserve);
 if(!mpg||!tank||current>tank||reserve>=tank)throw Error('Check MPG, tank size, current fuel and reserve.');
 return {gallons:miles/mpg,range:Math.max(0,current-reserve)*mpg,purchase:Math.max(0,miles/mpg+reserve-current)};
}
export function rankQuotes(quotes,gallons,mpg){
 return quotes.map(q=>({...q,total:Number(q.price)*gallons+Number(q.detour)/mpg*Number(q.price)})).sort((a,b)=>a.total-b.total);
}
export function checkpoints(route,departure){
 const pts=route.coordinates||[];if(!pts.length)return [];
 // Geometry is sampled by distance, not by provider vertex count.
 const lengths=[0];for(let i=1;i<pts.length;i++){const [a,b]=pts[i-1],[c,d]=pts[i];const r=Math.PI/180;const h=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;lengths.push(lengths[i-1]+2*6371*Math.asin(Math.min(1,Math.sqrt(h))));}
 const total=lengths.at(-1);return [0,.25,.5,.75,1].map(f=>{let i=lengths.findIndex(x=>x>=total*f);if(i<0)i=pts.length-1;return {lat:pts[i][0],lng:pts[i][1],arrival:Date.parse(departure)+route.seconds*1000*f};});
}
