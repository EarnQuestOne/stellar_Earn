# TODO

## Notifications email/in-app templates (typed + tests)

- [x] Implement `BackEnd/src/modules/notifications/template/notification.interface.ts` with typed data contracts + shared render result types.
- [x] Implement `quest-update.template.ts` using `EmailTemplateEngine` for HTML rendering.
- [x] Implement `submission-status.template.ts` using `EmailTemplateEngine` for HTML rendering.
- [x] Implement `system.template.ts` using `EmailTemplateEngine` for HTML rendering.
- [x] Add unit tests for all templates in `BackEnd/test/notifications/templates/notification.templates.spec.ts`.
- [x] Run backend unit tests for the new suite and fix any TypeScript/Jest issues.
- [x] Create git branch `blackboxai/404-improvements`
- [x] Redesign `FrontEnd/my-app/app/not-found.tsx`:

- [x] Add friendly 404 illustration
- [x] Add at least 2 navigation options (Home, Quest listing)
- [x] Add inline search bar that queries quest search API
- [x] Ensure accessible heading hierarchy (single H1)
- [x] Add analytics tracking for 404 hits (event name + payload)
- [x] Wire search results to quest listing links
- [x] Run frontend lint/tests/build (as available)

