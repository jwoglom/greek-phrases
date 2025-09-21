const groupsContainer = document.getElementById('practice-groups');
const supportMessage = document.getElementById('support-message');
const ttsSupported =
  'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
let selectedVoice = null;

if (!ttsSupported && supportMessage) {
  supportMessage.textContent =
    'Pronunciation playback is not available in this browser.';
}

function chooseVoice(preferredLang = 'el') {
  if (!ttsSupported) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  const byLang = voices.find(
    voice => voice.lang && voice.lang.toLowerCase().startsWith(preferredLang)
  );
  return (
    byLang || voices.find(voice => voice.lang && voice.lang.toLowerCase().includes('el')) || null
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

function normalizeSections(data) {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data.filter(
      section =>
        section &&
        typeof section === 'object' &&
        Array.isArray(section.rows) &&
        section.rows.some(row => row && typeof row === 'object')
    );
  }

  if (typeof data === 'object' && Array.isArray(data.rows)) {
    return [data];
  }

  return [];
}

function createSpeechButton(phrase, { compact = false } = {}) {
  if (!phrase || typeof phrase !== 'object' || !phrase.greek) {
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
  greek.lang = phrase.lang || 'el';
  greek.textContent = phrase.greek;
  button.append(greek);

  if (phrase.pronunciation) {
    const pronunciation = document.createElement('span');
    pronunciation.className = 'speech-button__pronunciation';
    pronunciation.textContent = phrase.pronunciation;
    button.append(pronunciation);
  }

  if (phrase.english) {
    const english = document.createElement('span');
    english.className = 'speech-button__english';
    english.textContent = phrase.english;
    button.append(english);
  }

  button.addEventListener('click', () => speakPhrase(phrase, button));
  return button;
}

function createPracticeRow(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const variants = Array.isArray(row.variants)
    ? row.variants.filter(variant => variant && typeof variant === 'object')
    : [];
  const examples = Array.isArray(row.examples)
    ? row.examples.filter(example => example && typeof example === 'object')
    : [];

  if (!variants.length && !examples.length) {
    return null;
  }

  const article = document.createElement('article');
  article.className = 'practice-row';

  const main = document.createElement('div');
  main.className = 'practice-row-main';

  const title = document.createElement('h3');
  title.className = 'practice-row-title';
  title.textContent =
    row.title || (variants.length ? variants.map(item => item.greek).join(' / ') : 'Practice item');
  main.append(title);

  if (row.summary) {
    const summary = document.createElement('p');
    summary.className = 'practice-row-summary';
    summary.textContent = row.summary;
    main.append(summary);
  }

  if (variants.length) {
    const variantsWrapper = document.createElement('div');
    variantsWrapper.className = 'practice-row-variants';
    variants.forEach(variant => {
      const button = createSpeechButton(variant, { compact: true });
      if (button) {
        variantsWrapper.append(button);
      }
    });

    if (variantsWrapper.children.length) {
      if (row.variantsLabel !== false) {
        const label = document.createElement('p');
        label.className = 'practice-row-label';
        label.textContent = row.variantsLabel || 'Core forms';
        main.append(label);
      }
      main.append(variantsWrapper);
    }
  }

  article.append(main);

  if (examples.length) {
    const list = document.createElement('ul');
    list.className = 'example-list';
    examples.forEach(example => {
      const button = createSpeechButton(example);
      if (button) {
        const item = document.createElement('li');
        item.append(button);
        list.append(item);
      }
    });

    if (list.children.length) {
      const examplesWrapper = document.createElement('div');
      examplesWrapper.className = 'practice-row-examples';

      const heading = document.createElement('h4');
      heading.className = 'practice-row-examples-heading';
      heading.textContent = row.examplesHeading || 'Example phrases';
      examplesWrapper.append(heading);
      examplesWrapper.append(list);
      article.append(examplesWrapper);
    }
  }

  return article;
}

function renderPractice(data) {
  if (!groupsContainer) {
    return;
  }

  groupsContainer.textContent = '';
  const sections = normalizeSections(data);

  sections.forEach(sectionData => {
    const rows = Array.isArray(sectionData.rows)
      ? sectionData.rows
          .map(createPracticeRow)
          .filter(rowElement => rowElement instanceof HTMLElement)
      : [];

    if (!rows.length) {
      return;
    }

    const section = document.createElement('section');
    section.className = 'practice-section';

    const header = document.createElement('header');
    header.className = 'practice-section-header';

    const heading = document.createElement('h2');
    heading.className = 'practice-section-title';
    heading.textContent = sectionData.category || 'Practice set';
    header.append(heading);

    if (sectionData.description) {
      const description = document.createElement('p');
      description.className = 'practice-section-description';
      description.textContent = sectionData.description;
      header.append(description);
    }

    section.append(header);

    const rowsWrapper = document.createElement('div');
    rowsWrapper.className = 'practice-rows';
    rows.forEach(rowElement => rowsWrapper.append(rowElement));
    section.append(rowsWrapper);
    groupsContainer.append(section);
  });

  if (!groupsContainer.children.length) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-state';
    emptyMessage.textContent = 'No practice items are available right now.';
    groupsContainer.append(emptyMessage);
  }
}

fetch('phrases.json')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  })
  .then(renderPractice)
  .catch(error => {
    console.error('Failed to load practice data', error);
    if (supportMessage) {
      supportMessage.textContent =
        'Unable to load the practice list. Please try again later.';
    }
  });

if (ttsSupported) {
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    selectedVoice = chooseVoice();
  });
  selectedVoice = chooseVoice();
}
