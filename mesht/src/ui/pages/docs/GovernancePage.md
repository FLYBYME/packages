# `GovernancePage`

This page provides a UI for viewing and managing the rules in the `sys.governance` Constitutional Ledger.

## Core Features

1.  **List Rules**: Displays a `DataTable` of all constitutional rules.
2.  **Rule Details**: Shows the rule ID, its severity (`HARD` or `SOFT`), a description of the rule, and who proposed it.
3.  **Propose New Rule**: A modal form for operators to propose new rules to be added to the constitution.

## How It Works

*   The page calls `sys.governance.list_rules` to populate the table.
*   The "Propose Rule" modal calls `sys.governance.propose_rule` to submit a new rule for ratification (the ratification process itself is not yet implemented in the UI).
*   The page is currently read-only in terms of editing existing rules.

_This page is a foundational component for ensuring agent alignment and safety._
