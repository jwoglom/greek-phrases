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

function normalizeGroups(data) {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    const looksLikeGroups = data.every(
      item => item && typeof item === 'object' && Array.isArray(item.phrases)
    );

    if (looksLikeGroups) {
      return data;
    }

    const phrases = data.filter(item => item && typeof item === 'object');
    if (!phrases.length) {
      return [];
    }

    return [
      {
        category: 'Common phrases',
        phrases
      }
    ];
  }

  if (typeof data === 'object' && Array.isArray(data.phrases)) {
    return [data];
  }

  return [];
}

function createPhraseListItem(phrase) {
  const li = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'phrase-button';

  const greek = document.createElement('span');
  greek.className = 'phrase-text';
  greek.lang = 'el';
  greek.textContent = phrase.greek;

  const pronunciation = document.createElement('span');
  pronunciation.className = 'phrase-pronunciation';
  if (phrase.pronunciation) {
    pronunciation.textContent = phrase.pronunciation;
  }

  const english = document.createElement('span');
  english.className = 'phrase-english';
  english.textContent = phrase.english;

  button.append(greek);
  if (phrase.pronunciation) {
    button.append(pronunciation);
  }
  button.append(english);

  button.addEventListener('click', () => speakPhrase(phrase, button));
  li.append(button);
  return li;
}

function renderPhrases(data) {
  if (!groupsContainer) {
    return;
  }

  groupsContainer.textContent = '';
  const groups = normalizeGroups(data).filter(
    group => Array.isArray(group.phrases) && group.phrases.length
  );

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
      '<svg viewBox="0 0 12 8" width="12" height="8" focusable="false" aria-hidden="true"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    toggleButton.append(icon);

    heading.append(toggleButton);
    section.append(heading);

    const content = document.createElement('div');
    content.className = 'phrase-group-content';
    content.id = contentId;

    if (group.description) {
      const description = document.createElement('p');
      description.className = 'phrase-group-description';
      description.textContent = group.description;
      content.append(description);
    }

    const list = document.createElement('ul');
    list.className = 'phrases';
    group.phrases.forEach(phrase => {
      if (phrase && typeof phrase === 'object' && phrase.greek && phrase.english) {
        list.append(createPhraseListItem(phrase));
      }
    });

    if (list.children.length) {
      content.append(list);
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
    }
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
