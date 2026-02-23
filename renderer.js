const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Load i18n
let i18nData = {};
let currentLang = 'en';

// State
let iucnData = null;
let biomeDataI18n = null;
let efgDataI18n = null;
let selectedRealms = [];
let selectedBiomes = [];
let selectedEFGs = [];
let collapsedGroups = new Set();

// Initialize
async function init() {
  try {
    // Load i18n
    const i18nPath = path.join(__dirname, 'i18n.json');
    i18nData = JSON.parse(fs.readFileSync(i18nPath, 'utf8'));

    // Load IUCN data
    iucnData = await ipcRenderer.invoke('load-iucn-data');

    // Load internationalized Biome and EFG data
    const biomeI18nPath = path.join(__dirname, 'data', 'biome_data_i18n.json');
    const efgI18nPath = path.join(__dirname, 'data', 'efg_data_i18n.json');

    if (fs.existsSync(biomeI18nPath)) {
      biomeDataI18n = JSON.parse(fs.readFileSync(biomeI18nPath, 'utf8'));
      console.log('Loaded internationalized Biome data');
    }

    if (fs.existsSync(efgI18nPath)) {
      efgDataI18n = JSON.parse(fs.readFileSync(efgI18nPath, 'utf8'));
      console.log('Loaded internationalized EFG data');
    }

    renderRealms();
    setupEventListeners();
    updateLanguage();
  } catch (error) {
    console.error('Failed to initialize:', error);
    alert('Failed to load data. Please check the data files.');
  }
}

// i18n helper
function t(key, params = {}) {
  let text = i18nData[currentLang]?.[key] || i18nData['en']?.[key] || key;
  Object.keys(params).forEach(param => {
    text = text.replace(`{{${param}}}`, params[param]);
  });
  return text;
}

// Update language
function updateLanguage() {
  document.getElementById('app-title').textContent = t('app_title');
  document.getElementById('app-subtitle').textContent = t('app_subtitle');
  document.getElementById('step1-title').textContent = t('step1_title');
  document.getElementById('step1-subtitle').textContent = t('step1_subtitle');
  document.getElementById('step2-title').textContent = t('step2_title');
  document.getElementById('step2-subtitle').textContent = t('step2_subtitle');
  document.getElementById('step3-title').textContent = t('step3_title');
  document.getElementById('step3-subtitle').textContent = t('step3_subtitle');
  document.getElementById('step4-title').textContent = t('step4_title');
  document.getElementById('step4-subtitle').textContent = t('step4_subtitle');

  // Update all elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  // Update count labels
  document.getElementById('realm-count-label').textContent = t('selected_count', { count: '' }).replace('0', '').trim();
  document.getElementById('biome-count-label').textContent = t('selected_count', { count: '' }).replace('0', '').trim();
  document.getElementById('efg-count-label').textContent = t('selected_count', { count: '' }).replace('0', '').trim();

  // Re-render if data is loaded
  if (iucnData) {
    if (selectedRealms.length > 0) {
      renderBiomes();
    }
    if (selectedBiomes.length > 0) {
      renderEFGs();
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  // Language switcher
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentLang = btn.dataset.lang;
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateLanguage();
    });
  });

  // Step buttons
  document.getElementById('btn-confirm-realm').addEventListener('click', confirmRealms);
  document.getElementById('btn-confirm-biome').addEventListener('click', confirmBiomes);
  document.getElementById('btn-to-results').addEventListener('click', showResults);
  document.getElementById('btn-back-to-selection').addEventListener('click', backToSelection);
  document.getElementById('btn-reset-all').addEventListener('click', resetAll);
  document.getElementById('btn-reset-header').addEventListener('click', resetAll);
  document.getElementById('btn-export-json-results').addEventListener('click', exportJSON);
  document.getElementById('btn-export-csv-results').addEventListener('click', exportCSV);
}

// Render Realms
function renderRealms() {
  const container = document.getElementById('realm-list');
  container.innerHTML = '';

  Object.values(iucnData.realms).forEach(realm => {
    const card = document.createElement('div');
    card.className = 'item-card';
    if (selectedRealms.find(r => r.code === realm.code)) {
      card.classList.add('checked');
    }

    card.innerHTML = `
      <div class="item-checkbox"></div>
      <div class="item-content">
        <div class="item-code">${realm.code} - ${t('realm_' + realm.code)}</div>
        <div class="item-meta">${t('biomes_count', { count: Object.keys(realm.biomes).length })}</div>
      </div>
      <a href="#" class="item-link" title="${t('tooltip_view_more')}" data-url="https://global-ecosystems.org/explore/realms/${realm.code}">🔗</a>
    `;

    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('item-link')) {
        toggleRealm(realm, card);
      }
    });

    // Handle link click
    const link = card.querySelector('.item-link');
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      require('electron').shell.openExternal(e.target.dataset.url);
    });
    card.addEventListener('mouseenter', (e) => showTooltip(e, realm, 'realm'));

    container.appendChild(card);
  });

  updateRealmCount();
}

// Toggle Realm
function toggleRealm(realm, card) {
  const index = selectedRealms.findIndex(r => r.code === realm.code);

  if (index > -1) {
    selectedRealms.splice(index, 1);
    card.classList.remove('checked');
  } else {
    selectedRealms.push(realm);
    card.classList.add('checked');
  }

  updateRealmCount();
}

// Update Realm Count
function updateRealmCount() {
  document.getElementById('realm-count').textContent = selectedRealms.length;
  document.getElementById('btn-confirm-realm').disabled = selectedRealms.length === 0;
}

// Confirm Realms
function confirmRealms() {
  if (selectedRealms.length === 0) return;

  document.getElementById('step-biome').classList.remove('inactive');
  renderBiomes();
}

// Render Biomes
function renderBiomes() {
  const container = document.getElementById('biome-list');
  container.innerHTML = '';

  selectedRealms.forEach(realm => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group-container';

    const groupHeader = document.createElement('div');
    groupHeader.className = 'group-header';
    const isCollapsed = collapsedGroups.has(`biome-${realm.code}`);

    groupHeader.innerHTML = `
      <div class="group-title">${realm.code} - ${t('realm_' + realm.code)}</div>
      <div class="group-toggle">
        <span>${isCollapsed ? t('expand') : t('collapse')}</span>
        <span>${isCollapsed ? '▶' : '▼'}</span>
      </div>
    `;

    groupHeader.addEventListener('click', () => toggleGroup(`biome-${realm.code}`, groupContent, groupHeader));

    const groupContent = document.createElement('div');
    groupContent.className = 'group-content';
    if (!isCollapsed) {
      groupContent.classList.add('expanded');
    }

    Object.values(realm.biomes).forEach(biome => {
      const card = document.createElement('div');
      card.className = 'item-card';
      if (selectedBiomes.find(b => b.code === biome.code)) {
        card.classList.add('checked');
      }

      // Get internationalized biome name
      const biomeI18n = biomeDataI18n?.[biome.code];
      const biomeInfo = biomeI18n?.i18n?.[currentLang] || {};
      const biomeName = biomeInfo.name || biome.code;

      card.innerHTML = `
        <div class="item-checkbox"></div>
        <div class="item-content">
          <div class="item-code">${biome.code}</div>
          <div class="item-name">${biomeName}</div>
          <div class="item-meta">${t('efgs_count', { count: biome.efgs.length })}</div>
        </div>
        <a href="#" class="item-link" title="${t('tooltip_view_more')}" data-url="https://global-ecosystems.org/explore/biomes/${biome.code}">🔗</a>
      `;

      card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('item-link')) {
          e.stopPropagation();
          toggleBiome(biome, card, realm);
        }
      });

      // Handle link click
      const link = card.querySelector('.item-link');
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        require('electron').shell.openExternal(e.target.dataset.url);
      });
      card.addEventListener('mouseenter', (e) => showTooltip(e, biome, 'biome'));

      groupContent.appendChild(card);
    });

    groupDiv.appendChild(groupHeader);
    groupDiv.appendChild(groupContent);
    container.appendChild(groupDiv);
  });

  updateBiomeCount();
}

// Toggle Biome
function toggleBiome(biome, card, realm) {
  const index = selectedBiomes.findIndex(b => b.code === biome.code);

  if (index > -1) {
    selectedBiomes.splice(index, 1);
    card.classList.remove('checked');
  } else {
    selectedBiomes.push({ ...biome, realmCode: realm.code });
    card.classList.add('checked');
  }

  updateBiomeCount();
}

// Update Biome Count
function updateBiomeCount() {
  document.getElementById('biome-count').textContent = selectedBiomes.length;
  document.getElementById('btn-confirm-biome').disabled = selectedBiomes.length === 0;
}

// Confirm Biomes
function confirmBiomes() {
  if (selectedBiomes.length === 0) return;

  document.getElementById('step-efg').classList.remove('inactive');
  renderEFGs();
}

// Render EFGs
function renderEFGs() {
  const container = document.getElementById('efg-list');
  container.innerHTML = '';

  selectedBiomes.forEach(biome => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group-container';

    const groupHeader = document.createElement('div');
    groupHeader.className = 'group-header';
    const isCollapsed = collapsedGroups.has(`efg-${biome.code}`);

    // Get internationalized biome name
    const biomeI18n = biomeDataI18n?.[biome.code];
    const biomeName = biomeI18n?.i18n?.[currentLang]?.name || biome.code;

    groupHeader.innerHTML = `
      <div class="group-title">${biome.code} - ${biomeName}</div>
      <div class="group-toggle">
        <span>${isCollapsed ? t('expand') : t('collapse')}</span>
        <span>${isCollapsed ? '▶' : '▼'}</span>
      </div>
    `;

    groupHeader.addEventListener('click', () => toggleGroup(`efg-${biome.code}`, groupContent, groupHeader));

    const groupContent = document.createElement('div');
    groupContent.className = 'group-content';
    if (!isCollapsed) {
      groupContent.classList.add('expanded');
    }

    biome.efgs.forEach(efg => {
      const card = document.createElement('div');
      card.className = 'item-card';
      if (selectedEFGs.find(e => e.code === efg.code)) {
        card.classList.add('checked');
      }

      // Get internationalized EFG name
      const efgI18n = efgDataI18n?.[efg.code];
      const efgInfo = efgI18n?.i18n?.[currentLang] || {};
      const efgName = efgInfo.name || efg.name;

      card.innerHTML = `
        <div class="item-checkbox"></div>
        <div class="item-content">
          <div class="item-code">${efg.code}</div>
          <div class="item-name">${efgName}</div>
        </div>
        <a href="#" class="item-link" title="${t('tooltip_view_more')}" data-url="${efg.url || 'https://global-ecosystems.org/explore/groups/' + efg.code}">🔗</a>
      `;

      card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('item-link')) {
          e.stopPropagation();
          toggleEFG(efg, card, biome);
        }
      });

      // Handle link click
      const link = card.querySelector('.item-link');
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        require('electron').shell.openExternal(e.target.dataset.url);
      });
      card.addEventListener('mouseenter', (e) => showTooltip(e, efg, 'efg'));

      groupContent.appendChild(card);
    });

    groupDiv.appendChild(groupHeader);
    groupDiv.appendChild(groupContent);
    container.appendChild(groupDiv);
  });

  updateEFGCount();
}

// Toggle EFG
function toggleEFG(efg, card, biome) {
  const index = selectedEFGs.findIndex(e => e.code === efg.code);

  if (index > -1) {
    selectedEFGs.splice(index, 1);
    card.classList.remove('checked');
  } else {
    selectedEFGs.push({ ...efg, biomeCode: biome.code, realmCode: biome.realmCode });
    card.classList.add('checked');
  }

  updateEFGCount();
}

// Update EFG Count
function updateEFGCount() {
  document.getElementById('efg-count').textContent = selectedEFGs.length;
  document.getElementById('btn-to-results').disabled = selectedEFGs.length === 0;
}

// Toggle Group
function toggleGroup(groupId, contentEl, headerEl) {
  if (collapsedGroups.has(groupId)) {
    collapsedGroups.delete(groupId);
    contentEl.classList.add('expanded');
    headerEl.querySelector('.group-toggle span:first-child').textContent = t('collapse');
    headerEl.querySelector('.group-toggle span:last-child').textContent = '▼';
  } else {
    collapsedGroups.add(groupId);
    contentEl.classList.remove('expanded');
    headerEl.querySelector('.group-toggle span:first-child').textContent = t('expand');
    headerEl.querySelector('.group-toggle span:last-child').textContent = '▶';
  }
}

// Show Results
function showResults() {
  document.getElementById('selection-view').style.display = 'none';
  document.getElementById('results-view').style.display = 'flex';
  renderResults();
}

// Back to Selection
function backToSelection() {
  document.getElementById('results-view').style.display = 'none';
  document.getElementById('selection-view').style.display = 'grid';
}

// Render Results
function renderResults() {
  const container = document.getElementById('results-list');
  container.innerHTML = '';

  if (selectedEFGs.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #9ca3af;">No EFGs selected</p>';
    return;
  }

  selectedEFGs.forEach((efg, index) => {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.draggable = true;
    item.dataset.index = index;

    // Get internationalized EFG name
    const efgI18n = efgDataI18n?.[efg.code];
    const efgName = efgI18n?.i18n?.[currentLang]?.name || efg.name;

    item.innerHTML = `
      <div class="drag-handle">⋮⋮</div>
      <div class="result-content">
        <div class="result-code">${efg.code}</div>
        <div class="result-name">${efgName}</div>
        <div class="result-meta">${efg.realmCode} → ${efg.biomeCode}</div>
      </div>
      <button class="result-delete" data-i18n="delete">${t('delete')}</button>
    `;

    // Drag events
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);

    // Delete button
    item.querySelector('.result-delete').addEventListener('click', () => deleteEFG(index));

    container.appendChild(item);
  });
}

// Drag and Drop handlers
let draggedIndex = null;

function handleDragStart(e) {
  draggedIndex = parseInt(e.target.dataset.index);
  e.target.classList.add('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  e.preventDefault();
  const dropIndex = parseInt(e.currentTarget.dataset.index);

  if (draggedIndex !== null && draggedIndex !== dropIndex) {
    const [removed] = selectedEFGs.splice(draggedIndex, 1);
    selectedEFGs.splice(dropIndex, 0, removed);
    renderResults();
  }
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedIndex = null;
}

// Delete EFG
function deleteEFG(index) {
  selectedEFGs.splice(index, 1);
  renderResults();
  updateEFGCount();

  // Update EFG list if visible
  if (document.getElementById('step-efg').classList.contains('inactive') === false) {
    renderEFGs();
  }
}

// Reset All
function resetAll() {
  if (!confirm('Are you sure you want to reset all selections?')) return;

  selectedRealms = [];
  selectedBiomes = [];
  selectedEFGs = [];
  collapsedGroups.clear();

  document.getElementById('step-biome').classList.add('inactive');
  document.getElementById('step-efg').classList.add('inactive');

  renderRealms();
  document.getElementById('biome-list').innerHTML = '';
  document.getElementById('efg-list').innerHTML = '';

  backToSelection();
}

// Export JSON
async function exportJSON() {
  const data = {
    realms: selectedRealms.map(r => ({
      code: r.code,
      url: `https://global-ecosystems.org/explore/realms/${r.code}`
    })),
    biomes: selectedBiomes.map(b => ({
      code: b.code,
      realm: b.realmCode,
      url: `https://global-ecosystems.org/explore/biomes/${b.code}`
    })),
    efgs: selectedEFGs.map(e => ({
      code: e.code,
      name: e.name,
      biome: e.biomeCode,
      realm: e.realmCode,
      short_description: e.short_description,
      url: `https://global-ecosystems.org/explore/groups/${e.code}`,
      biome_url: `https://global-ecosystems.org/explore/biomes/${e.biomeCode}`,
      realm_url: `https://global-ecosystems.org/explore/realms/${e.realmCode}`
    })),
    exported_at: new Date().toISOString()
  };

  const result = await ipcRenderer.invoke('export-json', data);
  if (result.success) {
    alert(`Exported to: ${result.path}`);
  }
}

// Export CSV
async function exportCSV() {
  const headers = ['Code', 'Name', 'Realm', 'Biome', 'Short Description', 'EFG URL', 'Biome URL', 'Realm URL'];
  const rows = selectedEFGs.map(e => [
    e.code,
    e.name,
    e.realmCode,
    e.biomeCode,
    e.short_description || '',
    `https://global-ecosystems.org/explore/groups/${e.code}`,
    `https://global-ecosystems.org/explore/biomes/${e.biomeCode}`,
    `https://global-ecosystems.org/explore/realms/${e.realmCode}`
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const result = await ipcRenderer.invoke('export-csv', csv);
  if (result.success) {
    alert(`Exported to: ${result.path}`);
  }
}

// Tooltip
function showTooltip(e, item, type) {
  const tooltip = document.getElementById('tooltip');
  let content = '';

  console.log('showTooltip - currentLang:', currentLang, 'type:', type, 'code:', item.code);

  if (type === 'realm') {
    content = `
      <h3>${item.code} - ${t('realm_' + item.code)}</h3>
      <p>${t('realm_desc_' + item.code)}</p>
    `;
  } else if (type === 'biome') {
    // Use internationalized biome data if available
    const biomeI18n = biomeDataI18n?.[item.code];
    const biomeInfo = biomeI18n?.i18n?.[currentLang] || {};

    console.log('Biome tooltip - biomeI18n:', !!biomeI18n, 'biomeInfo:', biomeInfo);

    content = `
      <h3>${item.code}</h3>
      <h4>${biomeInfo.name || item.code}</h4>
    `;

    // Show images at the top if available
    if (biomeI18n?.images && biomeI18n.images.length > 0) {
      const imagesToShow = biomeI18n.images.filter(img => img.url).slice(0, 2);
      if (imagesToShow.length > 0) {
        content += '<div class="tooltip-images">';
        imagesToShow.forEach(img => {
          content += `<img src="${img.url}" alt="${img.alt || item.code}" />`;
        });
        content += '</div>';
      }
    }

    if (biomeInfo.description) {
      content += `<p>${biomeInfo.description}</p>`;
    }

  } else if (type === 'efg') {
    // Use internationalized EFG data if available
    const efgI18n = efgDataI18n?.[item.code];
    const efgInfo = efgI18n?.i18n?.[currentLang] || {};

    content = `
      <h3>${item.code}</h3>
      <h4>${efgInfo.name || item.name}</h4>
    `;

    // Show images at the top if available
    if (efgI18n?.images && efgI18n.images.length > 0) {
      const imagesToShow = efgI18n.images.filter(img => img.url).slice(0, 2);
      if (imagesToShow.length > 0) {
        content += '<div class="tooltip-images">';
        imagesToShow.forEach(img => {
          content += `<img src="${img.url}" alt="${img.alt || item.code}" />`;
        });
        content += '</div>';
      }
    }

    if (efgInfo.description) {
      content += `<p>${efgInfo.description}</p>`;
    }
  }

  tooltip.innerHTML = '<button class="tooltip-close" onclick="hideTooltip()">&times;</button>' + content;
  tooltip.classList.add('show');

  const rect = e.target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  let left = rect.right + 10;
  let top = rect.top;

  if (left + tooltipRect.width > window.innerWidth) {
    left = rect.left - tooltipRect.width - 10;
  }

  if (top + tooltipRect.height > window.innerHeight) {
    top = window.innerHeight - tooltipRect.height - 10;
  }

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

function hideTooltip() {
  document.getElementById('tooltip').classList.remove('show');
}

// Start
init();
