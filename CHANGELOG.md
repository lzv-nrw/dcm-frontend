# Changelog

## [0.20.0] - 2025-09-09

### Changed

- migrated to dcm-common v4
- migrated to backend API v3
- pinned versions of `flowbite-react` and `tailwindcss` to prevent unwanted updates and ensure consistency
- documented version pinning of `flowbite-react` and `tailwindcss` in README for consistent dependency management
- moved message-box from modal wizards to SectionedForm

### Added

- added generic comparator function for consistent sorting

### Removed

- removed unused `web-vitals` dependency

### Fixed

- fixed cleared interval timer when closing `DebugJobModal`
- fixed overly restrictive password input length
- fixed workspace context menu not closing on item select
- fixed layout of message-box component

## [0.15.0] - 2025-08-26

### Changed

- improved SectionedForm-sidebar ux
- changed header to sticky position
- improved logging in auth-related endpoints
- improved session-management
- enabled deleting templates with linked jobs
- locked target-system input when updating a template with linked jobs
- unlocked workspace-input when updating a template with linked jobs
- updated error-message handling in screens and modals
- refactored client-store actions to use common fetch-logic
- locked username-input when updating an existing user-configuration

### Added

- added context menu for workspace-display
- added initial `ContextMenu`-component to client
- added generic message-box component and utilities for message handling
- added abort-job button while viewing job-report
- added mechanism to mostly prevent multiple simultaneous jobs for a single job configuration

### Fixed

- fixed component name for user-create-/update-modal
- fixed base-layout of client
- fixed positioning for "Job testen"-button
- fixed modal titles
- fixed spacing for body of debug-job-modal
- fixed space and text-elements in job config modal header
- fixed latestExec-info missing in table after updating a job configuration

## [0.8.0] - 2025-08-20

### Added

- added session management

### Fixed

- fixed spaces in modals
- fixed losing oai-data-selection when editing a job configuration
- fixed submission button behavior for create-/update-modals
- fixed issues with incremental updates originating from create-/update-modals

## [0.7.0] - 2025-08-14

### Changed

- refactored and updated create-/update-modals for job-configurations, templates, and user-configurations
- refactored and extended form validation in wizard-modals
- updated display-components for workspaces and templates

### Added

- added option to edit existing templates and user-configurations
- added option to delete job-configurations, templates, and user-configurations
- added generic confirmation-modal component
- extended modal interface with new options: `hideCloseButton`, `height`, `title`

### Fixed

- fixed overflow behavior in wizard-type modals (section-sidebar does not scroll with form contents)
- fixed group-select input component for creating/modifying users to support current user-group-concept (one workspace-group per user and workspace)
- fixed error-type and message for exceeding max. number of resumption-tokens in oai-requests performed by misc-view
- fixed output of undefined subfolder in the summary-section of the create-/update-modal for job configurations

## [0.1.2] - 2025-07-25

### Fixed

- fixed linting-issues in client `dateTime.ts`
- fixed errors in README (build and development setup)

## [0.1.0] - 2025-07-25

### Changed

- initial release
