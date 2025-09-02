const path = require('path');
const fs = require('fs').promises;

// Cache pour les scénarios chargés
const scenarios = {};

// Configuration des scénarios
const SCENARIOS_DIR = 'scenario';
const DEFAULT_SCENARIO = 'scenario_lgbtqia_V2.json';

// Mapping des noms de niveaux vers les fichiers de scénarios
const scenarioMapping = {
  'lgbtqia': 'scenario_lgbtqia_V2.json',
  'anthology': 'anthology_completeh7.json',
  'parcours-vie': 'parcours-vie-json-imagais.json',
  'lea': 'lea_scenario.json'
  // NOTE: Scénarios manquants (aglae, pornographie, etc.) retirés pour éviter les erreurs au démarrage.
};

/**
 * Charge un fichier de scénario depuis le système de fichiers.
 * Utilise un cache pour éviter de lire le même fichier plusieurs fois.
 * @param {string} scenarioFile - Le nom du fichier de scénario à charger.
 * @returns {Promise<object>} Le contenu du scénario parsé en JSON.
 */
async function loadScenario(scenarioFile) {
  if (scenarios[scenarioFile]) {
    console.log(`Scénario depuis le cache: ${scenarioFile}`);
    return scenarios[scenarioFile];
  }

  try {
    // Le chemin doit maintenant remonter d'un niveau (de src/ vers la racine)
    let filePath = path.join(__dirname, '..', 'public', SCENARIOS_DIR, scenarioFile);

    try {
      await fs.access(filePath);
    } catch {
      console.log(`Fichier non trouvé dans ${SCENARIOS_DIR}, essai dans public/`);
      filePath = path.join(__dirname, '..', 'public', scenarioFile);
    }

    const data = await fs.readFile(filePath, 'utf-8');
    const scenario = JSON.parse(data);

    scenarios[scenarioFile] = scenario; // Mettre en cache
    console.log(`Scénario chargé: ${scenario.scenario_info.title} (${scenarioFile})`);

    return scenario;
  } catch (error) {
    console.error(`Erreur chargement scénario ${scenarioFile}:`, error);
    throw new Error(`Impossible de charger le scénario: ${scenarioFile}`);
  }
}

/**
 * Précharge tous les scénarios définis dans scenarioMapping.
 */
async function preloadScenarios() {
  console.log('Préchargement des scénarios...');

  for (const [key, file] of Object.entries(scenarioMapping)) {
    try {
      await loadScenario(file);
      console.log(`✓ ${key}: ${file}`);
    } catch (error) {
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
