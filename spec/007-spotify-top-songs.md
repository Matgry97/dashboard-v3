# Spotify top songs widget

## Goal

Add a widget that shows the user's current top tracks from Spotify — what they've been listening to most. Uses Spotify's Web API `GET /v1/me/top/tracks` endpoint which returns personalized top tracks over short-term (last ~4 weeks), medium-term (~6 months), or long-term (all time). Defaults to short-term to show what's playing lately. Adds a music/lifestyle dimension to the dashboard alongside fitness and weather.

## Context

- Spotify Web API: `GET https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5` returns the user's top tracks. Requires OAuth2 with the `user-top-read` scope.
- Spotify OAuth2 flow: similar to Strava — authorization code flow → get refresh token → use refresh token to get access tokens. Access tokens expire after 1 hour, refresh tokens are long-lived.
- Token refresh: `POST https://accounts.spotify.com/api/token` with `grant_type=refresh_token`, `refresh_token`, `client_id`, `client_secret`.
- App setup: create a Spotify app at https://developer.spotify.com/dashboard, set redirect URI to `http://localhost:3001/api/spotify/callback` (for initial token capture).
- Each track object from the API includes: `name`, `artists[].name`, `album.name`, `album.images[]` (multiple sizes), `duration_ms`, `external_urls.spotify` (link to track), `preview_url` (30s audio preview, may be null).
- Server integration follows the same pattern as Strava: `server/integrations/spotify/router.js` + `service.js`.
- Env vars needed: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`.

## Affected files

**New files:**
- `server/integrations/spotify/service.js` — Spotify API client with token refresh
- `server/integrations/spotify/router.js` — `GET /top-tracks` route
- `src/store/spotify-store.ts` — Zustand store for Spotify data
- `src/widgets/top-songs/TopSongsWidget.tsx` — widget component
- `src/widgets/top-songs/TopSongsWidget.module.css` — widget styles
- `src/widgets/top-songs/index.ts` — widget registration

**Modified files:**
- `server/index.js` — mount Spotify router at `/api/spotify`
- `src/widgets/index.ts` — add barrel import for `./top-songs`
- `.env.example` — add Spotify env vars (if the file exists)

## Implementation

1. **Create the Spotify service** — `server/integrations/spotify/service.js`:
   - Read `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` from `process.env`.
   - Implement token refresh: maintain an in-memory access token and expiry timestamp. Before each API call, check if the token is expired and refresh if needed. Use `POST https://accounts.spotify.com/api/token` with form-encoded body: `grant_type=refresh_token&refresh_token={token}&client_id={id}&client_secret={secret}`. The response includes `access_token` and `expires_in` (seconds).
   - Export `getTopTracks(timeRange = 'short_term', limit = 5)`:
     - Calls `GET https://api.spotify.com/v1/me/top/tracks?time_range={timeRange}&limit={limit}` with `Authorization: Bearer {access_token}`.
     - Maps the response to a simplified shape per track:
       ```javascript
       {
         name: item.name,
         artist: item.artists.map(a => a.name).join(', '),
         album: item.album.name,
         albumArt: item.album.images[1]?.url || item.album.images[0]?.url, // prefer 300px, fallback to largest
         spotifyUrl: item.external_urls.spotify,
         durationMs: item.duration_ms
       }
       ```
     - Returns an array of tracks.
   - Export `healthCheck()`: return `"ok"` if env vars are present, `"unconfigured"` if not.

2. **Create the Spotify router** — `server/integrations/spotify/router.js`:
   ```javascript
   router.get('/top-tracks', asyncHandler(async (req, res) => {
     const timeRange = req.query.range || 'short_term'; // short_term | medium_term | long_term
     let tracks;
     try {
       tracks = await service.getTopTracks(timeRange, 5);
     } catch (e) {
       return err(res, 502, 'SPOTIFY_ERROR', e.message);
     }
     if (!tracks || tracks.length === 0) return err(res, 404, 'NO_DATA', 'No top tracks found.');
     ok(res, { tracks, timeRange });
   }));
   ```

3. **Mount the router** — In `server/index.js`: `app.use('/api/spotify', require('./integrations/spotify/router'));`.

4. **Create the Spotify store** — `src/store/spotify-store.ts`:
   ```typescript
   interface SpotifyTrack {
     name: string;
     artist: string;
     album: string;
     albumArt: string;
     spotifyUrl: string;
     durationMs: number;
   }

   interface SpotifyState {
     tracks: SpotifyTrack[];
     timeRange: "short_term" | "medium_term" | "long_term";
     fetchedDate: string | null;
     status: "idle" | "loading" | "success" | "error";
     error: string | null;
     fetchIfNeeded: () => void;
     setTimeRange: (range: "short_term" | "medium_term" | "long_term") => void;
   }
   ```
   Day-level cache. Persist key: `"spotify-storage"`. When `setTimeRange` is called, clear `fetchedDate` to force a re-fetch with the new range.

5. **Create the widget component** — `src/widgets/top-songs/TopSongsWidget.tsx`:
   - Call `fetchIfNeeded()` in `useEffect`.
   - Handle loading, error, and data states.
   - Layout — a compact ranked list:
     - Header row: "Top Songs" label on the left, time range toggle on the right (small segmented control or dropdown: "4W" / "6M" / "All")
     - Track list: numbered 1–5. Each track row:
       - Rank number (dimmed, `var(--color-text-secondary)`)
       - Album art thumbnail (40×40, rounded corners 4px)
       - Track name (primary color, 13px, `font-weight: 600`, truncate with ellipsis if long)
       - Artist name below track name (secondary color, 11px)
     - Each row is a clickable link to `spotifyUrl` (opens in new tab).
   - Time range toggle: three small buttons/pills. Active one highlighted with `var(--color-accent)`. Clicking a different range calls `setTimeRange()` which triggers a re-fetch.

6. **Style the widget** — `src/widgets/top-songs/TopSongsWidget.module.css`:
   - Container: `display: flex; flex-direction: column; height: 100%;`
   - Header: `display: flex; justify-content: space-between; align-items: center; padding: 14px 16px 10px;`
   - Title: `font-family: var(--font-ui); font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-text-secondary);`
   - Track list: `display: flex; flex-direction: column; flex: 1; overflow-y: auto;`
   - Track row: `display: flex; align-items: center; gap: 10px; padding: 6px 16px; transition: background 0.15s;`
   - Track row hover: `background: var(--color-surface-hover);`
   - Rank number: `width: 18px; text-align: right; font-family: var(--font-data); font-size: 13px; color: var(--color-text-secondary); flex-shrink: 0;`
   - Album art: `width: 40px; height: 40px; border-radius: 4px; object-fit: cover; flex-shrink: 0;`
   - Track name: `font-size: 13px; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`
   - Artist: `font-size: 11px; color: var(--color-text-secondary);`
   - Range toggle buttons: `font-size: 10px; padding: 3px 8px; border-radius: 4px; border: 1px solid var(--color-border); background: transparent; color: var(--color-text-secondary); cursor: pointer;`
   - Active range button: `background: var(--color-accent-dim); border-color: var(--color-accent); color: var(--color-accent);`

7. **Register the widget** — `src/widgets/top-songs/index.ts`:
   ```typescript
   registerWidget({
     id: "top-songs",
     name: "Top Songs",
     description: "Your most played Spotify tracks",
     defaultSize: "small",
     component: TopSongsWidget,
   });
   ```

8. **Add barrel import** — `src/widgets/index.ts`: add `import "./top-songs";`.

## Testing

- **E2E / visual** —
  1. Add the widget to a tab. If Spotify is configured, verify 5 tracks render with album art, names, and artists.
  2. If Spotify is NOT configured: verify a graceful error state, not a crash.
  3. Click a time range toggle — verify the list updates.
  4. Screenshot the widget — verify album art loads, text is truncated properly for long names, layout is clean.
  5. Widget fits within 1 grid column without overflow.
  6. Click a track — verify it opens Spotify in a new tab.

- **Edge cases** —
  - Spotify not configured: show "Spotify not configured" error
  - Less than 5 tracks available: render however many there are
  - Very long track or artist names: ellipsis truncation, no layout blowout
  - Album art fails to load: show a placeholder background color

## Acceptance criteria

- [ ] `GET /api/spotify/top-tracks?range=short_term` returns the user's top 5 tracks
- [ ] Spotify service handles token refresh automatically
- [ ] Widget displays ranked list with album art, track name, and artist
- [ ] Time range toggle switches between 4 weeks / 6 months / all time
- [ ] Tracks link to Spotify when clicked
- [ ] Day-level cache in the Spotify store
- [ ] Widget handles loading, error, and unconfigured states gracefully
- [ ] Widget registered and available in add-widget modal
- [ ] Env vars documented: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`
