diagram component Shop

component Payments {
  provides Billing
  requires Ledger
}

component Accounting {
  provides Ledger
}

Payments required Ledger -- provided Ledger Accounting
