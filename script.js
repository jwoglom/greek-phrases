const groupsContainer = document.getElementById('practice-groups');
const supportMessage = document.getElementById('support-message');
const resultsMessage = document.getElementById('results-message');
const searchField = document.getElementById('phrase-search');
const clearSearchButton = document.getElementById('clear-search');

const ttsSupported =
  'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
const ttsNotice = 'Pronunciation playback is not available in this browser.';
let selectedVoice = null;

if (!ttsSupported && supportMessage) {
  supportMessage.textContent = ttsNotice;
}

const sectionState = new Map();
let sectionIdCounter = 0;
let allSections = [];
let totalRowCount = 0;
let searchInitialized = false;

function chooseVoice(preferredLang = 'el') {
  if (!ttsSupported) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  const normalizedPreferred = preferredLang.toLowerCase();
  const exactMatch = voices.find(
    voice => voice.lang && voice.lang.toLowerCase().startsWith(normalizedPreferred)
  );
  if (exactMatch) {
    return exactMatch;
  }
  return voices.find(
    voice => voice.lang && voice.lang.toLowerCase().includes('el')
  );
}

function speakPhrase(phrase, button) {
  if (!ttsSupported || !phrase || !button) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(phrase.speech || phrase.greek);
  utterance.lang = phrase.lang || 'el-GR';

  if (!selectedVoice || !window.speechSynthesis.getVoices().includes(selectedVoice)) {
    selectedVoice = chooseVoice((phrase.lang || 'el').toLowerCase());
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.rate = phrase.rate || 0.9;
  utterance.onstart = () => button.classList.add('is-speaking');
  const clearSpeakingClass = () => button.classList.remove('is-speaking');
  utterance.onend = clearSpeakingClass;
  utterance.onerror = clearSpeakingClass;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function isValidPhrase(phrase) {
  return (
    phrase &&
    typeof phrase === 'object' &&
    typeof phrase.greek === 'string' &&
    phrase.greek.trim() !== ''
  );
}

function sanitizePhrase(phrase) {
  if (!isValidPhrase(phrase)) {
    return null;
  }
  const sanitized = { ...phrase };
  sanitized.greek = phrase.greek.trim();
  if (typeof phrase.pronunciation === 'string') {
    sanitized.pronunciation = phrase.pronunciation.trim();
  }
  if (typeof phrase.english === 'string') {
    sanitized.english = phrase.english.trim();
  }
  if (typeof phrase.speech === 'string') {
    sanitized.speech = phrase.speech.trim();
  }
  if (typeof phrase.lang === 'string') {
    sanitized.lang = phrase.lang.trim();
  }
  return sanitized;
}

function normalizeSections(data) {
  const sections = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray(data.rows)
    ? [data]
    : [];

  return sections
    .map((section, sectionIndex) => {
      if (!section || typeof section !== 'object') {
        return null;
      }

      const rows = Array.isArray(section.rows)
        ? section.rows
            .map((row, rowIndex) => {
              if (!row || typeof row !== 'object') {
                return null;
              }

              const variants = Array.isArray(row.variants)
                ? row.variants.map(sanitizePhrase).filter(Boolean)
                : [];
              const examples = Array.isArray(row.examples)
                ? row.examples.map(sanitizePhrase).filter(Boolean)
                : [];

              if (!variants.length && !examples.length) {
                return null;
              }

              return {
                ...row,
                title:
                  typeof row.title === 'string' && row.title.trim()
                    ? row.title
                    : '',
                summary:
                  typeof row.summary === 'string' ? row.summary : '',
                variants,
                examples,
                __id: `section-${sectionIndex}-row-${rowIndex}`,
              };
            })
            .filter(Boolean)
        : [];

      if (!rows.length) {
        return null;
      }

      return {
        ...section,
        category:
          typeof section.category === 'string' && section.category.trim()
            ? section.category
            : 'Practice set',
        description:
          typeof section.description === 'string' ? section.description : '',
        rows,
        __id: `section-${sectionIndex}`,
      };
    })
    .filter(Boolean);
}

function countRows(sections) {
  if (!Array.isArray(sections)) {
    return 0;
  }
  return sections.reduce(
    (total, section) =>
      total + (Array.isArray(section.rows) ? section.rows.length : 0),
    0
  );
}

function normalizeSearchValue(value) {
  if (value == null) {
    return '';
  }
  const text = String(value).toLowerCase().trim();
  try {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (error) {
    return text;
  }
}

function rowMatches(row, normalizedQuery) {
  if (!row || typeof row !== 'object') {
    return false;
  }

  const values = [];
  if (row.title) {
    values.push(row.title);
  }
  if (row.summary) {
    values.push(row.summary);
  }
  if (row.examplesHeading) {
    values.push(row.examplesHeading);
  }

  if (Array.isArray(row.variants)) {
    row.variants.forEach(variant => {
      if (variant.greek) {
        values.push(variant.greek);
      }
      if (variant.pronunciation) {
        values.push(variant.pronunciation);
      }
      if (variant.english) {
        values.push(variant.english);
      }
      if (variant.speech) {
        values.push(variant.speech);
      }
    });
  }

  if (Array.isArray(row.examples)) {
    row.examples.forEach(example => {
      if (example.greek) {
        values.push(example.greek);
      }
      if (example.pronunciation) {
        values.push(example.pronunciation);
      }
      if (example.english) {
        values.push(example.english);
      }
      if (example.speech) {
        values.push(example.speech);
      }
    });
  }

  return values.some(value => normalizeSearchValue(value).includes(normalizedQuery));
}

function filterSections(sections, normalizedQuery) {
  if (!normalizedQuery) {
    return sections;
  }

  return sections
    .map(section => {
      const rows = Array.isArray(section.rows)
        ? section.rows.filter(row => rowMatches(row, normalizedQuery))
        : [];
      if (!rows.length) {
        return null;
      }
      return { ...section, rows };
    })
    .filter(Boolean);
}

function createSpeechButton(phrase, { compact = false } = {}) {
  const sanitizedPhrase = sanitizePhrase(phrase);
  if (!sanitizedPhrase) {
    return null;
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'speech-button';
  if (compact) {
    button.classList.add('speech-button--compact');
  }

  const greek = document.createElement('span');
  greek.className = 'speech-button__text';
  greek.lang = sanitizedPhrase.lang || 'el';
  greek.textContent = sanitizedPhrase.greek;
  button.append(greek);

  if (sanitizedPhrase.pronunciation) {
    const pronunciation = document.createElement('span');
    pronunciation.className = 'speech-button__pronunciation';
    pronunciation.textContent = sanitizedPhrase.pronunciation;
    button.append(pronunciation);
  }

  if (sanitizedPhrase.english) {
    const english = document.createElement('span');
    english.className = 'speech-button__english';
    english.textContent = sanitizedPhrase.english;
    button.append(english);
  }

  if (ttsSupported) {
    const tooltipParts = [sanitizedPhrase.greek];
    if (sanitizedPhrase.english) {
      tooltipParts.push(sanitizedPhrase.english);
    }
    button.title = `Play pronunciation: ${tooltipParts.join(' — ')}`;
    button.addEventListener('click', () => speakPhrase(sanitizedPhrase, button));
  } else {
    button.disabled = true;
    button.classList.add('speech-button--disabled');
    button.title = 'Speech playback is not supported in this browser.';
  }

  return button;
}

function createChevronIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('practice-section__icon');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'M3.2 5.3a1 1 0 0 1 1.4 0L8 8.7l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L3.2 6.7a1 1 0 0 1 0-1.4z'
  );
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}

function createPracticeRow(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const variants = Array.isArray(row.variants) ? row.variants : [];
  const examples = Array.isArray(row.examples) ? row.examples : [];

  if (!variants.length && !examples.length) {
    return null;
  }

  const item = document.createElement('li');
  item.className = 'practice-card';

  const meta = document.createElement('div');
  meta.className = 'practice-card__meta';

  const title = document.createElement('h3');
  title.className = 'practice-card__title';
  const fallbackTitle =
    variants.length > 0
      ? variants.map(variant => variant.greek).join(' / ')
      : 'Practice item';
  title.textContent = row.title || fallbackTitle;
  meta.append(title);

  if (row.summary) {
    const summary = document.createElement('p');
    summary.className = 'practice-card__summary';
    summary.textContent = row.summary;
    meta.append(summary);
  }

  item.append(meta);

  const sectionsWrapper = document.createElement('div');
  sectionsWrapper.className = 'practice-card__sections';

  if (variants.length) {
    const variantsGroup = document.createElement('div');
    variantsGroup.className = 'practice-card__group';

    if (row.variantsLabel !== false) {
      const label = document.createElement('p');
      label.className = 'practice-card__label';
      label.textContent = row.variantsLabel || 'Focus phrases';
      variantsGroup.append(label);
    }

    const variantsList = document.createElement('div');
    variantsList.className = 'practice-card__variants';
    variants.forEach(variant => {
      const button = createSpeechButton(variant, { compact: true });
      if (button) {
        variantsList.append(button);
      }
    });

    if (variantsList.children.length) {
      variantsGroup.append(variantsList);
      sectionsWrapper.append(variantsGroup);
    }
  }

  if (examples.length) {
    const examplesGroup = document.createElement('div');
    examplesGroup.className = 'practice-card__group practice-card__examples';

    const heading = document.createElement('h4');
    heading.className = 'practice-card__heading';
    heading.textContent = row.examplesHeading || 'Example phrases';
    examplesGroup.append(heading);

    const list = document.createElement('ul');
    list.className = 'practice-card__example-list';

    examples.forEach(example => {
      const button = createSpeechButton(example);
      if (button) {
        const itemElement = document.createElement('li');
        itemElement.append(button);
        list.append(itemElement);
      }
    });

    if (list.children.length) {
      examplesGroup.append(list);
      sectionsWrapper.append(examplesGroup);
    }
  }

  if (sectionsWrapper.children.length) {
    item.append(sectionsWrapper);
  }

  return item;
}

function createPracticeSection(sectionData, { forceExpand = false } = {}) {
  if (!sectionData || !Array.isArray(sectionData.rows) || !sectionData.rows.length) {
    return null;
  }

  const section = document.createElement('section');
  section.className = 'practice-section';

  const header = document.createElement('header');
  header.className = 'practice-section__header';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'practice-section__toggle';

  const textWrapper = document.createElement('span');
  textWrapper.className = 'practice-section__text';

  const title = document.createElement('span');
  title.className = 'practice-section__title';
  title.textContent = sectionData.category || 'Practice set';
  textWrapper.append(title);

  if (sectionData.description) {
    const description = document.createElement('span');
    description.className = 'practice-section__description';
    description.textContent = sectionData.description;
    textWrapper.append(description);
  }

  const icon = createChevronIcon();

  toggle.append(textWrapper);
  toggle.append(icon);

  const toggleId = `practice-toggle-${sectionIdCounter++}`;
  const panelId = `${toggleId}-panel`;
  toggle.id = toggleId;
  toggle.setAttribute('aria-controls', panelId);

  const savedState = sectionState.get(sectionData.__id);
  const shouldExpand = forceExpand ? true : savedState ? savedState.expanded : true;
  toggle.setAttribute('aria-expanded', shouldExpand ? 'true' : 'false');

  header.append(toggle);
  section.append(header);

  const panel = document.createElement('div');
  panel.className = 'practice-section__panel';
  panel.id = panelId;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', toggleId);
  panel.hidden = !shouldExpand;

  const list = document.createElement('ul');
  list.className = 'practice-list';
  sectionData.rows.forEach(row => {
    const rowElement = createPracticeRow(row);
    if (rowElement) {
      list.append(rowElement);
    }
  });

  if (!list.children.length) {
    return null;
  }

  panel.append(list);
  section.append(panel);

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    const next = !expanded;
    toggle.setAttribute('aria-expanded', String(next));
    panel.hidden = !next;
    sectionState.set(sectionData.__id, { expanded: next });
  });

  return section;
}

function renderSections(sections, { forceExpand = false, emptyMessage } = {}) {
  if (!groupsContainer) {
    return;
  }

  groupsContainer.textContent = '';
  sectionIdCounter = 0;

  sections.forEach(sectionData => {
    const sectionElement = createPracticeSection(sectionData, { forceExpand });
    if (sectionElement) {
      groupsContainer.append(sectionElement);
    }
  });

  if (!groupsContainer.children.length) {
    const message = document.createElement('p');
    message.className = 'empty-state';
    message.textContent =
      emptyMessage || 'No practice items are available right now.';
    groupsContainer.append(message);
  }
}

function updateResultsMessage(filteredCount, totalCount, rawQuery) {
  if (!resultsMessage) {
    return;
  }

  const trimmedQuery = typeof rawQuery === 'string' ? rawQuery.trim() : '';

  if (totalCount === 0) {
    resultsMessage.textContent = filteredCount
      ? `Showing ${filteredCount} ${filteredCount === 1 ? 'phrase' : 'phrases'}.`
      : 'No practice phrases are available yet.';
    return;
  }

  if (trimmedQuery) {
    if (filteredCount) {
      const noun = filteredCount === 1 ? 'phrase' : 'phrases';
      resultsMessage.textContent = `Showing ${filteredCount} ${noun} matching “${trimmedQuery}”.`;
    } else {
      resultsMessage.textContent = `No phrases match “${trimmedQuery}”.`;
    }
    return;
  }

  const noun = totalCount === 1 ? 'phrase' : 'phrases';
  resultsMessage.textContent = `Showing all ${totalCount} ${noun}.`;
}

function updateClearButtonVisibility() {
  if (!clearSearchButton || !searchField) {
    return;
  }
  const hasValue = Boolean(searchField.value);
  clearSearchButton.hidden = !hasValue;
}

function applyFilters() {
  const rawQuery = searchField ? searchField.value : '';
  const normalizedQuery = normalizeSearchValue(rawQuery);
  const hasQuery = Boolean(normalizedQuery);

  const filteredSections = hasQuery
    ? filterSections(allSections, normalizedQuery)
    : allSections;

  const options = {};
  if (hasQuery) {
    options.forceExpand = true;
    if (!filteredSections.length) {
      options.emptyMessage = rawQuery && rawQuery.trim()
        ? `No phrases match “${rawQuery.trim()}”.`
        : 'No phrases match your search.';
    }
  }

  renderSections(filteredSections, options);
  const filteredCount = countRows(filteredSections);
  updateResultsMessage(filteredCount, totalRowCount, rawQuery);
  updateClearButtonVisibility();
}

function setupSearch() {
  if (searchInitialized || !searchField) {
    updateClearButtonVisibility();
    return;
  }

  searchInitialized = true;
  const handleInput = () => {
    applyFilters();
  };

  searchField.addEventListener('input', handleInput);
  searchField.addEventListener('search', handleInput);

  if (clearSearchButton) {
    clearSearchButton.addEventListener('click', () => {
      searchField.value = '';
      searchField.focus();
      applyFilters();
    });
  }

  updateClearButtonVisibility();
}

function handlePracticeData(data) {
  allSections = normalizeSections(data);
  totalRowCount = countRows(allSections);
  sectionState.clear();
  applyFilters();
  setupSearch();
}

function attemptFallbackData() {
  const fallback =
    window.greekPracticeData ||
    window.practiceData ||
    window.__PRACTICE_DATA__;

  if (!fallback) {
    return false;
  }

  try {
    handlePracticeData(fallback);
    return true;
  } catch (error) {
    console.error('Failed to parse fallback practice data', error);
    return false;
  }
}

function showLoadError(message) {
  if (supportMessage) {
    const prefix = !ttsSupported ? `${ttsNotice} ` : '';
    supportMessage.textContent = `${prefix}${message}`;
  }
  if (resultsMessage) {
    resultsMessage.textContent = '';
  }
  if (groupsContainer) {
    groupsContainer.textContent = '';
    const errorMessage = document.createElement('p');
    errorMessage.className = 'empty-state';
    errorMessage.textContent = 'We were not able to load any phrases.';
    groupsContainer.append(errorMessage);
  }
}

function loadPracticeData() {
  fetch('phrases.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(handlePracticeData)
    .catch(error => {
      console.error('Failed to load practice data', error);
      if (!attemptFallbackData()) {
        showLoadError('Unable to load the practice list. Please try again later.');
      }
    });
}

if (ttsSupported) {
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    selectedVoice = chooseVoice();
  });
  selectedVoice = chooseVoice();
}

loadPracticeData();
