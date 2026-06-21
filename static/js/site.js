/* ClipMood — shared interactions: nav, modal, tilt, reveal, toast, charts */
(function () {
  "use strict";
  function ready(fn){ if(document.readyState!=="loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  window.toast = function(msg){ var t=document.getElementById("toast"); if(!t) return; t.textContent=msg; t.classList.add("show"); clearTimeout(window.__tt); window.__tt=setTimeout(function(){ t.classList.remove("show"); },3200); };
  window.openModal=function(id){ var m=document.getElementById(id||"authModal"); if(m) m.classList.add("open"); };
  window.closeModal=function(id){ var m=document.getElementById(id||"authModal"); if(m) m.classList.remove("open"); };
  ready(function(){
    var nav=document.getElementById("nav");
    if(nav){ var on=function(){ nav.classList.toggle("scrolled", window.scrollY>20); }; window.addEventListener("scroll",on,{passive:true}); on(); }
    var b=document.getElementById("hamburger"), mn=document.getElementById("mobileNav");
    if(b&&mn){ b.addEventListener("click",function(){ b.classList.toggle("open"); mn.classList.toggle("open"); }); mn.querySelectorAll("a").forEach(function(a){ a.addEventListener("click",function(){ b.classList.remove("open"); mn.classList.remove("open"); }); }); }
    var mb=document.getElementById("appMenuBtn"), sb=document.getElementById("appSidebar");
    if(mb&&sb){ mb.addEventListener("click",function(){ sb.classList.toggle("open"); }); }
    document.querySelectorAll(".modal-overlay").forEach(function(m){ m.addEventListener("click",function(e){ if(e.target===m) m.classList.remove("open"); }); });
    document.addEventListener("keydown",function(e){ if(e.key==="Escape") document.querySelectorAll(".modal-overlay.open").forEach(function(m){ m.classList.remove("open"); }); });
    var rv=document.querySelectorAll(".reveal");
    if("IntersectionObserver" in window && rv.length){ var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("visible"); io.unobserve(e.target);} }); },{threshold:.12}); rv.forEach(function(el){ io.observe(el); }); }
    else rv.forEach(function(el){ el.classList.add("visible"); });
    var fine=window.matchMedia("(pointer:fine)").matches, reduce=window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    if(fine&&!reduce){
      function reset(c){ c.classList.remove("__t"); c.style.transform="perspective(900px) rotateX(0) rotateY(0)"; }
      document.addEventListener("mousemove",function(e){
        var card=e.target.closest?e.target.closest(".tilt"):null;
        document.querySelectorAll(".tilt.__t").forEach(function(c){ if(c!==card) reset(c); });
        if(!card) return;
        var r=card.getBoundingClientRect(), px=(e.clientX-r.left)/r.width, py=(e.clientY-r.top)/r.height;
        card.classList.add("__t");
        card.style.transform="perspective(900px) rotateX("+((0.5-py)*10)+"deg) rotateY("+((px-0.5)*12)+"deg) translateY(-3px)";
        card.style.setProperty("--mx",(px*100)+"%"); card.style.setProperty("--my",(py*100)+"%");
      });
    }
    document.querySelectorAll(".bars .bar[data-h]").forEach(function(bar){ requestAnimationFrame(function(){ bar.style.height=bar.getAttribute("data-h")+"%"; }); });
    document.querySelectorAll(".progress .bar[data-w]").forEach(function(bar){ requestAnimationFrame(function(){ bar.style.width=bar.getAttribute("data-w")+"%"; }); });
  });
})();
