export const UPLOAD_LIMIT=10*1024*1024;
export function detectUploadMime(bytes){
 const b=new Uint8Array(bytes),is=(...a)=>a.every((v,i)=>b[i]===v);
 if(is(255,216,255))return 'image/jpeg';if(is(137,80,78,71,13,10,26,10))return 'image/png';if(is(82,73,70,70)&&b[8]===87&&b[9]===69&&b[10]===66&&b[11]===80)return 'image/webp';if(is(37,80,68,70,45))return 'application/pdf';return '';
}
export async function normalizeUpload(file,{imagesOnly=false}={}){
 if(!file?.size)throw Error('Choose a file that is not empty.');
 if(file.size>40*1024*1024)throw Error('This file is too large. Choose a photo under 40 MB or a PDF under 10 MB.');
 const mime=detectUploadMime(await file.slice(0,16).arrayBuffer());
 if(!mime)throw Error('This format cannot be read. Export HEIC/HEIF or other files as JPG, PNG, WebP or PDF, then try again.');
 if(imagesOnly&&mime==='application/pdf')throw Error('PDFs can be stored with Upload document. Choose a photo to extract receipt details.');
 const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'}[mime];
 const name=(file.name||'document').replace(/\.[^.]*$/,'').replace(/[^a-zA-Z0-9 _.-]/g,'_').slice(0,100)+'.'+extension;
 if(file.size<=(mime==='application/pdf'?UPLOAD_LIMIT:6*1024*1024))return new File([file],name,{type:mime});
 if(mime==='application/pdf')throw Error('PDFs must be under 10 MB. Compress or split this PDF before uploading.');
 let bitmap;
 try{bitmap=await createImageBitmap(file);const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));if(!blob||blob.size>UPLOAD_LIMIT)throw Error('Choose a smaller photo under 10 MB.');return new File([blob],name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'});}catch(e){throw Error('Photo could not be optimized. Export a smaller JPG and try again.');}finally{bitmap?.close();}
}
