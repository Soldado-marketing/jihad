# MAOS RTL/LTR Baseline

## Purpose

Define Arabic RTL and English/German LTR layout expectations before frontend implementation.

## Arabic RTL Layout Rules

| Area | Requirement |
|---|---|
| Page direction | Arabic views must support RTL direction |
| Layout mirroring | Navigation, sidebars, tables, forms, and directional icons must mirror where appropriate |
| Alignment | Arabic text, labels, inputs, and table columns should align for RTL reading |
| Mixed content | Numbers, emails, URLs, and codes remain readable in mixed-direction content |

## English/German LTR Rules

English and German views use LTR direction. German text expansion must be considered in buttons, navigation, tables, and form labels.

## Form Alignment

Forms must place labels, validation messages, required indicators, and help text consistently for both RTL and LTR modes.

## Table Alignment

Tables must support readable column order, text alignment, horizontal scrolling if needed, and no overlap for German long labels.

## Navigation Alignment

Navigation order, icons, chevrons, and breadcrumbs must match active direction and remain permission-aware.

## Acceptance Criteria

| Criterion | Status |
|---|---|
| Arabic RTL rules are documented | Met |
| English/German LTR rules are documented | Met |
| Layout mirroring is documented | Met |
| Form alignment is documented | Met |
| Table alignment is documented | Met |
| Navigation alignment is documented | Met |
| German text expansion is documented | Met |
