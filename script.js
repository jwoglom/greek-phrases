const list = document.getElementById('phrases');
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

function renderPhrases(phrases) {
  list.textContent = '';
  phrases.forEach(phrase => {
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
    list.append(li);
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
