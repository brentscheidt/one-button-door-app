/* BSRG DoorKnock — v0.4.0-core-hotfix (2025-10-05)
 * Fix: Restored initMap() callback for Google Maps, hybrid view, and bottom buttons.
 */
const CONFIG = {
  SCRIPT_BASE: "https://script.google.com/macros/s/AKfycbw-arSo0A6Xs0Uqt2vCt_n3B8p7jtPNuw4HX3tUGgc3fAeEqsDBIn5EqzFY9b4-oC/exec",
  REFRESH_SEC: 30,
};
let map, geocoder, markers=new Map(), pinsIndex=new Map(), selected=null;

window.initMap = initMap;
async function initMap(){
  geocoder=new google.maps.Geocoder();
  map=new google.maps.Map(document.getElementById("map"),{
    center:{lat:33.45,lng:-112.07},zoom:17,mapTypeId:"hybrid",disableDefaultUI:true,clickableIcons:false
  });
  document.getElementById("locateBtn").onclick=locate;
  document.getElementById("refreshBtn").onclick=fetchPins;
  document.getElementById("dropBtn").onclick=dropPin;
  buildMainBtns();
  locate(); fetchPins(); setInterval(fetchPins,CONFIG.REFRESH_SEC*1000);
}
function toast(t){const el=document.getElementById("toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2000);}
function buildMainBtns(){
  const div=document.getElementById("mainBtns");div.innerHTML="";
  ["Damage","Quick Knock","Conversation","Inspection","Customer","Dead"].forEach(s=>{
    const b=document.createElement("button");b.className="btn "+colorClass(s);b.textContent=s;b.onclick=()=>logQuick(s,"");div.appendChild(b);
  });
}
function colorClass(s){s=s.toLowerCase();if(s==="dead")return"black";if(s==="customer")return"green";if(s==="inspection")return"orange";if(s==="conversation")return"blue";if(s==="damage"||s==="quick knock")return"yellow";return"";}
async function locate(){navigator.geolocation.getCurrentPosition(p=>map.setCenter({lat:p.coords.latitude,lng:p.coords.longitude}),()=>toast("GPS failed"));}
async function dropPin(){
  const user=document.getElementById("userSelect").value;if(!user){toast("Select user");return;}
  navigator.geolocation.getCurrentPosition(async p=>{
    const lat=p.coords.latitude,lng=p.coords.longitude;
    const addr=await reverseGeocode({lat,lng});
    const id=addr.toLowerCase();
    pinsIndex.set(id,{pin_id:id,address:addr,lat,lng,status:"Damage",user});
    addOrUpdateMarker(pinsIndex.get(id));selected=pinsIndex.get(id);
    document.getElementById("addressLabel").textContent=addr;toast("Pin dropped");
  },()=>toast("GPS failed"));
}
async function reverseGeocode(latlng){return new Promise((res,rej)=>geocoder.geocode({location:latlng},(r,s)=>{if(s==="OK"&&r[0])res(r[0].formatted_address);else rej("no address");}));}
function addOrUpdateMarker(p){const color=markerColor(p.status);const icon={path:google.maps.SymbolPath
