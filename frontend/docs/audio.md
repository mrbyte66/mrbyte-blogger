# Optional Mozart listening

`components/audio/AmbientAudio.tsx` owns one persistent audio element above route composition. Playback starts only on a visitor click; no source is loaded on first render. The fixed lower-right control pauses/resumes at the current position. `ContentPanel` renders the same context control inside the native modal (the background control is hidden while the modal is open). Embedded preview frames hide their duplicate player control; the Studio parent owns playback. Studio/standalone preview routes retain playback and the same accessible pause control. Desktop reading pages use the same bottom/right alignment as other pages; on narrow screens the control clears the notes toolbar. A restrained four-bar indicator appears only during playback; it is decorative, not a measured audio waveform, and respects reduced motion. The 44px monochrome translucent control keeps its touch target.

`lib/audio/mozart.ts` contains verified MP3 streams of the four movements of Mozart Symphony No. 40, performed by Musopen Symphony (2012). Wikimedia Commons identifies these recordings with the Public Domain Mark. No playlist player SDK or tracking iframe is used. Source attribution is linked from the control. Streams require an internet connection; loading/play failure shows a retry action and pending playback has a timeout.

The requested forty minutes is a listening session, not the duration of one recording or a claim that Symphony No. 40 lasts forty minutes. The movements play in order and repeat as needed; cumulative played media time is capped at 2400 seconds. Pausing excludes paused time. At the limit playback stops; a new click starts a fresh session. This player does not store an autoplay preference.

Verified source pages (2026-10-03):

- [I. Molto allegro](https://commons.wikimedia.org/wiki/File:Mozart_-_Symphony_No._40_in_G_minor,_K550_-_I._Molto_allegro_(Musopen_Symphony).flac).
- [II. Andante](https://commons.wikimedia.org/wiki/File:Mozart_-_Symphony_No._40_in_G_minor,_K550_-_II._Andante_(Musopen_Symphony).flac).
- [III. Menuetto. Allegretto](https://commons.wikimedia.org/wiki/File:Mozart_-_Symphony_No._40_in_G_minor,_K550_-_III._Menuetto._Allegretto_(Musopen_Symphony).flac).
- [IV. Finale. Allegro assai](https://commons.wikimedia.org/wiki/File:Mozart_-_Symphony_No._40_in_G_minor,_K550_-_IV._Finale._Allegro_assai_(Musopen_Symphony).flac).

Tests cover opt-in start, pause/resume, persistence across routes, progression, forty-minute stop/restart, loading failure/retry and playback and pause access in Studio. Browser verification checks actual playable media and time advancement, rather than treating a pressed button as proof of audio playback.

## Shared browser session

`lib/audio/session.ts` coordinates same-origin tabs with BroadcastChannel and a Web Lock. Only the owner tab loads/plays media; all others mirror its state and remotely pause/resume it at the same position. Joining a session does not autoplay a second audio element. The owner holds the lock while paused, preserving its position. On normal owner closure/pagehide it broadcasts the final position and playing intent; remaining tabs already wait on the owner lock while music is active. Browser lock release triggers a single successor even if tab termination omits pagehide; it resumes at the last reported position. The lock serializes competing successors. Paused sessions remain paused. If autoplay permission blocks the new owner, it shows “Devam et” and preserves the position for a click. Back/forward cache restoration reconnects the coordinator. Abrupt browser termination cannot guarantee a final position; no background playback is promised after all tabs close. Browsers without BroadcastChannel/Web Locks fall back to local playback.

The character scene places its audio control alongside appearance and motion controls in their shared translucent footer group. Mozart biography replaces the duration-only tooltip; recording attribution remains available.

## Recovery after background denial

An owner that receives a playback denial or error publishes the recoverable state and releases the lock. The next explicit click acquires ownership in the clicked document instead of forwarding playback into the denied background tab. Aborted/finished takeover requests clear their own pending marker; foreground visibility requests a fresh owner snapshot. Previously used audio elements apply the latest shared track, position and elapsed time before reacquiring playback. Retrying an error preserves the session rather than resetting it.

Regression coverage includes five same-origin tabs, a denied background successor, resuming from a different tab, and a stale local element receiving a newer track/position. Browser verification repeated owner closure twice, with a visit to an unrelated site between closure and resume.

Continuous audio across arbitrary tab closure cannot be guaranteed by a website: autoplay policy and background suspension belong to the browser. A click may be required in the surviving document; do not describe this recovery as guaranteed uninterrupted playback. See [browser autoplay rules](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
