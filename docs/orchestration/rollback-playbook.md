# Rollback Playbook

<!-- TODO: Document step-by-step rollback procedures for failed SHA combinations. -->

## Overview

Rollback is performed by returning submodule SHAs to the previous verified bundle, not by rewriting formal repository history.

## Prerequisites

- Access to the `changes/` directory for verified bundle history
- Ability to run fourth-repo validation checks

## Steps

<!-- TODO: Add detailed rollback procedure with example commands. -->

1. Identify the last verified bundle in `changes/`.
2. Revert submodule references to that bundle's SHAs.
3. Re-run fourth-repo checks.
4. Confirm the combination passes all validation.
