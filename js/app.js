/* Electrical Isolation Assistant - GitHub Pages static edition.
   Planning aid only. No device control, SCADA commands, or switching authorization. */
"use strict";
const STORAGE_KEY="eia_devices_v1";
const SAMPLE=[
 {id:"SUB-01",type:"Substation",lat:13.7563,lng:100.5018,upstream:"",status:"closed",x:100,y:300},
 {id:"CB-01",type:"Circuit Breaker",lat:13.7600,lng:100.5050,upstream:"SUB-01",status:"closed",x:280,y:300},
 {id:"REC-01",type:"Recloser",lat:13.7650,lng:100.5100,upstream:"CB-01",status:"closed",x:470,y:300},
 {id:"LBS-01",type:"Load Break Switch",lat:13.7700,lng:100.5150,upstream:"REC-01",status:"closed",x:660,y:200},
 {id:"DO-01",type:"Fused Cutout",lat:13.7750,lng:100.5200,upstream:"LBS-01",status:"closed",x:850,y:200},
 {id:"LBS-02",type:"Load Break Switch",lat:13.7710,lng:100.5170,upstream:"REC-01",status:"closed",x:660,y:420},
 {id:"TR-01",type:"Transformer",lat:13.7760,lng:100.5220,upstream:"LBS-02",status:"closed",x:850,y:420}
];
let devices=loadDevices(), currentPlan=null, gps=null, editingId=null;
const $=id=>document.getElementById(id);
function clone(x){return JSON.parse(JSON.stringify(x))}
function loadDevices(){try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY));return Array.isArray(x)?x:SAMPLE.map(clone)}catch{return SAMPLE.map(clone)}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(devices));$("saveStatus").textContent="บันทึกข้อมูลในเบราว์เซอร์แล้ว"}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function validateNetwork(list=devices){
 const errors=[],ids=new Set();
 for(const d of list){if(!d.id)errors.push("พบอุปกรณ์ไม่มีรหัส");if(ids.has(d.id))errors.push("รหัสซ้ำ: "+d.id);ids.add(d.id);
  if(!Number.isFinite(+d.lat)||!Number.isFinite(+d.lng)||Math.abs(+d.lat)>90||Math.abs(+d.lng)>180)errors.push("พิกัดไม่ถูกต้อง: "+d.id);
  if(d.upstream && !list.some(p=>p.id===d.upstream))errors.push(d.id+" อ้างถึงต้นน้ำที่ไม่มีอยู่ ("+d.upstream+")");
  if(d.upstream===d.id)errors.push(d.id+" อ้างอิงตัวเองเป็นต้นน้ำ");
 }
 for(const d of list){let seen=new Set([d.id]),p=d;while(p&&p.upstream){if(seen.has(p.upstream)){errors.push("พบความสัมพันธ์วนซ้ำที่ "+d.id);break}seen.add(p.upstream);p=list.find(x=>x.id===p.upstream)}}
 return [...new Set(errors)];
}
function childrenOf(id){return devices.filter(d=>d.upstream===id)}
function descendants(id){const out=[],q=[id],seen=new Set();while(q.length){const x=q.shift();for(const c of childrenOf(x)){if(!seen.has(c.id)){seen.add(c.id);out.push(c);q.push(c.id)}}}return out}
function ancestors(id){const out=[],seen=new Set();let d=devices.find(x=>x.id===id);while(d&&d.upstream){if(seen.has(d.upstream))break;seen.add(d.upstream);const p=devices.find(x=>x.id===d.upstream);if(!p)break;out.push(p);d=p}return out}
function roots(){return devices.filter(d=>!d.upstream)}
function statusColor(d){return d.status==="closed"?"#10b981":"#ef4444"}
function renderSLD(){
 const svg=$("sldSvg");let markup="";
 devices.forEach(d=>{if(!d.upstream)return;const p=devices.find(x=>x.id===d.upstream);if(!p)return;
 const energized=p.status==="closed"&&d.status==="closed";markup+=`<line x1="${p.x}" y1="${p.y}" x2="${d.x}" y2="${d.y}" stroke="${energized?"#10b981":"#ef4444"}" stroke-width="4" stroke-linecap="round"/>`});
 devices.forEach(d=>{const c=statusColor(d);markup+=`<g data-id="${escapeHtml(d.id)}" class="node" tabindex="0" role="button" aria-label="รายละเอียด ${escapeHtml(d.id)}"><circle cx="${d.x}" cy="${d.y}" r="25" fill="#1e293b" stroke="${c}" stroke-width="4"/><circle cx="${d.x}" cy="${d.y}" r="8" fill="${c}"/><text x="${d.x}" y="${d.y-38}" text-anchor="middle" fill="#f8fafc" font-size="14" font-weight="700">${escapeHtml(d.id)}</text><text x="${d.x}" y="${d.y+43}" text-anchor="middle" fill="#94a3b8" font-size="11">${escapeHtml(d.type)}</text></g>`});
 svg.innerHTML=markup;
 svg.querySelectorAll(".node").forEach(n=>{const open=()=>showDetail(n.dataset.id);n.addEventListener("click",open);n.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}})});
 const errs=validateNetwork();$("networkStatus").innerHTML=errs.length?`<span class="error">โครงข่ายมี ${errs.length} ข้อผิดพลาด</span>`:`<span class="good">โครงข่ายผ่านการตรวจสอบพื้นฐาน · ${roots().length} แหล่งจ่ายหลัก</span>`;
 $("deviceCount").textContent=devices.length;$("rootCount").textContent=roots().length;$("invalidCount").textContent=errs.length;
}
function fillFaultSelect(){const s=$("faultSelect"),old=s.value;s.innerHTML='<option value="">-- เลือกอุปกรณ์ --</option>'+devices.map(d=>`<option value="${escapeHtml(d.id)}">${escapeHtml(d.id)} · ${escapeHtml(d.type)}</option>`).join("");if(devices.some(d=>d.id===old))s.value=old}
function renderDeviceRows(){const q=$("searchDevice").value.toLowerCase();$("deviceRows").innerHTML=devices.filter(d=>(d.id+" "+d.type).toLowerCase().includes(q)).map(d=>`<tr><td><b>${escapeHtml(d.id)}</b><br><span class="muted">${escapeHtml(d.type)}</span></td><td class="${d.status==="closed"?"status-closed":"status-open"}">${d.status==="closed"?"สับ":"ปลด"}</td><td><button class="secondary mini" data-edit="${escapeHtml(d.id)}">แก้</button><button class="danger mini" data-del="${escapeHtml(d.id)}">ลบ</button></td></tr>`).join("");
 $("deviceRows").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openDeviceDialog(b.dataset.edit));$("deviceRows").querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>deleteDevice(b.dataset.del))}
function updateAll(){save();renderSLD();fillFaultSelect();renderDeviceRows();if(currentPlan){currentPlan=null;$("plan").textContent="ข้อมูลโครงข่ายเปลี่ยนแปลง กรุณาวิเคราะห์ใหม่";$("analysisSummary").textContent="แผนเดิมถูกยกเลิกเพื่อป้องกันการใช้ข้อมูลเก่า";$("printBtn").disabled=true}}
function analyze(){
 const id=$("faultSelect").value,kind=$("faultKind").value;if(!id){alert("กรุณาเลือกจุดเกิดเหตุ");return}
 const errs=validateNetwork();if(errs.length){$("analysisSummary").innerHTML='<span class="error">ไม่สามารถวิเคราะห์ได้ เนื่องจากโครงข่ายมีข้อผิดพลาด:</span><ul>'+errs.map(e=>`<li>${escapeHtml(e)}</li>`).join("")+'</ul>';return}
 const fault=devices.find(d=>d.id===id),up=ancestors(id),down=descendants(id);
 const upstreamClosed=up.filter(d=>d.status==="closed"),openBoundary=up.find(d=>d.status==="open");
 const affected=[fault,...down].filter(d=>d.status==="closed");
 const upstreamPath=[...up].reverse().concat(fault);
 const source=upstreamPath[0];
 const root=upstreamPath[0];
 const candidate=upstreamClosed.length?upstreamClosed[upstreamClosed.length-1]:null;
 const isDevice=kind==="device";
 const steps=[];
 steps.push("ยืนยันตำแหน่งเหตุขัดข้อง รหัสอุปกรณ์/ช่วงวงจร "+id+" และตรวจสอบข้อมูลภาคสนาม");
 steps.push("ตรวจสอบแผนผังฉบับอนุมัติ สถานะจริงของอุปกรณ์ทุกจุด และแหล่งจ่ายย้อนกลับ/แหล่งผลิตกระจาย");
 if(openBoundary)steps.push("พบอุปกรณ์ต้นน้ำที่ระบุสถานะปลด: "+openBoundary.id+" — ตรวจสอบยืนยันสถานะจริงและขอบเขตการดับไฟ");
 else if(candidate)steps.push("จุดแยกต้นน้ำที่ควรนำไปพิจารณา: "+candidate.id+" (อุปกรณ์ต้นน้ำที่ใกล้จุดเหตุที่สุดและระบุว่าสับ) — ต้องให้ผู้มีอำนาจตรวจสอบพิกัดและพิกัดความสามารถ");
 else steps.push("ไม่พบอุปกรณ์ต้นน้ำที่ระบุว่าสับในเส้นทางนี้ — ห้ามสรุปว่าปลอดภัยหรือไม่มีไฟ ต้องตรวจสอบแหล่งจ่ายทั้งหมด");
 if(isDevice)steps.push("เหตุเป็นอุปกรณ์ชำรุด: พิจารณาแยกทั้งสองด้านของอุปกรณ์ตามแบบวงจรจริง ไม่สามารถยืนยันการแยกด้วยข้อมูล parent-child อย่างเดียว");
 else steps.push("เหตุเป็นช่วงสาย/วงจร: ตรวจสอบอุปกรณ์แยกวงจรทั้งสองด้านของช่วงสายตามแบบจริง ระบบตัวอย่างนี้มีข้อมูลความสัมพันธ์ต้นน้ำด้านเดียว จึงยังไม่ยืนยันขอบเขตด้านปลายทาง");
 steps.push("จัดทำ Switching Order ตามระเบียบหน่วยงาน ระบุผู้สั่งการ ผู้ปฏิบัติ เวลา จุดติดตั้งสายดิน และการป้องกันการจ่ายกลับ");
 steps.push("ก่อนเข้าทำงาน ต้องยืนยันแยกแหล่งจ่ายทุกทาง ตรวจสอบไม่มีแรงดัน ติดตั้งสายดิน/อุปกรณ์ป้องกัน และดำเนินการ LOTO ตามระเบียบ");
 steps.push("หลังซ่อม: ตรวจสอบพื้นที่/เครื่องมือ/บุคลากร ขออนุญาตคืนระบบ และคืนสภาพตาม Switching Order ที่อนุมัติ");
 currentPlan={id,kind,created:new Date().toLocaleString("th-TH"),candidate:candidate?.id||null,affected:affected.map(d=>d.id),steps};
 $("analysisSummary").innerHTML=`<div><b>จุดเกิดเหตุ:</b> ${escapeHtml(id)}<br><b>ประเภท:</b> ${isDevice?"อุปกรณ์ชำรุด":"ช่วงสาย/วงจร"}<br><b>ต้นน้ำ:</b> ${up.length?up.map(d=>escapeHtml(d.id)).join(" → "):"ไม่พบ"}<br><b>อุปกรณ์ปลายน้ำ:</b> ${down.length?down.map(d=>escapeHtml(d.id)).join(", "):"ไม่มี"}<br><b>อุปกรณ์ที่มีสถานะสับในแขนงนี้:</b> ${affected.map(d=>escapeHtml(d.id)).join(", ")||"ไม่มี"}</div><p class="error small">ผลนี้เป็นเพียงการประเมินจากข้อมูลที่ผู้ใช้ป้อน ไม่ใช่คำยืนยันว่าอุปกรณ์ใดตัดแยกวงจรได้จริง</p>`;
 $("plan").innerHTML=`<div class="step warning"><b>ข้อเสนอจุดต้นน้ำ:</b> ${candidate?escapeHtml(candidate.id):"ยังระบุไม่ได้"}<br><span class="muted small">ไม่ใช่คำสั่งให้สับ/ปลด</span></div>`+steps.map((s,i)=>`<div class="step"><label><input type="checkbox"> <strong>ขั้นตอน ${i+1}</strong><br>${escapeHtml(s)}</label></div>`).join("");
 $("printBtn").disabled=false;
}
function openDeviceDialog(id=null){editingId=id;const d=id?devices.find(x=>x.id===id):null;$("dialogTitle").textContent=d?"แก้ไขอุปกรณ์":"เพิ่มอุปกรณ์";$("originalId").value=id||"";$("devId").value=d?.id||"";$("devType").value=d?.type||"Recloser";$("devLat").value=d?.lat??13.75;$("devLng").value=d?.lng??100.5;$("devStatus").value=d?.status||"closed";
 $("devParent").innerHTML='<option value="">-- ไม่มี (แหล่งจ่ายหลัก) --</option>'+devices.filter(x=>x.id!==id).map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.id)}</option>`).join("");$("devParent").value=d?.upstream||"";$("deviceDialog").showModal()}
function saveDevice(e){e.preventDefault();const old=$("originalId").value,id=$("devId").value.trim(),parent=$("devParent").value;if(!id)return;
 if(devices.some(d=>d.id===id&&d.id!==old)){alert("รหัสอุปกรณ์ซ้ำ");return}
 const lat=Number($("devLat").value),lng=Number($("devLng").value);if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lng)||Math.abs(lng)>180){alert("พิกัดไม่ถูกต้อง");return}
 const existing=devices.find(d=>d.id===old);const item={id,type:$("devType").value,lat,lng,upstream:parent,status:$("devStatus").value,x:existing?.x??(130+(devices.length%4)*220),y:existing?.y??(160+Math.floor(devices.length/4)*180)};
 const candidate=devices.filter(d=>d.id!==old).concat(item),errs=validateNetwork(candidate);if(errs.length){alert("บันทึกไม่ได้: "+errs.join("; "));return}
 if(existing){const oldId=existing.id;Object.assign(existing,item);if(oldId!==id)devices.forEach(d=>{if(d.upstream===oldId)d.upstream=id})}else devices.push(item);
 $("deviceDialog").close();updateAll()}
function deleteDevice(id){if(devices.some(d=>d.upstream===id)){alert("ลบไม่ได้: ยังมีอุปกรณ์ปลายน้ำอ้างอิงอุปกรณ์นี้ กรุณาแก้ความสัมพันธ์ก่อน");return}if(!confirm("ยืนยันลบ "+id+"?"))return;devices=devices.filter(d=>d.id!==id);updateAll()}
function showDetail(id){const d=devices.find(x=>x.id===id);if(!d)return;$("detailContent").innerHTML=`<p><b>รหัส:</b> ${escapeHtml(d.id)}</p><p><b>ประเภท:</b> ${escapeHtml(d.type)}</p><p><b>สถานะข้อมูล:</b> ${d.status==="closed"?"สับ":"ปลด"}</p><p><b>ต้นน้ำ:</b> ${escapeHtml(d.upstream||"ไม่มี / แหล่งจ่ายหลัก")}</p><p><b>พิกัด:</b> ${d.lat}, ${d.lng}</p><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(d.lat+","+d.lng)}">เปิด Google Maps</a>`;$("detailDialog").showModal()}
function distance(a,b){const r=6371,rad=x=>x*Math.PI/180,dl=rad(b.lat-a.lat),dn=rad(b.lng-a.lng),h=Math.sin(dl/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dn/2)**2;return 2*r*Math.asin(Math.sqrt(h))}
function nearest(){if(!gps){$("nearestResult").textContent="กรุณาระบุพิกัดหรือใช้ GPS ก่อน";return}if(!devices.length)return;const ranked=devices.map(d=>({d,km:distance(gps,d)})).sort((a,b)=>a.km-b.km),n=ranked[0];$("nearestResult").innerHTML=`ใกล้ที่สุด: <b>${escapeHtml(n.d.id)}</b><br>ระยะทางเส้นตรงประมาณ ${(n.km*1000).toFixed(0)} เมตร<br><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${n.d.lat},${n.d.lng}">เปิด Google Maps</a>`}
function setGPS(lat,lng){if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lng)||Math.abs(lng)>180){alert("พิกัดไม่ถูกต้อง");return}gps={lat,lng};$("latVal").textContent=lat.toFixed(6);$("lngVal").textContent=lng.toFixed(6);nearest()}
function exportData(){const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),devices},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="electrical-isolation-backup.json";a.click();URL.revokeObjectURL(url)}
async function importData(file){try{const data=JSON.parse(await file.text()),list=Array.isArray(data)?data:data.devices;if(!Array.isArray(list))throw Error("ไม่พบรายการ devices");const errs=validateNetwork(list);if(errs.length)throw Error(errs.join("; "));devices=list.map(d=>({...d,x:Number(d.x)||150,y:Number(d.y)||150}));updateAll();alert("นำเข้าข้อมูลสำเร็จ")}catch(e){alert("นำเข้าไม่สำเร็จ: "+e.message)}}
function init(){
 document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".tab-panel").forEach(x=>x.classList.add("hidden"));$("tab-"+b.dataset.tab).classList.remove("hidden")});
 $("analyzeBtn").onclick=analyze;$("addDeviceBtn").onclick=()=>openDeviceDialog();$("saveDeviceBtn").onclick=saveDevice;$("searchDevice").oninput=renderDeviceRows;$("printBtn").onclick=()=>window.print();$("exportBtn").onclick=exportData;
 $("importFile").onchange=e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=""};
 $("resetBtn").onclick=()=>{if(confirm("คืนค่าข้อมูลตัวอย่าง? ข้อมูลปัจจุบันจะถูกแทนที่")){devices=SAMPLE.map(clone);currentPlan=null;updateAll();$("plan").textContent="ยังไม่มีแผนวิเคราะห์";$("analysisSummary").textContent="เลือกจุดเกิดเหตุแล้วกดวิเคราะห์";$("printBtn").disabled=true}};
 $("gpsBtn").onclick=()=>{if(!navigator.geolocation){alert("เบราว์เซอร์ไม่รองรับ GPS");return}navigator.geolocation.getCurrentPosition(p=>setGPS(p.coords.latitude,p.coords.longitude),e=>alert("อ่าน GPS ไม่สำเร็จ: "+e.message),{enableHighAccuracy:true,timeout:12000})};
 $("coordsBtn").onclick=()=>{const m=$("coordsInput").value.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);if(!m){alert("กรุณากรอก Lat, Lng เช่น 13.7563,100.5018");return}setGPS(+m[1],+m[2])};$("nearestBtn").onclick=nearest;
 $("closeDetail").onclick=()=>$("detailDialog").close();$("deviceForm").addEventListener("submit",saveDevice);
 updateAll();$("plan").textContent="ยังไม่มีแผนวิเคราะห์";$("analysisSummary").textContent="เลือกจุดเกิดเหตุแล้วกดวิเคราะห์";
}
document.addEventListener("DOMContentLoaded",init);
