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

  groups.forEach(group => {
    const section = document.createElement('section');
    section.className = 'phrase-group';

    if (group.category) {
      const heading = document.createElement('h2');
      heading.className = 'phrase-group-title';
      heading.textContent = group.category;
      section.append(heading);
    }

    if (group.description) {
      const description = document.createElement('p');
      description.className = 'phrase-group-description';
      description.textContent = group.description;
      section.append(description);
    }

    const list = document.createElement('ul');
    list.className = 'phrases';
    group.phrases.forEach(phrase => {
      if (phrase && typeof phrase === 'object' && phrase.greek && phrase.english) {
        list.append(createPhraseListItem(phrase));
      }
    });

    if (list.children.length) {
      section.append(list);
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
