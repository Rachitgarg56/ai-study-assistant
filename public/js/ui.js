/**
 * UI Controller: Coordinates theme toggles, modal toggles, tabs, and terminal operations.
 */

// Theme Management
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = themeToggleBtn.querySelector('i');

// Settings Modal
const settingsToggleBtn = document.getElementById('settings-toggle');
const settingsModal = document.getElementById('settings-modal');
const settingsCloseBtn = document.getElementById('settings-close');
const mockModeCheckbox = document.getElementById('mock-mode-checkbox');
const apiKeyGroup = document.getElementById('api-key-group');
const apiKeyInput = document.getElementById('api-key-input');
const settingsSaveBtn = document.getElementById('settings-save-btn');
const currentModeBadge = document.getElementById('current-mode-badge');

// Terminal elements
const terminalScreen = document.getElementById('terminal-screen');
const clearTerminalBtn = document.getElementById('clear-terminal');

// Initialize State
let savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

let savedApiKey = localStorage.getItem('gemini_api_key') || '';
apiKeyInput.value = savedApiKey;

let isMockMode = localStorage.getItem('mock_mode') !== 'false'; // Default to true
mockModeCheckbox.checked = isMockMode;
updateMockModeUI();

// -------------------------------------------------------------
// EVENT LISTENERS
// -------------------------------------------------------------

// Theme Toggle
themeToggleBtn.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
  addTerminalLine('system', `Theme toggled to ${newTheme} mode.`);
});

// Settings Modal Toggle
settingsToggleBtn.addEventListener('click', () => {
  settingsModal.classList.add('open');
});

settingsCloseBtn.addEventListener('click', () => {
  settingsModal.classList.remove('open');
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.remove('open');
  }
});

mockModeCheckbox.addEventListener('change', () => {
  isMockMode = mockModeCheckbox.checked;
  updateMockModeUI();
});

// Save Settings
settingsSaveBtn.addEventListener('click', () => {
  localStorage.setItem('mock_mode', mockModeCheckbox.checked);
  localStorage.setItem('gemini_api_key', apiKeyInput.value.trim());
  
  settingsModal.classList.remove('open');
  
  addTerminalLine('system', `Configuration updated successfully.`);
  addTerminalLine('system', `Mock Mode is now ${mockModeCheckbox.checked ? 'ENABLED' : 'DISABLED'}.`);
  
  updateCurrentModeBadge();
});

// Clear Terminal
clearTerminalBtn.addEventListener('click', () => {
  clearTerminal();
});

// Tab Switcher Initialization
setupTabs();

// -------------------------------------------------------------
// HELPER FUNCTIONS
// -------------------------------------------------------------

function updateThemeIcon(theme) {
  if (theme === 'light') {
    themeIcon.className = 'fa-solid fa-sun';
  } else {
    themeIcon.className = 'fa-solid fa-moon';
  }
}

function updateMockModeUI() {
  if (mockModeCheckbox.checked) {
    apiKeyGroup.style.display = 'none';
  } else {
    apiKeyGroup.style.display = 'block';
  }
}

function updateCurrentModeBadge() {
  const isMock = localStorage.getItem('mock_mode') !== 'false';
  if (isMock) {
    currentModeBadge.textContent = 'Demo Mode';
    currentModeBadge.className = 'mode-badge';
  } else {
    currentModeBadge.textContent = 'Real Gemini';
    currentModeBadge.className = 'mode-badge real';
  }
}
updateCurrentModeBadge();

// Setup generic tabs switching
function setupTabs() {
  const tabsContainers = document.querySelectorAll('.tabs-control');
  
  tabsContainers.forEach(container => {
    const buttons = container.querySelectorAll('.tab-btn');
    
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        // Deactivate siblings in this tab bar
        buttons.forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        
        // Find associated panes
        const targetId = button.getAttribute('data-target');
        const parentContainer = container.nextElementSibling;
        const panes = parentContainer.querySelectorAll('.tab-pane');
        
        panes.forEach(pane => {
          if (pane.id === targetId) {
            pane.classList.add('active');
          } else {
            pane.classList.remove('active');
          }
        });
      });
    });
  });
}

// Terminal line writer
function addTerminalLine(type, text, details = null) {
  const line = document.createElement('div');
  line.className = `terminal-line ${type}-line`;
  
  if (type === 'system') {
    line.innerHTML = `<span class="prompt">></span> ${text}`;
  } else if (type === 'agent') {
    const { sender, receiver, command, preview } = details;
    line.className = 'terminal-line agent-message';
    
    line.innerHTML = `
      <span class="sender">[${sender}]</span> 
      <span class="arrow"><i class="fa-solid fa-right-long"></i></span> 
      <span class="receiver">[${receiver}]</span>: 
      <span class="command">${command}</span>
      ${preview ? `<span class="preview">${preview}</span>` : ''}
    `;
  }
  
  terminalScreen.appendChild(line);
  terminalScreen.scrollTop = terminalScreen.scrollHeight;
}

function clearTerminal() {
  terminalScreen.innerHTML = `
    <div class="terminal-line system-line">
      <span class="prompt">></span> Logs cleared. Terminal ready.
    </div>
  `;
}

// Agent node states
function highlightAgentNode(agentName) {
  const node = document.getElementById(`node-${agentName}`);
  if (node) {
    node.classList.remove('completed-agent');
    node.classList.add('active-agent');
  }
}

function completeAgentNode(agentName) {
  const node = document.getElementById(`node-${agentName}`);
  if (node) {
    node.classList.remove('active-agent');
    node.classList.add('completed-agent');
  }
}

function resetAgentNodes() {
  const nodes = document.querySelectorAll('.agent-node');
  nodes.forEach(node => {
    node.className = 'agent-node';
  });
}

// -------------------------------------------------------------
// STUDY MATERIAL RENDERING UTILS
// -------------------------------------------------------------

function renderSummary(summaryData) {
  const notesArea = document.querySelector('.summary-notes-area');
  notesArea.innerHTML = '';
  
  if (!summaryData || summaryData.length === 0) {
    notesArea.innerHTML = '<p>No study notes available.</p>';
    return;
  }
  
  summaryData.forEach(section => {
    const card = document.createElement('div');
    card.className = 'summary-section-card';
    
    const title = document.createElement('h3');
    title.textContent = section.sectionTitle;
    card.appendChild(title);
    
    const list = document.createElement('ul');
    section.bullets.forEach(bullet => {
      const li = document.createElement('li');
      li.textContent = bullet;
      list.appendChild(li);
    });
    card.appendChild(list);
    
    notesArea.appendChild(card);
  });
}

function renderConcepts(conceptsData) {
  const conceptsList = document.querySelector('.concepts-list');
  conceptsList.innerHTML = '';
  
  if (!conceptsData || conceptsData.length === 0) {
    conceptsList.innerHTML = '<p>No key terms extracted.</p>';
    return;
  }
  
  conceptsData.forEach(item => {
    const conceptItem = document.createElement('div');
    conceptItem.className = 'concept-item';
    
    const h4 = document.createElement('h4');
    h4.textContent = item.concept;
    conceptItem.appendChild(h4);
    
    const p = document.createElement('p');
    p.textContent = item.definition;
    conceptItem.appendChild(p);
    
    conceptsList.appendChild(conceptItem);
  });
}
