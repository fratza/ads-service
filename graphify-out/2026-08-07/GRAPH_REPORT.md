# Graph Report - .  (2026-07-29)

## Corpus Check
- Corpus is ~37,194 words - fits in a single context window. You may not need a graph.

## Summary
- 541 nodes · 800 edges · 32 communities (25 shown, 7 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `AdvertisementFormComponent` - 43 edges
2. `Advertisement Form Template` - 22 edges
3. `AdvertisementRequest` - 18 edges
4. `AdvertisementRequestService` - 15 edges
5. `options` - 12 edges
6. `scripts` - 11 edges
7. `RealCreatomateService` - 11 edges
8. `CreatomateTemplatePreviewComponent` - 11 edges
9. `Advertisement Detail Template` - 11 edges
10. `Advertisement List Template` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Ponytail Lazy Senior Dev Mode` --semantically_similar_to--> `Angular Development Rules`  [INFERRED] [semantically similar]
  .pi/skills/ponytail/SKILL.md → docs/DEV-RULE.md
- `Application Host Document` --references--> `AppComponent`  [INFERRED]
  src/index.html → src/app/app.component.ts
- `Advertisement Detail Template` --references--> `StatusBadgeComponent`  [INFERRED]
  src/app/features/advertisements/advertisement-detail.component.html → src/app/shared/components/status-badge/status-badge.component.ts
- `Advertisement List Template` --references--> `StatusBadgeComponent`  [INFERRED]
  src/app/features/advertisements/advertisement-list.component.html → src/app/shared/components/status-badge/status-badge.component.ts
- `Dashboard Template` --references--> `StatusBadgeComponent`  [INFERRED]
  src/app/features/dashboard/dashboard.component.html → src/app/shared/components/status-badge/status-badge.component.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Angular Repository Guidance** — _pi_skills_angular_app_harness_skill_angular_app_harness, docs_dev_rule_angular_development_rules, docs_design_component_pantry_first, docs_standards_coding_standards, docs_warp_warp_architecture [EXTRACTED 1.00]
- **BFF Architecture Documentation** — readme_ng_scaffolding, changelog_bff_mvc_release, docs_bff_architecture_bff_mvc_architecture, docs_bff_implementation_example_complete_bff_flow, docs_warp_warp_architecture [INFERRED 0.95]
- **MCP Server Guidance Set** — mcp_builder_skill_mcp_server_development, mcp_best_practices_mcp_server_best_practices, mcp_typescript_sdk_mcp_typescript_sdk, node_mcp_server_node_typescript_mcp_guide [EXTRACTED 1.00]
- **Advertisement Request Lifecycle Views** — src_app_features_dashboard_dashboard_component_operational_dashboard, src_app_features_advertisements_advertisement_list_component_request_management_actions, src_app_features_advertisements_advertisement_form_component_creative_brief_wizard, src_app_features_advertisements_advertisement_detail_component_advertisement_detail_template [INFERRED 0.85]
- **Creatomate Production Pipeline** — src_app_features_advertisements_advertisement_form_component_advertisement_output_configuration, src_app_features_advertisements_advertisement_detail_component_template_value_mapping, src_app_features_advertisements_advertisement_detail_component_creatomate_rendering_workflow, src_app_features_advertisements_advertisement_detail_component_request_payload_handoff, src_app_features_dashboard_dashboard_component_rendering_activity_monitoring [INFERRED 0.85]

## Communities (32 total, 7 thin omitted)

### Community 0 - "Advertisement Data Services"
Cohesion: 0.06
Nodes (34): @creatomate/preview, AdvertisementMessage, AdvertisementRequest, AdvertisementRequestInput, AdvertisementStatus, ContactInformation, DealerInformation, InsideAdConfiguration (+26 more)

### Community 1 - "Advertisement Form Workflow"
Cohesion: 0.08
Nodes (12): AdvertisementAsset, AssetCategory, ContactOption, Advertisement Form Template, Advertisement Output Configuration, AdvertisementFormComponent, Contact Information Selection, Creative Asset Management (+4 more)

### Community 2 - "Runtime Dependencies"
Cohesion: 0.04
Nodes (45): @angular/animations, @angular/cdk, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/platform-browser-dynamic (+37 more)

### Community 3 - "Development Tooling"
Cohesion: 0.04
Nodes (45): @angular/build, @angular/compiler-cli, autoprefixer, @commitlint/cli, @commitlint/config-conventional, husky, jasmine-core, karma (+37 more)

### Community 4 - "Server Security Resources"
Cohesion: 0.08
Nodes (21): angularApp, app, browserDistFolder, API_CONFIG, SERVER_CONFIG, CONNECT_SOURCES, FONT_SOURCES, IMAGE_SOURCES (+13 more)

### Community 5 - "Angular Workspace Configuration"
Cohesion: 0.07
Nodes (30): analytics, cli, newProjectRoot, prefix, projectType, root, schematics, sourceRoot (+22 more)

### Community 6 - "Advertisement Detail Rendering"
Cohesion: 0.09
Nodes (13): Advertisement Detail Template, AdvertisementDetailComponent, Local Demo Rendering, Request Payload Handoff, Creatomate Template Value Mapping, Component, Secure Client Intake Mode, CreatomateTemplatePreviewComponent (+5 more)

### Community 7 - "Application Bootstrap Shell"
Cohesion: 0.09
Nodes (18): App Template, AppComponent, Application Route Outlet, Component, appConfig, config, serverConfig, routes (+10 more)

### Community 8 - "Build Target Options"
Cohesion: 0.09
Nodes (27): options, fonts, allowedCommonJsDependencies, assets, browser, inlineStyleLanguage, optimization, outputMode (+19 more)

### Community 9 - "Build Environments"
Cohesion: 0.09
Nodes (24): build, extract-i18n, serve, test, builder, configurations, defaultConfiguration, development (+16 more)

### Community 10 - "Package Scripts Metadata"
Cohesion: 0.11
Nodes (17): engines, node, npm, name, private, scripts, build, ng (+9 more)

### Community 12 - "Advertisement List Management"
Cohesion: 0.17
Nodes (8): Advertisement List Template, AdvertisementListComponent, Advertisement Request Filtering, Advertisement Request Management Actions, Advertisement Request Pagination, Component, EmptyStateComponent, Component

### Community 13 - "Project Architecture Standards"
Cohesion: 0.19
Nodes (14): Harness, Angular App Harness, Commitizen, Ponytail Lazy Senior Dev Mode, Mandatory Skill Invocation, BFF MVC Release 1.2.0, BFF MVC Architecture, Complete BFF Implementation Flow (+6 more)

### Community 14 - "Authentication Guards Services"
Cohesion: 0.20
Nodes (4): authGuard(), guestGuard(), AuthService, Injectable

### Community 15 - "Dashboard Feature Routing"
Cohesion: 0.18
Nodes (5): DashboardComponent, Component, SettingsComponent, Component, AUTHENTICATED_ROUTES

### Community 16 - "Operations Dashboard Integrations"
Cohesion: 0.20
Nodes (10): Creatomate Rendering Workflow, Spreadsheet Import, Dashboard Template, Advertisement Operations Dashboard, Rendering Activity Monitoring, Request Status Distribution, Future Workspace Configuration, Planned Creatomate Integration (+2 more)

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
Cohesion: 0.83
Nodes (4): MCP Server Best Practices, MCP Server Development, MCP TypeScript SDK, Node and TypeScript MCP Server Guide

## Knowledge Gaps
- **155 isolated node(s):** `$schema`, `version`, `newProjectRoot`, `projectType`, `style` (+150 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `allowedCommonJsDependencies` connect `Build Target Options` to `Advertisement Data Services`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **Why does `options` connect `Build Target Options` to `Build Environments`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Why does `@creatomate/preview` connect `Advertisement Data Services` to `Build Target Options`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `newProjectRoot` to the rest of the system?**
  _155 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Advertisement Data Services` be split into smaller, more focused modules?**
  _Cohesion score 0.05738615327656423 - nodes in this community are weakly interconnected._
- **Should `Advertisement Form Workflow` be split into smaller, more focused modules?**
  _Cohesion score 0.08489795918367347 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._