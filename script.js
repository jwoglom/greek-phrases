const groupsContainer = document.getElementById('phrase-groups');
const supportMessage = document.getElementById('support-message');
const ttsSupported = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
let selectedVoice = null;

if (!ttsSupported && supportMessage) {
  supportMessage.textContent = 'Pronunciation playback is not available in this browser.';
}

function chooseVoice(preferredLang = 'el') {
  if (!ttsSupported) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  const byLang = voices.find(voice => voice.lang && voice.lang.toLowerCase().startsWith(preferredLang));
  return byLang || voices.find(voice => voice.lang && voice.lang.toLowerCase().includes('el')) || null;
}

function speakPhrase(phrase, button) {
  if (!ttsSupported) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(phrase.speech || phrase.greek);
  utterance.lang = (phrase.lang || 'el-GR');
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

function sanitizePracticeRow(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const items = Array.isArray(row.items)
    ? row.items.filter(
        item => item && typeof item === 'object' && item.greek && item.english
      )
    : [];

  if (!items.length) {
    return null;
  }

  const sanitizedRow = {
    ...row,
    items
  };

  if (Array.isArray(row.examples)) {
    const examples = row.examples.filter(
      example =>
        example && typeof example === 'object' && example.greek && example.english
    );
    if (examples.length) {
      sanitizedRow.examples = examples;
    } else {
      delete sanitizedRow.examples;
    }
  }

  if (typeof row.examplesLabel === 'string') {
    const label = row.examplesLabel.trim();
    if (label) {
      sanitizedRow.examplesLabel = label;
    } else {
      delete sanitizedRow.examplesLabel;
    }
  }

  if (typeof row.title === 'string') {
    const title = row.title.trim();
    if (title) {
      sanitizedRow.title = title;
    } else {
      delete sanitizedRow.title;
    }
  }

  if (typeof row.summary === 'string') {
    const summary = row.summary.trim();
    if (summary) {
      sanitizedRow.summary = summary;
    } else {
      delete sanitizedRow.summary;
    }
  }

  return sanitizedRow;
}

function sanitizeGroup(group) {
  if (!group || typeof group !== 'object') {
    return null;
  }

  const sanitized = { ...group };
  let hasContent = false;

  if (Array.isArray(group.phrases)) {
    const phrases = group.phrases.filter(
      phrase => phrase && typeof phrase === 'object' && phrase.greek && phrase.english
    );
    if (phrases.length) {
      sanitized.phrases = phrases;
      hasContent = true;
    } else {
      delete sanitized.phrases;
    }
  }

  if (Array.isArray(group.rows)) {
    const rows = group.rows.map(sanitizePracticeRow).filter(Boolean);
    if (rows.length) {
      sanitized.rows = rows;
      hasContent = true;
    } else {
      delete sanitized.rows;
    }
  }

  if (!hasContent) {
    return null;
  }

  return sanitized;
}

function normalizeGroups(data) {
  if (!data) {
    return [];
  }

  const source = Array.isArray(data) ? data : [data];
  return source.map(sanitizeGroup).filter(Boolean);
}

function createPhraseButton(phrase) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'phrase-button';

  const greek = document.createElement('span');
  greek.className = 'phrase-text';
  greek.lang = 'el';
  greek.textContent = phrase.greek;
  button.append(greek);

  if (phrase.pronunciation) {
    const pronunciation = document.createElement('span');
    pronunciation.className = 'phrase-pronunciation';
    pronunciation.textContent = phrase.pronunciation;
    button.append(pronunciation);
  }

  if (phrase.english) {
    const english = document.createElement('span');
    english.className = 'phrase-english';
    english.textContent = phrase.english;
    button.append(english);
  }

  button.addEventListener('click', () => speakPhrase(phrase, button));
  return button;
}

function createPhraseListItem(phrase) {
  const li = document.createElement('li');
  li.append(createPhraseButton(phrase));
  return li;
}

function createPracticeRow(row) {
  if (!row || !Array.isArray(row.items) || !row.items.length) {
    return null;
  }

  const li = document.createElement('li');
  li.className = 'practice-row';

  if (row.title) {
    const title = document.createElement('h3');
    title.className = 'practice-row-title';
    title.textContent = row.title;
    li.append(title);
  }

  if (row.summary) {
    const summary = document.createElement('p');
    summary.className = 'practice-row-summary';
    summary.textContent = row.summary;
    li.append(summary);
  }

  const vocab = document.createElement('div');
  vocab.className = 'practice-row-vocabulary';
  row.items.forEach(item => {
    if (item && typeof item === 'object' && item.greek && item.english) {
      vocab.append(createPhraseButton(item));
    }
  });

  if (!vocab.children.length) {
    return null;
  }

  li.append(vocab);

  if (Array.isArray(row.examples) && row.examples.length) {
    const examplesWrapper = document.createElement('div');
    examplesWrapper.className = 'practice-row-examples';

    const label = document.createElement('p');
    label.className = 'practice-row-examples-label';
    label.textContent = row.examplesLabel || 'Example phrases';
    examplesWrapper.append(label);

    const list = document.createElement('ul');
    list.className = 'practice-examples-list';

    row.examples.forEach(example => {
      if (example && typeof example === 'object' && example.greek && example.english) {
        const item = document.createElement('li');
        item.className = 'practice-example';

        const greek = document.createElement('span');
        greek.className = 'practice-example-greek';
        greek.lang = 'el';
        greek.textContent = example.greek;
        item.append(greek);

        if (example.pronunciation) {
          const pronunciation = document.createElement('span');
          pronunciation.className = 'practice-example-pronunciation';
          pronunciation.textContent = example.pronunciation;
          item.append(pronunciation);
        }

        const english = document.createElement('span');
        english.className = 'practice-example-english';
        english.textContent = example.english;
        item.append(english);

        list.append(item);
      }
    });

    if (list.children.length) {
      examplesWrapper.append(list);
      li.append(examplesWrapper);
    }
  }

  return li;
}

function renderPhrases(data) {
  if (!groupsContainer) {
    return;
  }

  groupsContainer.textContent = '';
  const groups = normalizeGroups(data);

  if (!groups.length) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-state';
    emptyMessage.textContent = 'No phrases are available right now.';
    groupsContainer.append(emptyMessage);
    return;
  }

  const collapseOnMobile =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 640px)').matches;

  groups.forEach((group, groupIndex) => {
    const section = document.createElement('section');
    section.className = 'phrase-group';

    const heading = document.createElement('h2');
    heading.className = 'phrase-group-heading';

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'phrase-group-toggle';

    const contentId = `phrase-group-content-${groupIndex}`;
    toggleButton.setAttribute('aria-controls', contentId);

    const title = document.createElement('span');
    title.className = 'phrase-group-title';
    title.textContent = group.category || `Phrase group ${groupIndex + 1}`;
    toggleButton.append(title);

    const icon = document.createElement('span');
    icon.className = 'phrase-group-toggle-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML =
      '<svg viewBox="0 0 12 8" width="12" height="8" focusable="false" aria-hidden="true">' +
      '<path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
    toggleButton.append(icon);

    heading.append(toggleButton);
    section.append(heading);

    const content = document.createElement('div');
    content.className = 'phrase-group-content';
    content.id = contentId;

    let hasContent = false;

    if (group.description) {
      const description = document.createElement('p');
      description.className = 'phrase-group-description';
      description.textContent = group.description;
      content.append(description);
      hasContent = true;
    }

    if (Array.isArray(group.rows) && group.rows.length) {
      const rowsList = document.createElement('ul');
      rowsList.className = 'practice-rows';
      group.rows.forEach(row => {
        const rowElement = createPracticeRow(row);
        if (rowElement) {
          rowsList.append(rowElement);
        }
      });

      if (rowsList.children.length) {
        content.append(rowsList);
        hasContent = true;
      }
    }

    if (Array.isArray(group.phrases) && group.phrases.length) {
      const list = document.createElement('ul');
      list.className = 'phrases';
      group.phrases.forEach(phrase => {
        if (phrase && typeof phrase === 'object' && phrase.greek && phrase.english) {
          list.append(createPhraseListItem(phrase));
        }
      });

      if (list.children.length) {
        content.append(list);
        hasContent = true;
      }
    }

    if (!hasContent) {
      return;
    }

    section.append(content);

    const setCollapsedState = collapsed => {
      section.classList.toggle('is-collapsed', collapsed);
      toggleButton.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      if (collapsed) {
        content.hidden = true;
        content.setAttribute('aria-hidden', 'true');
        content.style.display = 'none';
      } else {
        content.hidden = false;
        content.removeAttribute('hidden');
        content.removeAttribute('aria-hidden');
        content.style.display = '';
      }
    };

    const startCollapsed = collapseOnMobile && groupIndex > 0;
    setCollapsedState(startCollapsed);

    toggleButton.addEventListener('click', () => {
      const nextCollapsed = !section.classList.contains('is-collapsed');
      setCollapsedState(nextCollapsed);
    });

    groupsContainer.append(section);
  });
}

fetch('phrases.json')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  })
  .then(renderPhrases)
  .catch(error => {
    console.error('Failed to load phrases', error);
    if (supportMessage) {
      supportMessage.textContent = 'Unable to load the phrases list. Please try again later.';
    }
  });

if (ttsSupported) {
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    selectedVoice = chooseVoice();
  });
  selectedVoice = chooseVoice();
}
