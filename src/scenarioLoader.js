const path = require('path');
const fs = require('fs').promises;

const scenarios = {}; // Cache

const SCENARIOS_DIR = 'scenario';
const DEFAULT_SCENARIO = 'scenario_lgbtqia_V2.json';

// NOTE: This is the original, full mapping to avoid regressions.
const scenarioMapping = {
  'lgbtqia': 'scenario_lgbtqia_V2.json',
  'anthology': 'anthology_completeh7.json',
  'parcours-vie': 'parcours-vie-json-imagais.json',
  'lea': 'lea_scenario.json',
  'aglae': 'aglae_scenario.json',
  'pornographie': 'pornographie_scenario.json',
  'consentement': 'consentement_scenario.json',
  'stade_foot': 'stade_foot_scenario.json'
};

async function loadScenario(scenarioFile) {
  if (scenarios[scenarioFile]) {
    return scenarios[scenarioFile];
  }
  try {
    // NOTE: Corrected path logic, assuming this file is in src/
    let filePath = path.join(__dirname, '..', 'public', SCENARIOS_DIR, scenarioFile);
    try {
      await fs.access(filePath);
    } catch {
      filePath = path.join(__dirname, '..', 'public', scenarioFile);
    }
    const data = await fs.readFile(filePath, 'utf-8');
    const scenario = JSON.parse(data);
    scenarios[scenarioFile] = scenario;
    console.log(`Scénario chargé: ${scenario.scenario_info.title} (${scenarioFile})`);
    return scenario;
  } catch (error) {
    console.error(`Erreur chargement scénario ${scenarioFile}:`, error);
    throw new Error(`Impossible de charger le scénario: ${scenarioFile}`);
  }
}

async function preloadScenarios() {
  console.log('Préchargement des scénarios...');
  for (const [key, file] of Object.entries(scenarioMapping)) {
    try {
      await loadScenario(file);
      console.log(`✓ ${key}: ${file}`);
    } catch (error) {
      // Non-blocking error, just a warning if a scenario is missing
      console.warn(`✗ ${key}: ${error.message}`);
    }
  }
  console.log(`${Object.keys(scenarios).length} scénarios en cache`);
}

module.exports = {
  scenarios,
  scenarioMapping,
  DEFAULT_SCENARIO,
  loadScenario,
  preloadScenarios,
};
