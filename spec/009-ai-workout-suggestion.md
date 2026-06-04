# AI workout suggestion widget

## Goal

Add a tap-to-generate widget that uses the Claude API to produce a personalized workout suggestion based on the user's recent Strava run history and the current weather forecast. The suggestion is generated on demand (not automatically) to avoid unnecessary API usage. Gives the user an AI-powered training recommendation right on their dashboard.

## Context

- The architecture doc specifies: "Tap-to-generate widget. Sends a prompt to the Claude API containing: Last N runs from Strava (distance, pace, HR, elevation), 7-day weather forecast from Open-Meteo, User context (e.g. target weekly km). Returns a structured weekly plan. Not auto-generated — always manual trigger."
- Strava data is available via `GET /api/strava/last-run` (single run) but for history we need a new endpoint that returns the last N runs.
- Weather forecast is available via `GET /api/weather/current` — check what data it returns (likely includes forecast).
- The Claude API call should happen on the server side (API key stays server-side). New endpoint: `POST /api/ai/workout-suggestion`.
- Claude API: use the Anthropic Node SDK (`@anthropic-ai/sdk`). Needs `ANTHROPIC_API_KEY` in `.env`.
- The widget should show the generated suggestion as formatted text. Only one suggestion at a time — tapping again replaces it.

## Affected files

**New files:**
- `server/integrations/ai/service.js` — builds the prompt, calls Claude API
- `server/integrations/ai/router.js` — `POST /workout-suggestion` endpoint
- `src/widgets/workout-suggestion/WorkoutSuggestionWidget.tsx` — widget component
- `src/widgets/workout-suggestion/WorkoutSuggestionWidget.module.css` — widget styles
- `src/widgets/workout-suggestion/index.ts` — widget registration

**Modified files:**
- `server/integrations/strava/service.js` — add `getRecentRuns(count)` function to return last N runs
- `server/integrations/strava/router.js` — add `GET /recent-runs` endpoint
- `server/index.js` — mount AI router at `/api/ai`, install `@anthropic-ai/sdk`
- `src/widgets/index.ts` — add barrel import for `./workout-suggestion`

## Implementation

1. **Install the Anthropic SDK** — Run `npm install @anthropic-ai/sdk` to add the server dependency.

2. **Add `getRecentRuns()` to Strava service** — In `server/integrations/strava/service.js`:
   - `getRecentRuns(count = 10)`: calls `GET /api/v3/athlete/activities?per_page={count}`, filters to `type === 'Run'`, returns an array of simplified run objects: `{ date, distance, movingTime, averageSpeed, averageHeartrate, totalElevationGain }`.
   - Add route in `router.js`: `GET /recent-runs` → calls `service.getRecentRuns()`, returns the array.

3. **Create the AI service** — `server/integrations/ai/service.js`:
   - Read `ANTHROPIC_API_KEY` from `process.env`.
   - Export `generateWorkoutSuggestion(runs, weather)`:
     - Builds a prompt that includes:
       - Summary of recent runs (distance, pace, HR, elevation for each)
       - Current weather and 7-day forecast
       - Instructions: "Based on this training history and weather forecast, suggest a workout for today. Include: workout type, target distance, target pace range, and any weather-related advice. Keep it concise — 3-5 sentences."
     - Calls Claude API using `claude-haiku-4-5-20251001` model (fast and cheap for this use case):
       ```javascript
       const anthropic = new Anthropic();
       const message = await anthropic.messages.create({
         model: "claude-haiku-4-5-20251001",
         max_tokens: 300,
         messages: [{ role: "user", content: prompt }],
       });
       ```
     - Returns the text content from the response.
   - Export `healthCheck()`: return `"ok"` if `ANTHROPIC_API_KEY` is set, `"unconfigured"` if not.

4. **Create the AI router** — `server/integrations/ai/router.js`:
   ```javascript
   router.post('/workout-suggestion', asyncHandler(async (req, res) => {
     const stravaService = require('../strava/service');
     const weatherService = require('../weather/service');
     
     let runs, weather;
     try {
       [runs, weather] = await Promise.all([
         stravaService.getRecentRuns(10),
         weatherService.getCurrentWeather(),
       ]);
     } catch (e) {
       return err(res, 502, 'DATA_ERROR', 'Could not fetch training/weather data: ' + e.message);
     }
     
     let suggestion;
     try {
       suggestion = await aiService.generateWorkoutSuggestion(runs, weather);
     } catch (e) {
       return err(res, 502, 'AI_ERROR', e.message);
     }
     
     ok(res, { suggestion, generatedAt: new Date().toISOString() });
   }));
   ```

5. **Mount the router** — In `server/index.js`: `app.use('/api/ai', require('./integrations/ai/router'));`.

6. **Create the widget component** — `src/widgets/workout-suggestion/WorkoutSuggestionWidget.tsx`:
   - Local state (not Zustand — suggestions are ephemeral, no persistence needed):
     ```typescript
     const [suggestion, setSuggestion] = useState<string | null>(null);
     const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
     const [generatedAt, setGeneratedAt] = useState<string | null>(null);
     ```
   - On tap/click of the generate button: `POST /api/ai/workout-suggestion`, set the response.
   - Three visual states:
     - **Idle** (no suggestion yet): Show a large tap target button with "Generate Workout" text and a sparkle/AI icon. This is the primary CTA.
     - **Loading**: Show a pulsing animation or "Thinking..." text. Disable the button.
     - **Result**: Show the suggestion text, the generated timestamp, and a smaller "Regenerate" button at the bottom.
   - Error state: show error message with a retry button.

7. **Style the widget** — `src/widgets/workout-suggestion/WorkoutSuggestionWidget.module.css`:
   - Idle state: center the generate button both vertically and horizontally. Button should be prominent: `background: var(--color-accent-dim); border: 1px solid var(--color-accent); border-radius: 8px; padding: 16px 24px; color: var(--color-accent); font-weight: 700; cursor: pointer; min-height: 44px;`
   - Result state: suggestion text in `font-family: var(--font-ui); font-size: 13px; line-height: 1.5; color: var(--color-text);`. Padding 16px. The regenerate button at the bottom, smaller and less prominent.
   - Loading: the button text changes, add a subtle pulse animation.
   - Timestamp: `font-size: 10px; color: var(--color-text-secondary);` showing "Generated at HH:MM"

8. **Register the widget** — `src/widgets/workout-suggestion/index.ts`:
   ```typescript
   registerWidget({
     id: "workout-suggestion",
     name: "AI Workout",
     description: "AI-generated workout suggestion based on your training and weather",
     defaultSize: "small",
     component: WorkoutSuggestionWidget,
   });
   ```

9. **Add barrel import** — `src/widgets/index.ts`: add `import "./workout-suggestion";`.

## Testing

- **E2E / visual** —
  1. Add the widget. Verify it shows the "Generate Workout" button in idle state.
  2. If API keys are configured: click generate, verify loading state appears, then suggestion text renders.
  3. Screenshot the widget in idle state and in result state.
  4. Click "Regenerate" — verify a new suggestion replaces the old one.
  5. Verify the generate button meets 44px minimum touch target.

- **Edge cases** —
  - `ANTHROPIC_API_KEY` not set: server returns a clear error, widget shows "AI not configured"
  - Strava or weather unavailable: server handles partial data gracefully, maybe generates suggestion with whatever data is available
  - Very long suggestion text: should wrap within the widget, not overflow

## Acceptance criteria

- [ ] `POST /api/ai/workout-suggestion` fetches recent runs + weather, sends to Claude, returns suggestion text
- [ ] Claude API key stays server-side only — never sent to the frontend
- [ ] Widget shows a clear "Generate" button in idle state (no auto-generation)
- [ ] Loading state is visible while waiting for the API response
- [ ] Suggestion text renders cleanly with timestamp
- [ ] "Regenerate" button allows getting a new suggestion
- [ ] Widget handles missing API keys, missing Strava data, and missing weather data gracefully
- [ ] Uses `claude-haiku-4-5-20251001` model for cost efficiency
- [ ] Widget registered and available in add-widget modal
