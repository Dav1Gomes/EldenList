const grid = document.getElementById("bossesGrid");
const modal = document.getElementById("bossModal");
const closeModalBtn = document.getElementById("closeModal");
const searchInput = document.getElementById("searchInput");

let bosses = [];
let statusMap = {};

function openModal(boss) {
  document.getElementById("modalName").textContent = boss.name;
  document.getElementById("modalImage").src = boss.image;
  document.getElementById("modalDescription").textContent = boss.description || "Sem descrição.";
  document.getElementById("modalLocation").textContent = boss.location || "Desconhecida";
  document.getElementById("modalDrops").textContent = boss.drops?.join(", ") || "Nenhum";
  document.getElementById("modalHealth").textContent = boss.health || "Desconhecido";

  modal.classList.remove("hidden");
}

closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") modal.classList.add("hidden");
});

function loadBossStatus() {
  return JSON.parse(localStorage.getItem("bossStatus")) || {};
}

function saveBossStatus(status) {
  localStorage.setItem("bossStatus", JSON.stringify(status));
}

const CACHE_KEY = "bossesCache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; 

function loadBossesCache() {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_DURATION) return null;
    return parsed.data;
  } catch (e) {
    return null;
  }
}

function saveBossesCache(data) {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ timestamp: Date.now(), data })
  );
}

function createBossCard(boss) {
  const card = document.createElement("div");
  card.className = "boss-card";

  const image = document.createElement("img");
  image.src = boss.image;
  image.alt = boss.name;

  const name = document.createElement("p");
  name.className = "boss-name";
  name.textContent = boss.name;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = !!statusMap[boss.id];
  checkbox.title = "Marcar como feito";

  checkbox.addEventListener("change", () => {
    statusMap[boss.id] = checkbox.checked;
    saveBossStatus(statusMap);
    atualizarProgressoFeitos(); 
  });

  card.appendChild(image);
  card.appendChild(name);
  card.appendChild(checkbox);

  card.addEventListener("click", (e) => {
    if (e.target !== checkbox) openModal(boss);
  });

  return card;
}

function renderBosses(list, emptyMessage) {
  grid.innerHTML = "";

  if (!list.length) {
    if (emptyMessage) grid.innerHTML = `<p>${emptyMessage}</p>`;
    return;
  }

  list.forEach((boss) => grid.appendChild(createBossCard(boss)));
}

function setupSearch() {
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    const filtered = bosses.filter((b) => b.name.toLowerCase().includes(term));
    renderBosses(filtered, "Nenhum boss encontrado.");
  });
}

document.getElementById("btnFeitos").addEventListener("click", () => {
  const feitos = bosses.filter((b) => statusMap[b.id]);
  renderBosses(feitos, "Nenhum boss marcado como feito ainda.");
});

document.getElementById("btnNaoFeitos").addEventListener("click", () => {
  const naoFeitos = bosses.filter((b) => !statusMap[b.id]);
  renderBosses(naoFeitos, "Todos os bosses já foram marcados como feitos!");
});

document.getElementById("btnExportar").addEventListener("click", () => {
  const feitos = Object.keys(statusMap).filter((key) => statusMap[key]);
  const nomes = bosses
    .filter((b) => feitos.includes(b.id))
    .map((b) => b.name)
    .join("\n");

  const blob = new Blob([nomes], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "bosses_feitos.txt";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

document.getElementById("btnImportar").addEventListener("click", () => {
  document.getElementById("importarArquivo").click();
});

document.getElementById("importarArquivo").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const nomesImportados = reader.result.split("\n").map((n) => n.trim().toLowerCase());

    bosses.forEach((boss) => {
      if (nomesImportados.includes(boss.name.toLowerCase())) {
        statusMap[boss.id] = true;
      }
    });

    saveBossStatus(statusMap);
    location.reload();
  };
  reader.readAsText(file);
});

async function loadAllBosses() {
  let page = 0;
  let allBosses = [];
  const limit = 500;

  while (true) {
    const res = await fetch(`https://eldenring.fanapis.com/api/bosses?limit=${limit}&page=${page}`);
    const data = await res.json();

    if (!data.data || data.data.length === 0) break;

    allBosses = allBosses.concat(data.data);
    page++;
  }

  const namesSet = new Set();
  return allBosses.filter((b) => {
    if (namesSet.has(b.name)) return false;
    namesSet.add(b.name);
    return true;
  });
}

function atualizarProgressoBarra(qtdFeitos, total) {
  const percentual = Math.round((qtdFeitos / total) * 100);
  document.getElementById('barraProgresso').style.width = percentual + '%';
  document.getElementById('textoProgresso').innerText = `${percentual}% concluído`;
}

function atualizarProgressoFeitos() {
  const status = loadBossStatus();
  let feitos = 0;

  bosses.forEach((boss) => {
    if (status[boss.id]) feitos++;
  });

  const total = bosses.length;
  const porcentagem = ((feitos / total) * 100).toFixed(1);
  document.getElementById("textoProgresso").textContent = `${feitos} de ${total} bosses feitos (${porcentagem}%)`;
  document.getElementById("barraProgresso").style.width = `${porcentagem}%`;
}


async function init() {
  bosses = await loadAllBosses();
  statusMap = loadBossStatus();
  renderBosses(bosses);
  setupSearch();
  atualizarProgressoFeitos();
}

init();
