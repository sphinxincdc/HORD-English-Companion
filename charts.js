
function drawSimpleLine(canvasId, data, color){
  const c = document.getElementById(canvasId);
  if(!c) return;
  const ctx = c.getContext("2d");
  const w = c.width;
  const h = c.height;
  ctx.clearRect(0,0,w,h);
  ctx.beginPath();
  ctx.strokeStyle=color;
  ctx.lineWidth=2;
  data.forEach((v,i)=>{
    const x = (w/(data.length-1))*i;
    const y = h - (v/100)*h;
    if(i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });
  ctx.stroke();
}

document.addEventListener("DOMContentLoaded",()=>{
  drawSimpleLine("trendChart",[20,35,50,60,75,85,92],"#6366f1");
  drawSimpleLine("forgetChart",[90,80,70,60,55,50,45],"#f59e0b");
  drawSimpleLine("activeChart",[10,20,40,60,40,30,70],"#10b981");
});
