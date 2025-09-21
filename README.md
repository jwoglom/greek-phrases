# Greek Travel Phrases

A static, mobile-friendly website listing common Greek phrases helpful for travelers. Tap a phrase to hear the pronunciation through the browser's text-to-speech engine.

## Features

- Responsive layout that keeps the phrase cards easy to read on phones and tablets
- Quick search bar to filter phrases across every category as you type
- Collapsible practice sections so you can focus on a single topic at a time
- Phrases are configured in [`phrases.json`](phrases.json) and loaded dynamically
- Pronunciation playback uses the Web Speech API, so no audio files are required
- Optional transliteration field to help with practicing pronunciation

## Editing the phrase list

Each entry in `phrases.json` accepts the following keys:

| Key | Required | Description |
| --- | --- | --- |
| `greek` | ✅ | The Greek phrase shown in the list. |
| `english` | ✅ | Translation or description of the phrase. |
| `pronunciation` | ➖ | Optional transliteration displayed under the Greek text. |
| `speech` | ➖ | Override text spoken by text-to-speech. Defaults to the `greek` text. |
| `lang` | ➖ | BCP 47 language code passed to the speech engine. Defaults to `el-GR`. |
| `rate` | ➖ | Speech rate (1 is the browser default). |

Example entry:

```json
{
  "greek": "Πού είναι το ξενοδοχείο;",
  "english": "Where is the hotel?",
  "pronunciation": "Pou íne to xenodohío?",
  "lang": "el-GR",
  "rate": 0.9
}
```

## Local preview

Open `index.html` in a browser. For full text-to-speech support you may need to serve the files over `http://` or `https://` depending on your browser's security settings.

## Deployment

This site is static and can be hosted on GitHub Pages:

1. Push the repository to GitHub.
2. In the repository settings, enable GitHub Pages and select the `main` branch (or the branch that should be published).
3. Wait for the deployment to finish and access the published URL provided by GitHub.

## Pull request previews

Each pull request automatically gets a preview deployment. The CI workflow builds the static site, publishes it to a GitHub Pages
preview environment for that revision, and leaves a comment on the PR with a link to the live preview. This makes it easy to review
changes to the site in a browser before merging.
