# Changelog

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
