# Margo

Margo is a social platform where people communicate through song lyrics. You post a lyric, pick the feeling behind it, and the platform automatically identifies the song and attaches streaming links. Others resonate, or reply with their own lyric — a Lyric Back.

Live at trymargo.com

---

## How It Works

- Post a lyric — search by lyric, song, or artist name
- Platform identifies the song via Genius and iTunes
- YouTube, Deezer, and Apple Music links attach automatically
- Pick a feeling — Love, Heartbreak, Hope, Nostalgia, Healing, Joy, Rage, Loneliness, Send It, Let Out
- Others resonate with one tap
- Others reply with their own lyric — Lyric Back
- Every post and Lyric Back can be saved as a visual card, copied as text, or shared via a deep link that opens Margo directly on that specific exchange

---

## Tech Stack

- Frontend — vanilla JS, HTML, CSS
- Database — Firebase Realtime Database
- Auth — anonymous, username auto-generated
- APIs — Genius, iTunes, YouTube, Deezer
- Hosting — Vercel
- Analytics — Vercel Analytics (cookieless)
- Fonts — Lora (self-hosted), Syne 800

---

## Roadmap

### Stage 1 — Social Expression (Live)
- Lyric posts with emotion tagging
- Automatic song identification via Genius and iTunes
- Streaming links — YouTube, Deezer, Apple Music
- Resonate and Lyric Back
- Visual card export and deep link sharing
- Anonymous usernames — no account required

### Stage 2 — Social Discovery (Planned)
- Licensed lyrics
- Emotion-based music matching
- Intelligent discovery feeds
- Enhanced engagement features

### Stage 3 — Social Streaming (Long Term)
- Full licensed streaming
- In-app playback
- Artist monetization
- Community-driven trends

---

## Project Structure

```
assets/         CSS, fonts, brand assets
js/
  core/         App state, Firebase, username
  features/     Echoes, Lyric Back share
  ui/           Composer, feed, resonate
  media/        Share sheet, poster, GIF
api/            Vercel serverless — Genius, YouTube
public/         Legal pages
```

---

## Contact

trymargo.com
contact@trymargo.com
GitHub: https://github.com/scottgagabutera-spec
