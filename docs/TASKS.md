# Project change backlog

Status: tasks 1–3 are implemented. Tasks 4–5 remain pending; visual/theme work stays deferred.

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

## 4. Adjust colors, typography, and theme — deferred

Wait until the rest of the system has been reviewed before designing or implementing this task.

- [ ] Review and agree on colors and typography.
- [ ] Keep the existing layout and functionality largely intact.
- [ ] Make the theme color switchable/changeable.
- [ ] Decide the available theme choices, where they are changed, and how the preference is saved.
- [ ] Verify readability and consistency across the application.

## 5. Use the configured brand name everywhere

The brand name set through profile editing should be the source of truth for brand names displayed by the system. This is a broader audit and refactor.

- [ ] Audit hard-coded references to **Idaman Creative**, including spelling/case variations.
- [ ] Trace how the profile brand name is stored, updated, and accessed.
- [ ] Use the configured name consistently wherever the system displays the brand, including applicable page titles, messages, templates, and generated outputs.
- [ ] Remove hard-coded original-brand references from application code and identify any remaining references that need separate handling.
- [ ] Decide how screens without an available profile or configured name should behave.
- [ ] Verify changing the brand name updates all relevant surfaces and persists after reload.
- [ ] Check that one user's configured brand does not incorrectly affect another user's experience.

## Future additions

Add new requests here as they are discovered. Task numbers are identifiers, not a fixed execution order; task 4 remains deferred until the review is complete.
