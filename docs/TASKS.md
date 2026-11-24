# Project change backlog

Status: tasks 1–5 are implemented. Task 4 was completed on `codex/workspace-design-system`, branched from `development` at `ca4a099`.

## 1. Remove Asisten Konten

- [x] Remove the **Asisten Konten** navigation entry.
- [x] Delete its page/routes and components used exclusively by this feature.
- [x] Remove related imports, links, and feature-specific code; preserve shared components needed elsewhere.
- [x] Verify the menu is gone and remaining navigation is wired correctly (source review, TypeScript check, and production build passed; browser verification pending).

## 2. Remove mode rekam

Completed: real brand and prospect names, contact details, and normal actions are always available.

- [x] Remove the recording-mode control and its brand-censoring behavior.
- [x] Remove its dedicated components, state, settings, and references.
- [x] Verify normal brand names display consistently after removal.

Validation: TypeScript and production build passed. Source review confirmed direct names and removal of recording restrictions across brands, notes, calendar, prospects, and finance. Browser interaction was not tested.

## 3. Move profile and logout into a profile dropdown

- [x] Replace the standalone top-right **Keluar** button with a profile button.
- [x] Show the current profile information in the profile dropdown, moving it from the left sidebar.
- [x] Place **Keluar** inside the dropdown and retain access to existing profile actions.
- [x] Keep only **Edit profil** and **Keluar** as dropdown actions; move profile editing to a full workspace page, with branding and password settings on that page.
- [x] Standardize profile-page labels, compact field spacing, matching rounded image previews, small image-action buttons with prefix icons, and a danger-style photo removal action.
- [x] Verify the dropdown, profile information, and logout callbacks on desktop and mobile, including keyboard interaction.

Validation: TypeScript and production build passed. Temporary browser previews checked the two dropdown actions, full-page form, successful and failed saves with mock requests, updated profile details, password access from the page, return navigation, desktop/mobile layout, and the existing keyboard and dismissal behavior. The profile page uses `/?page=profile` so it can be refreshed and revisited. The application requires login; authenticated profile saving and session logout were not tested end to end.

## 4. Adjust colors, typography, and theme

Direction: cool neutral surfaces, restrained blue accents, clear contrast, and consistent typography/spacing, guided by the user's dashboard reference.

- [x] Apply the reference's color direction and a shared type scale for page headings, section headings, labels, body copy, and helper text.
- [x] Keep the existing workflows and main layout while fixing responsive spacing and overflow.
- [x] Make the theme color switchable/changeable.
- [x] Add blue, teal, violet, and graphite accents with light/dark/system modes in **Edit profil → Tampilan workspace**. Preview immediately, save to D1, and revert unsaved previews when leaving the page.
- [x] Verify readability and consistency across dashboard, calendar, brands and brand tabs, planner, pipeline, finance, inventory, profile, dialogs, shared reviews, and report printing.

Validation: real signed-in browser checks used an isolated local app and fixture database. Checks covered theme save/reload/cancel, system preference changes, invalid API values, desktop and 390px/320px layouts, accessible labels/contrast, and light report PDFs generated from dark mode. Automated tests cover all palette/mode contrast pairs, safe theme normalization, referenced tokens, client-color contrast, branding behavior, and migration preservation. All 10 Node tests, the SQLite migration test, TypeScript, and the production build passed. The build still reports a large-chunk advisory.

Migration `0032_workspace_appearance.sql` is applied to the local database after a backup under ignored `tmp/theme-backups/`, and to the isolated preview database. No remote migration or deployment has been performed.

## 5. Use the configured brand name everywhere

The brand name set through profile editing should be the source of truth for brand names displayed by the system. This is a broader audit and refactor.

- [x] Audit hard-coded references to **Idaman Creative**, including spelling/case variations.
- [x] Trace how the profile brand name is stored, updated, and accessed.
- [x] Use the configured name consistently wherever the system displays the brand, including applicable page titles, messages, templates, and generated outputs.
- [x] Remove hard-coded original-brand references from application code and identify any remaining references that need separate handling.
- [x] Decide how screens without an available profile or configured name should behave.
- [x] Verify updated branding through regression tests, PDF exports, browser previews, and the saved identity on login/reload. Authenticated profile saving still needs an end-to-end smoke test.
- [x] Check workspace identity scope: one admin/workspace per D1 database, no shared profile cache, public name/tagline only before login, and client names kept separate. Multi-tenant user branding is outside this existing architecture.

Implementation: shared profile normalization and React context; server-loaded login identity and page titles; current names in reports, review links, templates, and PDFs; neutral default name/logo; configurable document signer; explicit payment destinations instead of the original owner's defaults. Templates store `{{workspaceName}}`. Per the user's decision, exact legacy generated introductions are upgraded while custom text is preserved. Existing document numbers and saved financial records are unchanged. Previously stored share links are carried over to a neutral session-storage key.

Validation: Node branding/PDF regression tests, SQLite migration tests, TypeScript, production build, PDF text extraction and visual rendering, desktop/mobile context updates, special characters, long names, and live login/reload checks. Migrations 0030 and 0031 are applied locally after a backup under ignored `tmp/branding-backups/`; all existing non-document data was compared and preserved. Remote migrations have not been applied.

Remaining original-name references are infrastructure identifiers, immutable historical migrations, the exact-match legacy data migration, and test fixtures. Saved user-uploaded logos, custom prose, and existing payment details remain user data.

## Future additions

Add new requests here as they are discovered. Task numbers are identifiers, not a fixed execution order.
