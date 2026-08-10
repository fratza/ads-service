# Graph Report - ads-service  (2026-08-07)

## Corpus Check
- 117 files · ~54,109 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1072 nodes · 1543 edges · 68 communities (56 shown, 12 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a73d218a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Advertisement Data Services
- Advertisement Form Workflow
- Runtime Dependencies
- Development Tooling
- Server Security Resources
- Angular Workspace Configuration
- Advertisement Detail Rendering
- Application Bootstrap Shell
- Build Target Options
- Build Environments
- Package Scripts Metadata
- Resource HTTP Operations
- Advertisement List Management
- Project Architecture Standards
- Authentication Guards Services
- Dashboard Feature Routing
- Operations Dashboard Integrations
- API Database Types
- Mock Creatomate Rendering
- Spreadsheet Integration
- MCP Development Guidance
- Research Planning Workflow
- Commit Message Hook
- Pre-Commit Hook
- Public Routes
- Browser Automation
- Graphify Workflow
- Node/TypeScript MCP Server Implementation Guide
- Design Guidelines for This Repo
- AdvertisementInputService
- 📚 Documentation Library
- Security Headers
- What You Must Do When Invoked
- Angular Development Rules for This Repo
- Browser Automation with browser-use
- template-mapping.service.ts
- advertisement-detail.component.ts
- BFF Layer - MVC Architecture Guide
- server.ts
- AdvertisementRequest
- StatusBadgeComponent
- advertisement.models.ts
- BFF Architecture Implementation Example
- Coding Standards & Best Practices
- RealCreatomateService
- ResourceService
- Ponytail — Lazy Senior Dev Mode
- security.middleware.ts
- WARP - Architecture Documentation
- The workflow
- build
- architect
- allowedCommonJsDependencies
- [1.2.0] - 2026-05-14
- Creatomate Template Mapping
- superpowers/SKILL.md
- Advertisement input ingestion
- assets
- client-request-complete.component.ts
- optimization
- ssr
- commit-msg
- pre-commit

## God Nodes (most connected - your core abstractions)
1. `AdvertisementFormComponent` - 45 edges
2. `AdvertisementRequest` - 41 edges
3. `AdvertisementDetailComponent` - 24 edges
4. `Advertisement Form Template` - 22 edges
5. `AdvertisementRequestService` - 21 edges
6. `Node/TypeScript MCP Server Implementation Guide` - 21 edges
7. `AdvertisementInputService` - 18 edges
8. `AdvertisementRequestInput` - 15 edges
9. `RealCreatomateService` - 15 edges
10. `CreatomateTemplatePreviewComponent` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Ponytail Lazy Senior Dev Mode` --semantically_similar_to--> `Angular Development Rules`  [INFERRED] [semantically similar]
  .pi/skills/ponytail/SKILL.md → docs/DEV-RULE.md
- `Application Host Document` --references--> `AppComponent`  [INFERRED]
  src/index.html → src/app/app.component.ts
- `Advertisement Detail Template` --references--> `CreatomateTemplatePreviewComponent`  [INFERRED]
  src/app/features/advertisements/advertisement-detail.component.html → src/app/features/advertisements/creatomate-template-preview.component.ts
- `Advertisement Detail Template` --references--> `CreatomateTemplateThumbnailComponent`  [INFERRED]
  src/app/features/advertisements/advertisement-detail.component.html → src/app/features/advertisements/creatomate-template-thumbnail.component.ts
- `Advertisement List Template` --references--> `EmptyStateComponent`  [INFERRED]
  src/app/features/advertisements/advertisement-list.component.html → src/app/shared/components/empty-state/empty-state.component.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Angular Repository Guidance** — pi_skills_angular_app_harness_skill_angular_app_harness, docs_dev_rule_angular_development_rules, docs_design_component_pantry_first, docs_standards_coding_standards, docs_warp_warp_architecture [EXTRACTED 1.00]
- **BFF Architecture Documentation** — readme_ng_scaffolding, changelog_bff_mvc_release, docs_bff_architecture_bff_mvc_architecture, docs_bff_implementation_example_complete_bff_flow, docs_warp_warp_architecture [INFERRED 0.95]
- **MCP Server Guidance Set** — mcp_builder_skill_mcp_server_development, mcp_best_practices_mcp_server_best_practices, mcp_typescript_sdk_mcp_typescript_sdk, node_mcp_server_node_typescript_mcp_guide [EXTRACTED 1.00]
- **Advertisement Request Lifecycle Views** — src_app_features_dashboard_dashboard_component_operational_dashboard, src_app_features_advertisements_advertisement_list_component_request_management_actions, src_app_features_advertisements_advertisement_form_component_creative_brief_wizard, src_app_features_advertisements_advertisement_detail_component_advertisement_detail_template [INFERRED 0.85]
- **Creatomate Production Pipeline** — src_app_features_advertisements_advertisement_form_component_advertisement_output_configuration, src_app_features_advertisements_advertisement_detail_component_template_value_mapping, src_app_features_advertisements_advertisement_detail_component_creatomate_rendering_workflow, src_app_features_advertisements_advertisement_detail_component_request_payload_handoff, src_app_features_dashboard_dashboard_component_rendering_activity_monitoring [INFERRED 0.85]

## Communities (68 total, 12 thin omitted)

### Community 0 - "Advertisement Data Services"
Cohesion: 0.21
Nodes (5): makeRequest(), message(), MOCK_REQUESTS, StorageService, Injectable

### Community 1 - "Advertisement Form Workflow"
Cohesion: 0.09
Nodes (11): AssetCategory, ContactOption, Advertisement Form Template, Advertisement Output Configuration, AdvertisementFormComponent, Contact Information Selection, Creative Asset Management, Creative Brief Wizard (+3 more)

### Community 2 - "Runtime Dependencies"
Cohesion: 0.04
Nodes (45): @angular/animations, @angular/cdk, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/platform-browser-dynamic (+37 more)

### Community 3 - "Development Tooling"
Cohesion: 0.04
Nodes (45): @angular/build, @angular/compiler-cli, autoprefixer, @commitlint/cli, @commitlint/config-conventional, husky, jasmine-core, karma (+37 more)

### Community 4 - "Server Security Resources"
Cohesion: 0.20
Nodes (8): API_CONFIG, SERVER_CONFIG, apiKeyMatches(), validateOrigin(), validateOriginOrApiKey(), httpClient, GetAllOptions, Resource

### Community 5 - "Angular Workspace Configuration"
Cohesion: 0.07
Nodes (30): analytics, cli, newProjectRoot, prefix, projectType, root, schematics, sourceRoot (+22 more)

### Community 6 - "Advertisement Detail Rendering"
Cohesion: 0.15
Nodes (6): CreatomateTemplatePreviewComponent, Component, ViewChild, CreatomateTemplateThumbnailComponent, Component, ViewChild

### Community 7 - "Application Bootstrap Shell"
Cohesion: 0.09
Nodes (18): App Template, AppComponent, Application Route Outlet, Component, appConfig, config, serverConfig, routes (+10 more)

### Community 8 - "Build Target Options"
Cohesion: 0.18
Nodes (14): options, browser, inlineStyleLanguage, outputMode, polyfills, scripts, server, styles (+6 more)

### Community 9 - "Build Environments"
Cohesion: 0.22
Nodes (9): serve, development, buildTarget, extractLicenses, optimization, sourceMap, builder, configurations (+1 more)

### Community 10 - "Package Scripts Metadata"
Cohesion: 0.11
Nodes (17): engines, node, npm, name, private, scripts, build, ng (+9 more)

### Community 11 - "Resource HTTP Operations"
Cohesion: 0.20
Nodes (4): ResourceController, fetchTriviaHistory(), proxyHandler(), HttpClientService

### Community 12 - "Advertisement List Management"
Cohesion: 0.22
Nodes (6): Advertisement List Template, AdvertisementListComponent, Advertisement Request Filtering, Advertisement Request Management Actions, Advertisement Request Pagination, Component

### Community 13 - "Project Architecture Standards"
Cohesion: 0.11
Nodes (18): Ponytail Lazy Senior Dev Mode, Mandatory Skill Invocation, BFF MVC Release 1.2.0, BFF MVC Architecture, Complete BFF Implementation Flow, Component Pantry First, Angular Development Rules, HTTP Security Headers (+10 more)

### Community 14 - "Authentication Guards Services"
Cohesion: 0.20
Nodes (4): authGuard(), guestGuard(), AuthService, Injectable

### Community 15 - "Dashboard Feature Routing"
Cohesion: 0.07
Nodes (13): TRIVIA_CATEGORIES, TRIVIA_SUCCESS_STATUSES, TRIVIA_TERMINAL_STATUSES, TriviaCategory, TriviaJobStatus, TriviaRequestStatus, TriviaService, Injectable (+5 more)

### Community 16 - "Operations Dashboard Integrations"
Cohesion: 0.06
Nodes (21): AdvertisementAsset, Advertisement Detail Template, AdvertisementDetailComponent, Creatomate Rendering Workflow, Local Demo Rendering, Request Payload Handoff, Creatomate Template Value Mapping, Component (+13 more)

### Community 17 - "API Database Types"
Cohesion: 0.22
Nodes (6): ApiErrorResponse, ApiSuccessResponse, DbError, DbResource, DbResponse, DbTimestamps

### Community 18 - "Mock Creatomate Rendering"
Cohesion: 0.57
Nodes (3): MockCreatomateRenderJob, MockCreatomateService, Injectable

### Community 19 - "Spreadsheet Integration"
Cohesion: 0.33
Nodes (4): TODO: Replace this mock with Google Sheets API integration in the backend phase., SpreadsheetIntegrationService, SpreadsheetMockRecord, Injectable

### Community 20 - "MCP Development Guidance"
Cohesion: 0.05
Nodes (44): Authentication and Authorization, DNS Rebinding Protection, Documentation Requirements, Error Handling, Error Handling, Input Validation, JSON Format (`response_format="json"`), Markdown Format (`response_format="markdown"`, typically default) (+36 more)

### Community 25 - "Browser Automation"
Cohesion: 0.09
Nodes (32): AdvertisementIngestionEnvelope, AdvertisementInputContext, AdvertisementInputIssue, ASSET_CATEGORIES, ASSET_TYPES, importRecords(), ingestion, isRecord() (+24 more)

### Community 32 - "Node/TypeScript MCP Server Implementation Guide"
Cohesion: 0.05
Nodes (41): Advanced Features (where applicable), Advanced MCP Features, Async/Await Best Practices, Building and Running, Character Limits and Truncation, Code Best Practices, Code Composability and Reusability, Code Quality (+33 more)

### Community 33 - "Design Guidelines for This Repo"
Cohesion: 0.07
Nodes (29): 10. Content Tone in UI, 11. Do and Don’t, 12. Working Rule for Future Tasks, 1. Design Principles, 2. Primary UI System, 3. Brand Direction, 4. Color Rules, 5. Typography Rules (+21 more)

### Community 34 - "AdvertisementInputService"
Cohesion: 0.13
Nodes (11): AdvertisementImportPreview, AdvertisementRequestInput, AdvertisementInputService, GoogleSheetImportPreview, HEADER_ALIASES, ImportResult, Injectable, VERTICAL_SHEET_ALIASES (+3 more)

### Community 35 - "📚 Documentation Library"
Cohesion: 0.07
Nodes (27): 1.1 Understand Modern MCP Design, 1.2 Study MCP Protocol Documentation, 1.3 Study Framework Documentation, 1.4 Plan Your Implementation, 2.1 Set Up Project Structure, 2.2 Implement Core Infrastructure, 2.3 Implement Tools, 3.1 Code Quality (+19 more)

### Community 36 - "Security Headers"
Cohesion: 0.08
Nodes (25): 1. Disable X-Powered-By, 1. Strict-Transport-Security (HSTS) ✅, 2. Rate Limiting, 2. X-Content-Type-Options ✅, 3. Helmet.js (Optional), 3. X-Frame-Options ✅, 4. Content-Security-Policy (CSP) ⚠️, 5. Permissions-Policy ✅ (+17 more)

### Community 37 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 38 - "Angular Development Rules for This Repo"
Cohesion: 0.09
Nodes (22): 10. Testing and Validation, 11. Commits and Formatting, 12. What to Avoid, 13. Working Rule for Future Tasks, 1. Core Principles, 2. Current Stack and Runtime Expectations, 3. Source of Truth Files, 4. App Architecture (+14 more)

### Community 39 - "Browser Automation with browser-use"
Cohesion: 0.09
Nodes (22): Authenticated Browsing (Chrome profile), Authenticated Browsing (existing Chrome session), Browser Automation with browser-use, Browser Modes, Cleanup, Cloud API, Command Chaining, Commands (+14 more)

### Community 40 - "template-mapping.service.ts"
Cohesion: 0.17
Nodes (20): clamp(), createCandidates(), DynamicTemplateElement, enrichElementRoles(), explicitSourcePath(), extractDynamicElements(), formatWebsiteValue(), isAutoDimension() (+12 more)

### Community 41 - "advertisement-detail.component.ts"
Cohesion: 0.18
Nodes (11): @creatomate/preview, MockRenderOutput, CreatomateRender, CreatomateTemplate, CreatomateTemplateDetail, TemplateMappingResult, TemplateMappingSuggestion, escapeHtml() (+3 more)

### Community 42 - "BFF Layer - MVC Architecture Guide"
Cohesion: 0.11
Nodes (17): 1. Routes (`routes/*.routes.ts`), 2. Controllers (`controllers/*.controller.ts`), 3. Services (`services/*.service.ts`), Barrel Exports (index.ts), BFF Layer - MVC Architecture Guide, Common HTTP Status Codes, Controller Error Response Format, Directory Structure (+9 more)

### Community 43 - "server.ts"
Cohesion: 0.13
Nodes (14): angularApp, app, browserDistFolder, CreatomateRenderRequest, isTriviaRequestTerminal(), refreshTriviaRequests(), reqHandler, saveTriviaOutputUrls() (+6 more)

### Community 44 - "AdvertisementRequest"
Cohesion: 0.29
Nodes (3): AdvertisementRequest, AdvertisementRequestService, Injectable

### Community 45 - "StatusBadgeComponent"
Cohesion: 0.14
Nodes (7): AdvertisementStatus, DashboardComponent, Component, EmptyStateComponent, Component, StatusBadgeComponent, Component

### Community 46 - "advertisement.models.ts"
Cohesion: 0.16
Nodes (12): AdvertisementIngestionMetadata, AdvertisementInputSource, AdvertisementMessage, ContactInformation, DealerInformation, InsideAdConfiguration, MockRenderStatus, OutsideAdConfiguration (+4 more)

### Community 47 - "BFF Architecture Implementation Example"
Cohesion: 0.17
Nodes (11): 1. Routes Layer (`resource.routes.ts`), 2. Controllers Layer (`resource.controller.ts`), 3. Services Layer (`resource.service.ts`), Adding New Resources, API Endpoints, BFF Architecture Implementation Example, Directory Structure, Error Response Format (+3 more)

### Community 48 - "Coding Standards & Best Practices"
Cohesion: 0.17
Nodes (11): 1.1 SASS (SCSS), 1.2 BEM Naming Convention, 1.3 Tailwind CSS Integration, 1. CSS/SASS Architecture, 2.1 Requirements, 2.2 Example, 2. Documentation (JSDocs), 3. TypeScript (+3 more)

### Community 51 - "Ponytail — Lazy Senior Dev Mode"
Cohesion: 0.20
Nodes (9): Boundaries, Hermes-Specific Notes, Intensity Levels, Output, Persistence, Ponytail — Lazy Senior Dev Mode, Rules, The Ladder (+1 more)

### Community 52 - "security.middleware.ts"
Cohesion: 0.47
Nodes (7): CONNECT_SOURCES, FONT_SOURCES, IMAGE_SOURCES, MEDIA_SOURCES, SCRIPT_SOURCES, STYLE_SOURCES, securityHeaders()

### Community 53 - "WARP - Architecture Documentation"
Cohesion: 0.22
Nodes (8): Adding Features, Authentication, BFF Architecture, Import Organization, Overview, Path Aliases, Project Structure, WARP - Architecture Documentation

### Community 54 - "The workflow"
Cohesion: 0.22
Nodes (8): 1. Scope the question into a goal — `/plannotator-setup-goal`, 2. Execute the loop — `/goal`, 3. Read & loop on the hypothesis docs in Plannotator — `/plannotator-annotate`, 4. Cross-model review (optional), How the pieces backlink, The workflow, Tips, Using research_loop with Plannotator

### Community 55 - "build"
Cohesion: 0.25
Nodes (8): build, builder, configurations, defaultConfiguration, production, budgets, buildTarget, outputHashing

### Community 56 - "architect"
Cohesion: 0.29
Nodes (7): extract-i18n, test, builder, options, architect, buildTarget, builder

### Community 57 - "allowedCommonJsDependencies"
Cohesion: 0.33
Nodes (6): allowedCommonJsDependencies, dotenv, follow-redirects, form-data, lottie-web, proxy-from-env

### Community 58 - "[1.2.0] - 2026-05-14"
Cohesion: 0.33
Nodes (5): [1.1.0] - Previous Release, [1.2.0] - 2026-05-14, Added, Changed, Changelog

### Community 59 - "Creatomate Template Mapping"
Cohesion: 0.33
Nodes (5): Creatomate Template Mapping, Input and output, Prompt, Required behavior, Text layout rules

### Community 60 - "superpowers/SKILL.md"
Cohesion: 0.33
Nodes (5): Platform Adaptation, Red Flags, Skill Priority, The Rule, User Instructions

### Community 61 - "Advertisement input ingestion"
Cohesion: 0.40
Nodes (4): Advertisement input ingestion, API submission, Import endpoints, Supported sources

### Community 62 - "assets"
Cohesion: 0.67
Nodes (3): assets, src/assets, src/favicon.ico

## Knowledge Gaps
- **426 isolated node(s):** `$schema`, `version`, `newProjectRoot`, `projectType`, `style` (+421 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AdvertisementRequest` connect `AdvertisementRequest` to `Advertisement Data Services`, `AdvertisementInputService`, `template-mapping.service.ts`, `advertisement-detail.component.ts`, `server.ts`, `Advertisement List Management`, `advertisement.models.ts`, `RealCreatomateService`, `Mock Creatomate Rendering`, `Browser Automation`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `allowedCommonJsDependencies` connect `allowedCommonJsDependencies` to `Build Target Options`, `advertisement-detail.component.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `options` connect `Build Target Options` to `optimization`, `ssr`, `build`, `allowedCommonJsDependencies`, `assets`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `newProjectRoot` to the rest of the system?**
  _426 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Advertisement Form Workflow` be split into smaller, more focused modules?**
  _Cohesion score 0.08549019607843138 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `Development Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._