# Phase 7: UI Components - Context

**Gathered:** 2026-01-17
**Status:** Ready for planning

<vision>
## How This Should Work

Desktop-focused single page app. Sidebar holds all the parameter inputs — portfolio settings, SBLOC terms, simulation configuration. Main area displays the charts and results.

The sidebar can be minimized to maximize chart space when the user isn't actively tweaking parameters. When they want to adjust something, they expand it, make changes, re-run the simulation.

The feel should be friendly and approachable — think Robinhood or Betterment, not Bloomberg Terminal. This is for people exploring the BBD strategy, not professional traders. It shouldn't feel intimidating or overwhelming.

</vision>

<essential>
## What Must Be Nailed

- **Clear parameter input** - Users can easily configure portfolio, SBLOC terms, and simulation settings without confusion
- **Results dashboard** - Charts and metrics displayed beautifully, easy to understand at a glance
- **Feedback during simulation** - Progress indicator and status updates while running Monte Carlo iterations

All three need to work well together. The flow is: configure params → run simulation → see results → tweak params → repeat.

</essential>

<specifics>
## Specific Ideas

- Minimizable sidebar (not just collapsible sections) — full collapse to maximize chart viewing
- Friendly, approachable aesthetic like Robinhood/Betterment
- Not intimidating or overly information-dense
- Power-user capability without power-user complexity

</specifics>

<notes>
## Additional Context

This phase builds on Phase 6's chart components. The charts already exist — this phase wires them into an interactive UI.

Desktop-first but should still be usable on mobile (responsive layout in requirements).

</notes>

---

*Phase: 07-ui-components*
*Context gathered: 2026-01-17*
