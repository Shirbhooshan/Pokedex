// script.js - fixed version

let allPokemon = [];
let currentPokemonId = 6;

function capitalizeFirst(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}
function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

// Clock
function updateTime() {
  const now = new Date();
  const hours = now.getHours() % 12 || 12;
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";
  setText("currentTime", `${hours}:${minutes} ${ampm}`);
}
updateTime();
setInterval(updateTime, 60000);

// Load all pokemons list
async function loadPokemonList() {
  try {
    const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0");
    const data = await res.json();
    allPokemon = data.results || [];
    document.getElementById("totalCount").textContent =
      data.count || allPokemon.length || "—";
    displayPokemonList(allPokemon.slice(0, 1000));
    loadPokemon(currentPokemonId);
  } catch (err) {
    document.getElementById("pokemonList").innerHTML =
      "<div class='loading'>Failed to load</div>";
    console.error("Failed loadPokemonList", err);
  }
}

// Show pokemon list
function displayPokemonList(pokemonArray) {
  const listContainer = document.getElementById("pokemonList");
  listContainer.innerHTML = "";
  if (!pokemonArray || pokemonArray.length === 0) {
    listContainer.innerHTML = "<div class='loading'>No results</div>";
    return;
  }

  pokemonArray.forEach((pokemon) => {
    let pokemonId = null;
    if (pokemon.url) {
      const match = pokemon.url.match(/\/pokemon\/(\d+)\/?$/);
      if (match) pokemonId = parseInt(match[1], 10);
    }
    if (!pokemonId) {
      const idx = allPokemon.findIndex((p) => p.name === pokemon.name);
      pokemonId = idx === -1 ? null : idx + 1;
    }
    if (!pokemonId) return;

    const item = document.createElement("div");
    item.className = "pokemon-item";
    item.innerHTML = `
      <div class="pokemon-avatar">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png" alt="${pokemon.name}">
      </div>
      <div class="pokemon-item-info">
        <div class="pokemon-item-number">No. ${String(pokemonId).padStart(3, "0")}</div>
        <div class="pokemon-item-name">${pokemon.name}</div>
      </div>
    `;
    item.onclick = () => {
      currentPokemonId = pokemonId;
      loadPokemon(pokemonId);
    };
    listContainer.appendChild(item);
  });
}

// Load single pokemon
async function loadPokemon(id) {
  try {
    const pRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!pRes.ok) throw new Error("Pokemon not found");
    const pokemon = await pRes.json();

    const sRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    const species = await sRes.json();

    let evoChain = [];
    if (species.evolution_chain && species.evolution_chain.url) {
      try {
        const eRes = await fetch(species.evolution_chain.url);
        const eData = await eRes.json();
        evoChain = parseEvolutionChain(eData.chain);
      } catch (e) {
        console.warn("Failed evo fetch", e);
      }
    }

    displayPokemon(pokemon, species, evoChain);
    updateActiveItem(id);
  } catch (err) {
    console.error("Error loading Pokemon:", err);
    alert("Could not load that Pokémon. Try another.");
  }
}

// Parse evolution chain
function parseEvolutionChain(chainNode) {
  const arr = [];
  function walk(node) {
    if (!node) return;
    if (node.species && node.species.name) arr.push(node.species.name);
    if (node.evolves_to && node.evolves_to.length) {
      node.evolves_to.forEach((child) => walk(child));
    }
  }
  walk(chainNode);
  return [...new Set(arr)];
}

// Display pokemon data
function displayPokemon(pokemon, species, evoChain) {
  setText("pokemonNumber", String(pokemon.id).padStart(3, "0"));
  setText("pokemonName", capitalizeFirst(pokemon.name));

  // types
  const typesContainer = document.getElementById("typeIcons");
  typesContainer.innerHTML = "";
  pokemon.types.forEach((t) => {
    const b = document.createElement("div");
    b.className = `type-badge type-${t.type.name}`;
    b.textContent = t.type.name.toUpperCase();
    typesContainer.appendChild(b);
  });

  // image
  document.getElementById("pokemonImg").src =
    pokemon.sprites.other["official-artwork"].front_default;

  // height / weight
  const heightInInches = pokemon.height * 3.937;
  const feet = Math.floor(heightInInches / 12);
  const inches = Math.round(heightInInches % 12);
  setText("pokemonHeight", `${feet}'${inches}"`);

  const weightInLbs = (pokemon.weight * 0.220462).toFixed(1);
  setText("pokemonWeight", `${weightInLbs} lbs.`);

  // flavor text
  const flavorText = (species.flavor_text_entries || []).find(
    (e) => e.language && e.language.name === "en"
  );
  if (flavorText) {
    const clean = flavorText.flavor_text.replace(/\f|\n|\r/g, " ");
    document.getElementById("pokemonDescription").textContent = clean;
  } else {
    document.getElementById("pokemonDescription").textContent =
      "No description available.";
  }

  // form count
  const speciesName = species.name;
  const totalForms = evoChain.length || 1;
  const currentIndex = evoChain.findIndex((n) => n === speciesName);
  const formIndex = currentIndex === -1 ? 1 : currentIndex + 1;
  setText("currentPage", formIndex);
  setText("totalForms", totalForms);
}

// Highlight active item
function updateActiveItem(id) {
  const items = document.querySelectorAll(".pokemon-item");
  items.forEach((item, index) => {
    if (index + 1 === id) {
      item.classList.add("active");
      try {
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (e) {}
    } else {
      item.classList.remove("active");
    }
  });
}

// Search
document.getElementById("searchBox").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) {
    displayPokemonList(allPokemon.slice(0, 1000));
    return;
  }
  if (/^\d+$/.test(q)) {
    const id = parseInt(q, 10);
    if (id >= 1 && id <= (allPokemon.length || 100000)) {
      loadPokemon(id);
    }
    const filtered = allPokemon.filter(
      (p, idx) =>
        (idx + 1).toString().includes(q) || p.name.includes(q.toLowerCase())
    );
    displayPokemonList(filtered.slice(0, 1000));
    return;
  }
  const filtered = allPokemon.filter((p) =>
    p.name.toLowerCase().includes(q)
  );
  displayPokemonList(filtered.slice(0, 1000));
});

// init
loadPokemonList();
