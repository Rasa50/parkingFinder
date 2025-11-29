document.addEventListener("DOMContentLoaded", () => {
  console.log("System Loading...");

  // ==========================================
  // 1. SETUP ELEMENT DOM
  // ==========================================
  const routePath = document.getElementById("routePath");
  const carMarker = document.getElementById("carMarker");
  const resCode = document.getElementById("resCode");
  const resDist = document.getElementById("resDist");
  const resETA = document.getElementById("resETA");
  const aiChat = document.getElementById("aiChat");
  const btnSearch = document.getElementById("btnSearch");
  const btnClear = document.getElementById("btnClear");
  const btnAnimateToggle = document.getElementById("btnAnimateToggle");

  // Ambil semua slot
  const slotEls = Array.from(document.querySelectorAll(".slot-group"));

  // Cek apakah elemen ada? (Untuk debugging)
  if (!btnSearch) {
    console.error("Tombol btnSearch tidak ditemukan di HTML!");
    return;
  }

  // Variabel Kontrol
  let animateOn = true;

  // Toggle Animasi
  if (btnAnimateToggle) {
    btnAnimateToggle.addEventListener("click", () => {
      animateOn = !animateOn;
      btnAnimateToggle.textContent = "Animasi: " + (animateOn ? "ON" : "OFF");
      if (!animateOn) carMarker.style.display = "none";
    });
  }

  // ==========================================
  // 2. LOGIKA GANTI LANTAI
  // ==========================================
  window.switchFloor = function (floorNum) {
    const layerF1 = document.getElementById("layer-f1");
    const layerF2 = document.getElementById("layer-f2");

    if (floorNum === 1) {
      if (layerF1) layerF1.style.display = "block";
      if (layerF2) layerF2.style.display = "none";
    } else {
      if (layerF1) layerF1.style.display = "none";
      if (layerF2) layerF2.style.display = "block";
    }

    // Update Tombol Active
    const btns = document.querySelectorAll(".btn-floor");
    btns.forEach((btn) => btn.classList.remove("active"));
    if (btns[floorNum - 1]) btns[floorNum - 1].classList.add("active");
  };

  // ==========================================
  // 3. GRAPH DATA (DENAH BARU: TENGAH & PINGGIR)
  // ==========================================
  const nodes = {
    // --- LANTAI 1 (Ground) ---
    F1_Start: { x: 550, y: 390, floor: 1, id: "F1_Start" },
    F1_Ent: { x: 550, y: 350, floor: 1, id: "F1_Ent" },
    F1_Right: { x: 550, y: 200, floor: 1, id: "F1_Right" },
    F1_RampUp: { x: 550, y: 50, floor: 1, id: "F1_RampUp" },
    F1_Top: { x: 300, y: 50, floor: 1, id: "F1_Top" },
    F1_Left: { x: 50, y: 200, floor: 1, id: "F1_Left" },
    F1_Exit: { x: 50, y: 350, floor: 1, id: "F1_Exit" },
    F1_Bot: { x: 300, y: 350, floor: 1, id: "F1_Bot" },

    // Akses Grid Tengah Lt 1
    F1_Center_Top: { x: 300, y: 120, floor: 1, id: "F1_Center_Top" },
    F1_Center_Bot: { x: 300, y: 250, floor: 1, id: "F1_Center_Bot" },

    // --- LANTAI 2 (Upper) ---
    F2_Arr: { x: 550, y: 50, floor: 2, id: "F2_Arr" },
    F2_Right: { x: 550, y: 200, floor: 2, id: "F2_Right" },
    F2_Bot: { x: 300, y: 350, floor: 2, id: "F2_Bot" },
    F2_Left: { x: 50, y: 200, floor: 2, id: "F2_Left" },
    F2_RampDown: { x: 50, y: 50, floor: 2, id: "F2_RampDown" },

    F2_CornerBR: { x: 550, y: 350, floor: 2, id: "F2_CornerBR" },
    F2_CornerBL: { x: 50, y: 350, floor: 2, id: "F2_CornerBL" },
    F2_CornerTL: { x: 50, y: 50, floor: 2, id: "F2_CornerTL" },
  };

  const edges = {
    // F1
    F1_Start: ["F1_Ent"],
    F1_Ent: ["F1_Right", "F1_Bot"],
    F1_Right: ["F1_RampUp", "F1_Center_Top", "F1_Center_Bot"],
    F1_RampUp: ["F1_Top", "F2_Arr"], // NAIK
    F1_Top: ["F1_Center_Top", "F1_Left"],
    F1_Center_Top: ["F1_Center_Bot", "F1_Left", "F1_Right"],
    F1_Center_Bot: ["F1_Bot", "F1_Left", "F1_Right"],
    F1_Bot: ["F1_Exit", "F1_Ent"],
    F1_Left: ["F1_Exit"],
    F1_Exit: [],

    // F2
    F2_Arr: ["F2_Right"],
    F2_Right: ["F2_CornerBR"],
    F2_CornerBR: ["F2_Bot"],
    F2_Bot: ["F2_CornerBL"],
    F2_CornerBL: ["F2_Left"],
    F2_Left: ["F2_CornerTL"],
    F2_CornerTL: ["F2_RampDown"],
    F2_RampDown: ["F1_Left"], // TURUN
  };

  // ==========================================
  // 4. API & DATABASE
  // ==========================================
  async function loadParkingData() {
    try {
      const response = await fetch("/api/slots");
      if (!response.ok) throw new Error("Server Error");
      const data = await response.json();
      slotEls.forEach((el) => {
        const code = el.getAttribute("data-slot");
        if (data[code]) el.setAttribute("data-status", data[code]);
      });
      console.log("Data loaded from DB");
    } catch (error) {
      console.warn("Mode Offline / DB Error:", error);
    }
  }
  loadParkingData();

  // Klik Slot
  slotEls.forEach((el) => {
    el.addEventListener("click", async () => {
      const cur = el.getAttribute("data-status");
      const code = el.getAttribute("data-slot");
      const next = cur === "empty" ? "occupied" : "empty";

      el.setAttribute("data-status", next);

      try {
        await fetch("/api/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: code, status: next }),
        });
      } catch (e) {
        console.error("Gagal update DB", e);
      }

      // Jika slot rekomendasi diambil, cari ulang
      if (el.classList.contains("best") && next === "occupied") {
        findParking();
      }
    });
  });

  // ==========================================
  // 5. ALGORITMA A*
  // ==========================================
  function heuristic(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function neighbors(id) {
    return edges[id] || [];
  }

  function aStar(startId, goalId) {
    const open = new Set([startId]);
    const cameFrom = {};
    const gScore = {};
    const fScore = {};
    for (const k in nodes) {
      gScore[k] = Infinity;
      fScore[k] = Infinity;
    }

    gScore[startId] = 0;
    fScore[startId] = heuristic(nodes[startId], nodes[goalId]);

    while (open.size) {
      let current = null,
        bestF = Infinity;
      open.forEach((nid) => {
        if (fScore[nid] < bestF) {
          bestF = fScore[nid];
          current = nid;
        }
      });

      if (current === goalId) {
        const path = [];
        let cur = current;
        while (cur) {
          path.push(nodes[cur]);
          cur = cameFrom[cur];
        }
        return path.reverse();
      }

      open.delete(current);
      for (const neigh of neighbors(current)) {
        let dist = heuristic(nodes[current], nodes[neigh]);
        if (nodes[current].floor !== nodes[neigh].floor) dist += 100; // Penalty beda lantai

        const tentative = gScore[current] + dist;
        if (tentative < gScore[neigh]) {
          cameFrom[neigh] = current;
          gScore[neigh] = tentative;
          fScore[neigh] = tentative + heuristic(nodes[neigh], nodes[goalId]);
          open.add(neigh);
        }
      }
    }
    return null;
  }

  function nearestNode(x, y, floor) {
    let best = null,
      min = Infinity;
    for (const k in nodes) {
      const n = nodes[k];
      if (n.floor !== floor) continue;
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < min) {
        min = d;
        best = n;
      }
    }
    return best;
  }

  function getSlotPos(slotEl) {
    const t = slotEl.getAttribute("transform");
    const m = /translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)/.exec(t);
    const f = parseInt(slotEl.getAttribute("data-floor") || "1");
    return { x: parseFloat(m[1]), y: parseFloat(m[2]), floor: f };
  }

  function buildRoute(startPt, targetPt) {
    const startNode = nearestNode(startPt.x, startPt.y, startPt.floor);
    const targetNode = nearestNode(targetPt.x, targetPt.y, targetPt.floor);
    if (!startNode || !targetNode) return null;

    const nodePath = aStar(startNode.id, targetNode.id);
    if (!nodePath) return null;

    const points = [startPt];
    nodePath.forEach((n) => points.push(n));
    points.push(targetPt);
    return points;
  }

  // ==========================================
  // 6. FUNGSI UTAMA (FIND PARKING)
  // ==========================================
  function resetUI() {
    routePath.setAttribute("d", "");
    routePath.classList.remove("show");
    resCode.textContent = "--";
    resCode.style.color = "var(--blue)";
    resDist.textContent = "...";
    resETA.textContent = "";
    slotEls.forEach((s) => s.classList.remove("best"));
    carMarker.style.display = "none";
    cancelAnimationFrame(animFrame);
  }

  if (btnClear) btnClear.addEventListener("click", resetUI);

  function findParking() {
    try {
      console.log("Mencari Parkir...");
      resetUI();

      // Start Point: Kanan Bawah
      const startPt = { x: 550, y: 390, floor: 1 };

      const empties = slotEls.filter(
        (s) => s.getAttribute("data-status") === "empty"
      );
      if (empties.length === 0) {
        resCode.textContent = "PENUH";
        resCode.style.color = "var(--danger)";
        resDist.textContent = "Full";
        aiChat.innerHTML = `<span style="color:red">Maaf!</span> Parkiran penuh.`;
        return;
      }

      let best = null,
        bestDist = Infinity,
        bestPath = null;

      empties.forEach((slot) => {
        const targetPos = getSlotPos(slot);
        const fullPath = buildRoute(startPt, targetPos);

        if (fullPath) {
          let dist = 0;
          for (let i = 0; i < fullPath.length - 1; i++) {
            let d = Math.hypot(
              fullPath[i].x - fullPath[i + 1].x,
              fullPath[i].y - fullPath[i + 1].y
            );
            if (fullPath[i].floor !== fullPath[i + 1].floor) d += 200;
            dist += d;
          }
          if (dist < bestDist) {
            bestDist = dist;
            best = slot;
            bestPath = fullPath;
          }
        }
      });

      if (best) {
        best.classList.add("best");
        const code = best.getAttribute("data-slot");
        const floor = best.getAttribute("data-floor");

        resCode.textContent = code;
        resDist.textContent = `±${Math.round(bestDist / 10)} m`;
        resETA.textContent = `Lantai ${floor}`;
        aiChat.innerHTML = `Slot <b>${code}</b> di Lantai ${floor}. Ikuti garis biru.`;

        window.switchFloor(parseInt(floor));
        drawPath(bestPath);
        if (animateOn) animateCar(bestPath);
      } else {
        alert("Gagal menemukan rute! Cek graph nodes.");
      }
    } catch (err) {
      console.error("ERROR di findParking:", err);
      alert("Terjadi error di script: " + err.message);
    }
  }

  // EVENT LISTENER TOMBOL CARI
  btnSearch.addEventListener("click", findParking);

  // Gambar Garis
  function drawPath(points) {
    if (!points || points.length < 2) return;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++)
      d += ` L ${points[i].x} ${points[i].y}`;
    routePath.setAttribute("d", d);
    setTimeout(() => routePath.classList.add("show"), 50);
  }

  // Animasi
  let animFrame = null;
  function animateCar(points) {
    const len = routePath.getTotalLength();
    if (!len) return;
    carMarker.style.display = "block";
    const start = performance.now();
    const dur = 3000;

    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const pt = routePath.getPointAtLength(t * len);
      carMarker.setAttribute("cx", pt.x);
      carMarker.setAttribute("cy", pt.y);
      if (t < 1) animFrame = requestAnimationFrame(step);
    }
    animFrame = requestAnimationFrame(step);
  }

  // Keyboard Shortcut
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter") findParking();
  });

  console.log("System Ready!");
});
